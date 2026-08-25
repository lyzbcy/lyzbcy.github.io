# 坑:运维/服务器操作层

## 坑 1:pkill/pgrep 自杀(多次中招)

`pkill -f "xxx"` 的匹配串出现在**自己的 bash -c 命令行里** → 把自己(乃至整条 SSH 链)杀掉,exit 255。

**铁律**:
```bash
PIDS=$(ps -eo pid,cmd | grep 目标 | grep -v grep | grep -v "bash -c" | awk '{print $1}')
kill $PIDS
```
或按进程名 `pkill x11vnc`(不带 -f,只匹配进程名)。

## 坑 2:本地副本覆盖远端新内容(重大事故)

本地博客 clone 落后远端数周(当时走 GitHub 网页上传过文件)。我 tar 本地旧 md 覆盖服务器 → **删掉了服务器上 8-18 会话写的 AI 指南 v2**。靠 git checkout 3fc7c345 恢复。

**铁律:改任何远端文件,先 `scp` 拉远端当前版下来作为基底,在它之上追加/打补丁。本地 ≠ 远端是常态。**

## 坑 3:频率时间戳"执行前预写"

抖音评论检查的 lastCheckTime 在 freq 放行时就写 → 该轮中途崩溃 → 时间戳已更新 → 后续轮全被 SKIP → 未回复评论晾一整个周期。

**铁律:节流/去重时间戳在"成功完成后"写(失败不占坑,下轮自动重试)。**

## 坑 4:GitHub Pages 部署时序

- 连续快速 push → 中间构建被 auto-cancel → 某些文件从未部署(W32 404 之谜)
- CDN 传播延迟:刚推的内容可能 404/旧内容可能 200,**等 90s 再验**
- 验证优先级:GitHub API 看 runs 状态 > 从构建日志确认产物 > curl

**铁律:一次 push 包含全部改动,等构建 completed success 再验证。**

## 坑 5:Playwright(Python) evaluate 只收一个 arg

`page.evaluate(js, a, b)` 报 `takes 2 to 3 positional arguments`。
**铁律:多参数打包** `page.evaluate("(p)=>{...p.idx...}", {"idx":1,"frag":"..."})`。

## 坑 6:抖音 item_performance API 对新视频延迟 ~1 天

当天新发的视频不在 API 响应里 → 走 xlsx 兜底 → item_id 是 `xlsx_标题` 假 ID → 封面配不上、无法跳转。**次日自愈**(API 补上真实 ID)。不要试图"修"它;给 UI 留"ID同步中"降级态即可。

## 坑 7:OpenClaw 有两套 cron

系统 crontab(ubuntu) + openclaw 内置 cron(agentTurn,每小时)。排查"谁在什么时候跑了什么"要**两处都查**;openclaw cron 的执行记录在 `~/.openclaw/agents/main/sessions/`。

## 坑 8:磁盘紧张

根分区常年在 90%+。装大依赖前 `df -h /` 检查;Python playwright 恰好复用已有 chromium-1208 是运气,不是常态。

## 坑 9:xvfb 里的 headless=False

服务器跑 Playwright 有头模式必须 `xvfb-run -a` 包裹(cron 无 DISPLAY)。已有封装:`run-check.py` 的 `xvfb_wrap()`。

## 坑 10(2026-08-25):抖音采集偶发拦截失败,当天无重试

症状:cron 10:20 报"未拦截到 item_performance",登录态正常(探针验证过),手动重跑即成功。
根因:页面/API 偶发(8-17、8-25 两次)。cron 每天仅一次,失败=当天无数据。
处置:手动重跑 collect.sh;长期建议给 collect.sh 加失败重试(如 1h 后重试一次)。

## 坑 11(2026-08-25):push 被服务器仓库未提交工作挡住

openclaw 常有进行中改动(未 commit),douyin-push 的 rebase 会报"index contains uncommitted changes"。
让路法(非破坏):`git stash push -m 让路` → pull --rebase → push → `git stash pop`。勿丢弃他人 WIP。
注意 stash list 里可能有多条历史 stash,只 pop 自己刚 push 的那条。

## 备用通道(2026-08-25):本地 shell 瘫痪时用 node REPL

本地 Bash 工具 spawn /bin/zsh 失败(ENOENT,系统级故障)时,`mcp node_repl` 的
child_process(exec/execFile/ssh)不经过本地 shell,是完整备用执行通道(本页操作即全程用它完成)。

