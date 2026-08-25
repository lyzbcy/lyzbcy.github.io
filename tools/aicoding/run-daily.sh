#!/bin/bash
# AI Coding 比赛看板 — 每日更新入口(ubuntu cron 9:30 调用)
# 链路:抓取AI赛事通 → 三级筛选 → 写 assets/data/aicoding.json → commit+push → Pages 自动构建
# 细则见 skills/lyzbcy-blog-update/references/aicoding-board.md

set -u
cd "$(dirname "$0")/../.." || exit 1   # 定位到仓库根

# 服务器 node 装在 nvm,PATH 里可能没有,显式找最新版
NODE_BIN="$(ls /home/ubuntu/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1)"
[ -z "$NODE_BIN" ] && NODE_BIN="$(command -v node)"
echo "[$(date '+%F %T')] node: $NODE_BIN"

"$NODE_BIN" tools/aicoding/update-aicoding.mjs --pages 6 || { echo "抓取失败,保留旧数据"; exit 1; }

# 数据无变化就不提交(避免空 commit 堆积)
if git diff --quiet -- assets/data/aicoding.json; then
  echo "[$(date '+%F %T')] 数据无变化,跳过提交"
  exit 0
fi

git add assets/data/aicoding.json
git commit -m "🏆 更新AI Coding比赛看板数据 — $(date '+%F')"
for i in 1 2 3; do git push origin main && break; echo "push 第${i}次失败,重试..."; sleep 5; done
echo "[$(date '+%F %T')] 完成"
