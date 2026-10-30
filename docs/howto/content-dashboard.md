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

## 2026-10-31 接口快速刷新

页面的 `#content-dashboard` 从 `data-source` 指定的 `/assets/data/content-dashboard.json` 发起 `fetch(..., {cache: 'no-cache'})`。刷新网页只重新读取静态JSON，不触发平台采集。前端不持有平台Cookie或token。数据变化仍须采集→私有SQLite→export→服务器提交推送→Pages构建/CDN；接口取数时间与线上更新耗时分别计算。

新增唯一批量入口 `tools/refresh_content_metrics.py`：

```bash
# 已初始化的真实主库；只采集指标，不投稿，不新建调度。
python3 tools/refresh_content_metrics.py \
  --db /home/ubuntu/.local/share/laoyu-content/registry.sqlite \
  --platforms douyin \
  --douyin-export _data/douyin.json \
  --export assets/data/content-dashboard.json \
  --report /home/ubuntu/.local/share/laoyu-content/last-refresh.json
```

- B站通过实测的公开 `GET https://api.bilibili.com/x/web-interface/view?bvid=...`，最多3并发，按已登记BV精确核对响应身份；取得播放、赞、评、藏、分享。不打开作品页，不截图，不需要登录。涨粉没有此来源，保持null。
- 抖音复用既有创作者采集结果，再调用标准导入器，不反复用浏览器导出。`--douyin-export`并不触发新的抖音采集，保留原 `generated_at` 为采样时间；需要最新抖音数据时先运行既有采集链路。
- `--registry VERIFIED.json` 可重复传入已核实的发布登记，使用原标准导入器；不要按标题模糊合并。新一期必须先登记其真实平台ID，再参与批量采样。
- SQLite单写入，采集有超时、同轮防并发锁；失败作品不写0、不删除历史，其余成功作品可继续更新。所有来源都失败时不覆盖公开快照，退出码非零；单平台部分失败也非零并在私有report中列出。
- 没有新增定时器、没有声称其余平台已支持接口。服务器现有任务已在原提交前调用本命令，并让既有失败处理保留旧快照。仍按服务器ubuntu推送链路部署，不从本机绕过现有发布规则。

本地真实验证：三期B站一次采集3条，实测0.25秒（单次结果，不保证稳定时延）；4项采集测试与9项标准注册库测试通过。本地暂存库从线上公开历史快照恢复并导入当前三期发布矩阵，只用于演练；**不得拿暂存库覆盖服务器真实主库**。工作文件位于被Git忽略的 `.private/content-refresh/`，公开仓库只收脚本、测试和此文档。

### 本机快速更新并通过服务器发布

服务器已实测：腾讯云出口访问B站view接口返回HTTP 412，本机同接口可用；没有把本机成功冒充云端采集成功。使用下面的一条命令在本机按服务器已有BV登记取数，再通过SSH只上传标准采样，服务器写入原主库、生成快照并推送：

```bash
# 本机依赖paramiko；密码交互输入且不保存，也可指定--key已有私钥。
python tools/refresh_content_remote.py --host YOUR_SERVER --user root --push
```

不带`--push`只导入并生成服务器快照，供验证后统一发布。仅传JSON事实，不传Cookie，不下载整个私有数据库；从服务器当前快照读取已登记BV，不需要每次复制投稿回执。采集失败时不上传不覆盖，服务器写入与日采集共用刷新锁。SSH主机密钥沿用known_hosts校验。

服务器原每日10:20任务沿用原时刻，默认`CONTENT_METRIC_PLATFORMS=douyin`，不反复触发已知412；B站通过上述本机命令按需刷新，**尚未建立本机无人值守调度**。其余平台仍缺适配，不承诺全平台实时。原有GitHub Contents API兜底只处理旧抖音数据的限制仍保留，不把兜底视为多平台快照已经发布。

2026-10-31部署：在服务器真实SQLite上导入当前三期登记并保留已有历史，导入前三表计数为2/9/4（内容/平台稿件/采样）；没有用本机暂存库替换。原任务已备份至私有backups/refresh-20261031，版本库保留运行脚本镜像tools/douyin-collector/update_douyin_dashboard.sh。服务器13项回归与bash语法检查通过；云端412按失败记录，本机到服务器采样导入实测3条成功。发布及Pages在线核验的实际SHA和时间另留本次私有部署回执。
