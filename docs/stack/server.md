# 技术栈:腾讯云服务器全景

> 主机 `111.231.25.152`(SSH 见本地 `ssh-tencent-cloud-connect/` skill,root + 专用密钥)

## 双用户结构(2026-08-02 迁移形成)

| 用户 | 角色 | 关键目录 |
|---|---|---|
| root | 旧实例,保留 | `/root/.openclaw/`(历史数据,渐进废弃) |
| **ubuntu** | **现役** | `/home/ubuntu/.openclaw/`(douyin-creator-tools、浏览器 profile) |

**共享区** `/home/openclaw-shared/`(ubuntu 可写):
- `skills/` — 全部 agent skill(见 skills.md)
- `lyzbcy.github.io/` — 博客仓库(部署+push 链路)
- `identity/` — openclaw 身份(AGENTS/SOUL/USER.md,勿乱动)
- `memory-tdai/`、`未决问题-迁移清单.md`

**路径注意**:root 时代脚本硬编码 `/root/...`,迁移后靠 `OPENCLAW_HOME`/`DOUYIN_CREATOR_DIR` 等环境变量覆盖;新脚本一律 `$HOME` 自适应。

## 服务与进程

| 服务 | 说明 |
|---|---|
| openclaw gateway | `node .../openclaw/dist/index.js gateway --port 18789`(agent 主进程,含内置 cron) |
| Chrome 9222 | `browser-existing-session` profile,headless 常驻(勿杀,别的功能在用) |
| nginx :80 | 博客不在这;`/vnc/`(noVNC)、学习看板等静态站 |
| Xvfb/x11vnc/websockify | **按需启动用完关**(noVNC 登录用,见 howto) |

## 系统 crontab(ubuntu)

| 时间 | 任务 |
|---|---|
| 10:20 每日 | 抖音数据看板采集 collect.sh |
| 22:05 / 22:15 每日 | 营养/学习看板 |
| **周六 12:00** | 抖音周报 JSON 生成 |
| 周一 01:00 | 营养补充 |
| (openclaw cron) | 每小时:抖音评论检查(内部 1h 节流+自适应) |

## 网络/凭据

- GitHub:ubuntu `~/.ssh/lyzbcy_deploy`(deploy key)+ 服务器 push 链路畅通;本地直连不稳
- 抖音登录态:`/home/ubuntu/.openclaw/douyin-creator-tools/.playwright/douyin-profile`
- 小红书登录态:`/home/ubuntu/.openclaw/xhs-profile`
- LLM:`~/.openclaw/openclaw.json` → models.providers.ws-claw-corp
- 磁盘:根分区 90%+,大文件操作前必查 `df -h`
