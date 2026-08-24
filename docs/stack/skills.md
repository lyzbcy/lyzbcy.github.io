# 技术栈:skill 清单与健康状态

> 位置:`/home/openclaw-shared/skills/`(openclaw 用);部分在系统 cron 直接调脚本。
> 最后盘点:2026-08-24

## 自研核心(活跃)

| Skill | 功能 | 状态 | 入口 |
|---|---|---|---|
| lyzbcy-douyin-dashboard | 抖音数据看板(每日10:20采集→push博客) | ✅ 活跃 | scripts/collect.sh |
| lyzbcy-douyin-comment-check | 抖音评论自动回复(每小时,打包LLM) | ✅ 活跃 | run-check.py |
| lyzbcy-xhs-comment-check | 小红书评论自动回复(12h,10:05/22:05) | ✅ 活跃 | run-check.py(先 login_once 扫码) |
| lyzbcy-douyin-weekly | 抖音周报 JSON(周六12:00) | ✅ 活跃 | weekly-report.py(--back N 回填) |
| lyzbcy-nutrition-tracker | 营养看板(22:05) | ✅ 活跃 | cron_update.sh |
| starbudding-study-tracker | 学习看板(22:15,nginx) | ✅ 活跃 | cron_update.sh |
| lyzbcy-XiaohongshuSkills | 小红书**发布**(CDP浏览器/多账号) | ✅ 可用 | scripts/publish*.py |

## 基建类

| 资产 | 说明 |
|---|---|
| douyin-creator-tools(npm) | 抖音采集引擎(Playwright),works/scrape:stats/comments:* |
| novnc-remote-desktop | 人工登录浏览器通道(用完关) |
| ssh-tencent-cloud-connect | 本地→服务器的 SSH 连接 skill |

## 已废弃/归档

- ClawHub 版 xhs-auto-reply(Notion 模式,被自研版取代)
- skills.pre-shared-backup/(root 迁移备份,勿动)
- delta-knowledge-integration(方法论空壳)

## 开源出去的

- 小红书评论回复 → github.com/lyzbcy/laoyu-miaomiao-tools v1.6.0(MIT)
- 一图流生成器 → 博客仓库 tools/generate_posters.py + render_noodle_poster.py
