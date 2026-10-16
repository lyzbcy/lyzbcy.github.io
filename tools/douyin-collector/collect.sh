#!/usr/bin/env bash
# lyzbcy-douyin-dashboard / 一键采集 + 更新看板
#
# 用法：bash skills/lyzbcy-douyin-dashboard/scripts/collect.sh
# cron 里只调这一个脚本即可。
#
# 修复（相对原版）：
# - 路径修正：原版 SNAPSHOT_SCRIPT 指向不存在的路径（DOUYIN_TOOLS/tools/），
#   实际脚本在 workspace/douyin-creator-tools/tools/，所以 cron 一触发就失败
# - 错误处理：用 PIPESTATUS 捕获管道里 npm 的真实退出码（原版被 tail 掩盖）
# - set -euo pipefail 全程生效
set -euo pipefail

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
export OPENCLAW_HOME   # 导出给 python 子脚本 (make_daily_snapshot/download_covers 都读这个环境变量)
WORKSPACE="$OPENCLAW_HOME/workspace"

# 强制使用 Node v22（better-sqlite3 按 v22 编译；system node 是 v18 会报 NODE_MODULE_VERSION 不匹配）
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null 2>&1 || { echo "❌ 无法切到 Node v22，请检查 nvm" >&2; exit 1; }

# npm 项目（数据源：scrape:stats 入库到这里的 SQLite）
DOUYIN_NPM="$OPENCLAW_HOME/douyin-creator-tools"
# 快照/聚合脚本所在（在 workspace 下，不在 npm 项目里）
SNAPSHOT_SCRIPT="$WORKSPACE/douyin-creator-tools/tools/make_daily_snapshot.py"
COVER_SCRIPT="$WORKSPACE/douyin-creator-tools/tools/download_covers.py"
PROFILE_DIR="$DOUYIN_NPM/.playwright/douyin-profile"

GENERATE_SCRIPT="$WORKSPACE/lyzbcy.github.io/tools/generate_douyin_data.py"
DASHBOARD_SCRIPT="$WORKSPACE/skills/lyzbcy-douyin-dashboard/scripts/update_douyin_dashboard.sh"

log() { echo "$(date -Is) 📱 [douyin-collect] $*"; }
die() { echo "❌ [douyin-collect] $*" >&2; exit 1; }

# 防止定时任务与手动采集同时占用同一个 Playwright profile。
LOCK_FILE="${DOUYIN_DASHBOARD_LOCK:-/tmp/lyzbcy-douyin-dashboard.lock}"
exec 9>"$LOCK_FILE"
flock -n 9 || die "已有一次抖音看板采集在运行，本次退出"

# 校验关键路径存在
[ -d "$DOUYIN_NPM" ] || die "npm 项目目录不存在: $DOUYIN_NPM"
[ -f "$SNAPSHOT_SCRIPT" ] || die "快照脚本不存在: $SNAPSHOT_SCRIPT"
[ -f "$GENERATE_SCRIPT" ] || die "聚合脚本不存在: $GENERATE_SCRIPT"

# ── 1. 刷新作品列表 ──
log "刷新作品列表..."
cd "$DOUYIN_NPM"
retry_step() {
  local label="$1" output="$2"
  shift 2
  for attempt in 1 2 3; do
    if timeout 180 "$@" >"$output" 2>&1; then
      tail -5 "$output"
      return 0
    fi
    tail -15 "$output" >&2
    log "⚠️ $label 第 $attempt 次失败"
    if [ "$attempt" -lt 3 ]; then sleep "$((attempt * 20))"; fi
  done
  die "$label 连续 3 次失败，未生成新快照"
}
retry_step "刷新作品列表" /tmp/dy-works.log xvfb-run -a npm run works
log "等待并抓取有效统计数据（headless）..."
retry_step "统计采集" /tmp/dy-scrape.log npm run scrape:stats -- --headless


# ── 3. 下载封面（失败不阻断，看板会显示无封面的作品） ──
log "下载作品封面..."
if [ -f "$COVER_SCRIPT" ]; then
  python3 "$COVER_SCRIPT" || log "⚠️ 封面下载失败（不影响主流程）"
else
  log "⚠️ 封面下载脚本不存在，跳过"
fi

# ── 4. 生成每日快照 ──
log "生成每日快照..."
if ! python3 "$SNAPSHOT_SCRIPT"; then
  die "快照生成失败"
fi

# ── 5. 聚合 + push ──
log "聚合数据..."
if ! python3 "$GENERATE_SCRIPT"; then
  die "数据聚合失败"
fi

log "push 看板..."
bash "$DASHBOARD_SCRIPT" || die "推送失败（本地数据已保留），请检查构建与发布"
log "✅ 全部完成"
