# 多平台内容看板

入口 `/posts/内容运营看板/`；保留旧抖音专页。新看板是内容维度的发布登记和真实采样展示。

## 唯一数据流

投稿回执 / 平台导出 → `tools/content_dashboard.py import` → 私有 SQLite → `export` → `assets/data/content-dashboard.json` → 页面。

数据库不进入公开 Git；生成 JSON 不手改。导入 JSON 是事实输入，保存来源和采样时间；不得用演示数据充当真实指标。公开快照不带 Cookie、token、原始请求或私有后台 URL。

```bash
python3 tools/content_dashboard.py --db /home/ubuntu/.local/share/laoyu-content/registry.sqlite import /path/to/verified-publications.json
python3 tools/content_dashboard.py --db /home/ubuntu/.local/share/laoyu-content/registry.sqlite douyin _data/douyin.json
python3 tools/content_dashboard.py --db /home/ubuntu/.local/share/laoyu-content/registry.sqlite export assets/data/content-dashboard.json
python3 -m unittest discover -s tests -p test_content_dashboard.py
```

导入字段见脚本 schema：content 是内容身份，publication 是平台稿件身份，snapshot 是不可变事实。同一素材在不同平台的版本不能按标题模糊自动归并。抖音导出按显式原生 ID、显式 source_title 精确匹配，或显式标题前缀加发布时间分钟匹配；候选必须唯一，`xlsx_` 标识是导出来源键，不能冒充平台原生作品 ID。

24h 与7d窗口仅接受目标时间前后1小时内的真实采样；没有采样就缺测。不插值、不补造从0开始的曲线。展示生成时间与采样时间分开。播放、阅读门槛不同，不能当跨平台去重观众。作品归因涨粉与账号净增关注分开。

## 当前接入状态

- Hot100第二期：8平台发布身份已登记；已核实的公开链接可直达。缺少公开链接的平台显示名称，不生成猜测链接。
- 抖音：支持既有后台导出按显式关联导入。新作品尚未绑定时不按相似标题抢绑。
- 其他平台：通用快照导入可用；未部署登录采集器、未取得官方 OAuth 的平台显示缺测，不声称实时。
- 现有抖音采集每次成功后可在原有提交之前执行上述 douyin/export 两步，避免新增重复调度。采集失败保留最后成功样本，由页面标注采样时间。

## 维护

前端 JS/CSS 使用外部文件，避免 Jekyll 压缩器改写字符串。构建后检查生成 JSON、页面入口和手机横向表格滚动。只提交本功能文件。线上源码可能比本地旧工作区新，实施前 fetch 并使用独立工作区。


## 服务器实际集成（2026-10-30）

已在现有 `update_douyin_dashboard.sh` 校验之前加入导入/导出，并在原有commit中加入快照JSON；沿用每日10:20采集，没有增加第二个调度。备份 `update_douyin_dashboard.sh.before-content-20261030`。导出失败保留上次快照并继续原抖音流程。原有Contents API兜底脚本仍仅处理旧抖音JSON；git push失败转该兜底时，多平台快照可能暂不更新，必须依页面采样时间识别，不能宣称已实时刷新。

首版已包含本期抖音后台和B站公开页的真实快照；B站等其他平台尚无服务器定时采集器，仅支持标准快照导入。
