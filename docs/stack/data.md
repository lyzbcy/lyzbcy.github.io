# 技术栈:数据资产地图

## SQLite

| 库 | 路径 | 内容 | 写入者 |
|---|---|---|---|
| douyin-creator.db | `~/.openclaw/douyin-creator-tools/data/` | video_stats(每日全量快照,每轮INSERT全部作品)/comments | scrape:stats |
| reply_logs.db | skills/lyzbcy-douyin-comment-check/ | 抖音回复记录 | process-comments.py |

**video_stats 读法**:一轮快照=同一 timestamp 的所有行;对比两轮算增量。item_id 以 `xlsx_` 开头是假 ID(API延迟兜底),次日会有真实 ID 行——配对时优先真实 ID、假 ID 按规范标题(`T:` 前缀)配。

## JSON 数据流

```
抖音:  scrape → covers-by-id.json → download_covers.py → cover-paths-by-id.json
       → make_daily_snapshot.py → workspace/douyin/data/daily/stats-*.json
       → generate_douyin_data.py → 博客 _data/douyin.json → Pages
周报:  weekly-report.py → 博客 assets/weekly/W{年}-{周}.json → 看板组件 fetch
小红书: xhs_reply.py → comments-output/{unreplied-latest,reply-plan,run-result}.json
       → replied_ids.json(md5去重,勿手改)
```

## 图片资产

- 视频封面:博客 `img/douyin-covers/{item_id}.jpg`(假ID无封面,次日自愈)
- 一图流:博客 `assets/img/posters/poster-{dine,takeout,noodle}.png`

## 登录态(敏感)

| 平台 | profile | 失效表现 | 恢复 |
|---|---|---|---|
| 抖音 | douyin-creator-tools/.playwright/douyin-profile | 采集报 LOGIN_EXPIRED | 走 noVNC 人工扫码 |
| 小红书 | /home/ubuntu/.openclaw/xhs-profile | 报 LOGIN_EXPIRED | login_once.py 二维码,noVNC 兜底 |

## 人设/配置(改这里换行为)

- 抖音回复人设:skills/lyzbcy-douyin-comment-check/persona.json
- 小红书回复人设:skills/lyzbcy-xhs-comment-check/persona.json(开源版带演示人设)
