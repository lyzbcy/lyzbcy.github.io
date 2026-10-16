#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(cd "$SCRIPT_DIR/../../.." && pwd)"
REPO_DIR="$WORKSPACE/lyzbcy.github.io"
DATA_FILE="$REPO_DIR/_data/douyin.json"
VALIDATE_SCRIPT="$SCRIPT_DIR/validate_dashboard.py"
PUSH_URL="git@github.com:lyzbcy/lyzbcy.github.io.git"
BUILD_DIR=""
ONLINE_HTML=""

log() { echo "📡 [douyin-push] $*"; }
die() { echo "❌ [douyin-push] $*" >&2; exit 1; }

cleanup() {
    if [ -n "$BUILD_DIR" ] && [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
    fi
    if [ -n "$ONLINE_HTML" ] && [ -f "$ONLINE_HTML" ]; then
        rm -f "$ONLINE_HTML"
    fi
}
trap cleanup EXIT INT TERM

[ -d "$REPO_DIR/.git" ] || die "不是 git 仓库: $REPO_DIR"
[ -f "$DATA_FILE" ] || die "缺少看板数据: $DATA_FILE"
[ -f "$VALIDATE_SCRIPT" ] || die "缺少校验脚本: $VALIDATE_SCRIPT"

cd "$REPO_DIR"
TODAY="$(date +%Y-%m-%d)"
BLOG_PATH="$(find "$REPO_DIR/_posts" -maxdepth 1 -type f -name '*-抖音数据看板.md' -print -quit)"
[ -n "$BLOG_PATH" ] || die "未找到抖音看板文章"

log "校验生成数据..."
python3 "$VALIDATE_SCRIPT" --data "$DATA_FILE"
python3 -m unittest tests/test_douyin_dashboard.py

if command -v bundle >/dev/null 2>&1 && bundle check >/dev/null 2>&1; then
    log "在临时目录构建 Jekyll..."
    BUILD_DIR="$(mktemp -d /tmp/douyin-jekyll-build.XXXXXX)"
    bundle exec jekyll build --quiet --destination "$BUILD_DIR"
    BUILT_HTML="$(find "$BUILD_DIR/posts" -type f -path '*抖音数据看板*/index.html' -print -quit)"
    [ -n "$BUILT_HTML" ] || die "Jekyll 构建结果中缺少抖音看板"
    python3 "$VALIDATE_SCRIPT" --data "$DATA_FILE" --html "$BUILT_HTML"
else
    log "本机 Jekyll 依赖不完整，将以 GitHub Pages 线上结果作为最终构建门禁"
fi

SUMMARY="$(python3 -c '
import json
with open("_data/douyin.json", encoding="utf-8") as f:
    ov = json.load(f).get("overview", {})
play = ov.get("total_play", 0)
delta = ov.get("play_delta", 0)
works = ov.get("total_works", 0)
sign = "+" if delta >= 0 else ""
print(f"{works}作品/{play}播/{sign}{delta}")
')"

# ⚠️ 先同步远端再 add，避免 index 脏了导致 rebase 失败
log "同步远端 main（rebase）..."
for sync_attempt in 1 2 3; do
    if GIT_CONFIG_GLOBAL=/dev/null GIT_SSH_COMMAND="ssh -o BatchMode=yes" \
        timeout 90 git fetch origin main 2>&1 | tail -2; then
        LOCAL=$(git rev-parse HEAD)
        REMOTE=$(git rev-parse origin/main)
        if ! git merge-base --is-ancestor "$REMOTE" "$LOCAL"; then
            log "远端有新提交，rebase 本地到 origin/main..."
            if ! git rebase --autostash origin/main 2>&1 | tail -3; then
                log "⚠️ rebase 失败（可能冲突），放弃本次 push（本地提交已保留）"
                git rebase --abort 2>/dev/null || true
                exit 2
            fi
        else
            log "本地已包含远端最新提交，无需 rebase"
        fi
        break
    else
        log "fetch 第 $sync_attempt 次失败，重试..."
        [ "$sync_attempt" -eq 3 ] || sleep 3
    fi
done

# rebase 成功后（或已是最新），再 add + commit
git add _data/douyin.json "$BLOG_PATH"
git add img/douyin-covers/ 2>/dev/null || true  # 作品封面（download_covers.py 产出）

if ! git diff --cached --quiet; then
    git commit -m "📱 更新抖音数据 — $TODAY $SUMMARY"
    log "已提交: $SUMMARY"
else
    log "数据无变化，跳过提交"
fi

log "push（最多重试 3 次）..."
PUSH_OK=0
for attempt in 1 2 3; do
    if GIT_CONFIG_GLOBAL=/dev/null GIT_SSH_COMMAND="ssh -o BatchMode=yes" \
        timeout 90 git push "$PUSH_URL" main > /tmp/douyin-push.log 2>&1; then
        tail -3 /tmp/douyin-push.log
        PUSH_OK=1
        break
    else
        push_rc=$?
        tail -3 /tmp/douyin-push.log >&2 || true
        log "第 $attempt 次失败（rc=$push_rc）"
        # 仍撞 rejected → 再 rebase 一次（极少数情况：fetch 后到 push 之间又有新提交）
        if grep -qE "fetch first|rejected|non-fast-forward" /tmp/douyin-push.log; then
            log "push 时又分叉，再 rebase 一次..."
            GIT_CONFIG_GLOBAL=/dev/null GIT_SSH_COMMAND="ssh -o BatchMode=yes" \
                timeout 90 git pull --rebase "$PUSH_URL" main >> /tmp/douyin-push.log 2>&1 \
                && log "rebase 成功，重试 push" \
                || { log "⚠️ rebase 失败，放弃"; break; }
        fi
        [ "$attempt" -eq 3 ] || sleep 3
    fi
done

# git push 全部失败 → fallback 到 Contents API（绕开 git 协议）
# 根因：服务器到 github.com 的 git fetch 不稳定（GFW 限速），导致 origin/main
# 长期停留在旧值，push 永远撞 rejected。API 通道（api.github.com）稳定可用。
if [ "$PUSH_OK" -eq 0 ]; then
    log "⚠️ git push 失败，fallback 到 Contents API 推送..."
    API_SCRIPT="$SCRIPT_DIR/push_douyin_via_api.py"
    if [ -f "$API_SCRIPT" ]; then
        if python3 "$API_SCRIPT" 2>&1 | tee /tmp/douyin-api-push.log; then
            if grep -q "API 推送成功" /tmp/douyin-api-push.log; then
                log "✅ API 推送成功，绕过了 git 协议问题"
                PUSH_OK=1
                # 从 API 输出提取 commit SHA（用于后续校验）
                API_SHA=$(grep -oE 'commit: [a-f0-9]+' /tmp/douyin-api-push.log | head -1 | awk '{print $2}')
                [ -n "$API_SHA" ] && COMMIT_SHA="$API_SHA"
            fi
        fi
    else
        log "⚠️ API fallback 脚本不存在: $API_SCRIPT"
    fi
fi

[ "$PUSH_OK" -eq 1 ] || die "push 3 次都失败，API fallback 也失败，本地数据已保留"

COMMIT_SHA="$(git rev-parse HEAD)"
EXPECTED_UPDATE="$(python3 -c '
import json
from datetime import datetime
with open("_data/douyin.json", encoding="utf-8") as f:
    value = json.load(f)["generated_at"]
print(datetime.fromisoformat(value).strftime("%Y-%m-%d %H:%M"))
')"
PUBLIC_URL='https://lyzbcy.github.io/posts/%E6%8A%96%E9%9F%B3%E6%95%B0%E6%8D%AE%E7%9C%8B%E6%9D%BF/'
ONLINE_HTML="$(mktemp /tmp/douyin-online.XXXXXX.html)"
ONLINE_OK=0
log "等待 GitHub Pages 上线并校验本次结果..."
for attempt in $(seq 1 20); do
    if curl -fsSL --max-time 20 "$PUBLIC_URL?v=$COMMIT_SHA" -o "$ONLINE_HTML" \
        && grep -qF "$EXPECTED_UPDATE" "$ONLINE_HTML" \
        && python3 "$VALIDATE_SCRIPT" --data "$DATA_FILE" --html "$ONLINE_HTML" >/tmp/douyin-online-validate.log 2>&1; then
        ONLINE_OK=1
        break
    fi
    [ "$attempt" -eq 20 ] || sleep 10
done

if [ "$ONLINE_OK" -ne 1 ]; then
    cat /tmp/douyin-online-validate.log >&2 2>/dev/null || true
    die "GitHub Pages 未在限时内出现本次已校验结果"
fi
log "✅ 已推送并验证线上看板: $EXPECTED_UPDATE"
