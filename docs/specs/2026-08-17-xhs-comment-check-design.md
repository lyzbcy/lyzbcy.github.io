# 设计文档:lyzbcy-xhs-comment-check(小红书评论自动检查+回复)

> 日期:2026-08-17
> 状态:已获用户批准("去吧 完整完成吧")
> 参照系:服务器上已验证运行的 `lyzbcy-douyin-comment-check`
> 开源基座:[Fisher0012/xhs-auto-reply](https://github.com/Fisher0012/xhs-auto-reply)(MIT,已审源码)

---

## 1. 背景与目标

用户已有抖音侧全自动评论回复系统(定时检查未回复评论 → LLM 生成个性化回复 → 自动发送 → 核验 → 中文报告),希望为小红书建立对等能力。

### 关键领域事实(调研结论)

1. **小红书后台没有抖音式"未回复"筛选**。成熟开源项目的解法:走**消息通知页**(`www.xiaohongshu.com/notification?type=comment` →「评论和@」Tab),以"本地已回记录"去重代替平台未回复状态。
2. 通知页直接具备回复交互(条目内"回复"按钮 → `textarea.comment-input` → "发送"),无需进笔记详情页。
3. 开源基座的核心页面交互(选择器/流程)经过真实运行验证,可复用。

### 目标

- 每 12 小时自动处理小红书新评论(通知页路线),LLM 生成人设化回复并自动发送
- 一条笔记内的未回复评论全部回复(不设每笔记上限;单次总量安全阀 15 条,防失控)
- 工程纪律对齐抖音:反编造、登录失效检测、发送核验、审计日志、频率节流

### 非目标(明确不做)

- 不做评论数据分析看板(现有 douyin-dashboard 模式可日后平移,另立项)
- 不做私信自动回复
- 不做 Notion 集成(服务器上那个 ClawHub 版 xhs-auto-reply 的模式,弃用)

---

## 2. 架构

```
系统 crontab (ubuntu 用户)
  10:05 / 22:05 各一次 (12h 间隔)
  └─ run-check.py                      # 唯一入口,一键完成全流程
      ① 频率节流    adjust-check-freq.py 平移版(12h 内跑过则 SKIP 并报告)
      ② 内存检查    /proc/meminfo 可用 <200MB → 停止并报告
      ③ 登录预检    打开通知页,检测登录重定向/登录元素 → LOGIN_EXPIRED 报告停止
      ④ 抓取过滤    xhs_reply.py 移植强化版:
                     切「评论和@」Tab → 抓通知列表 → 解析(用户名/评论内容/笔记封面hash)
                     → 过滤三连:已回过(md5去重) / 别人的回复("回复了你的评论"+"作者") / 垃圾词
      ⑤ LLM 生成    process 层:ws-claw-corp LLM + persona.json 人设,逐条生成
      ⑥ 逐条回复    点"回复" → 填 textarea → 点"发送" → 核验已回上
                     随机 8-25s 间隔;单次 ≤15 条安全阀
      ⑦ 报告审计    comment-check-report.md + logs/run-YYYY-MM-DD.log(留7天)
```

### 目录结构(服务器)

```
/home/openclaw-shared/skills/lyzbcy-xhs-comment-check/
├── SKILL.md              # 工作流+纪律文档(仿抖音版)
├── run-check.py          # 主控(平移抖音骨架,改命令与节流参数)
├── xhs_reply.py          # 核心:通知页采集+回复(开源移植+修坑强化)
├── login_once.py         # 首次扫码登录(headless+xvfb,二维码截图发给用户)
├── adjust-check-freq.py  # 频率节流(平移,间隔 12h)
├── persona.json          # 人设(identity/定位/笔记上下文/垃圾词/兜底模板)
├── persona.example.json  # 可公开样板
├── replied_ids.json      # 已回评论记录(稳定 md5 ID)
├── comments-output/      # 中间结果(unreplied-latest.json / reply-plan.json)
├── logs/                 # run-YYYY-MM-DD.log
└── requirements.txt      # playwright/openai/httpx
```

浏览器 profile:`/home/ubuntu/.openclaw/xhs-profile`(独立,不与抖音/现有 9222 实例混用)。所有 Playwright 调用经 `xvfb-run -a` 包裹(cron 无 DISPLAY)。

---

## 3. 对开源基座的 4 处必修(移植强化点)

| # | 原坑 | 修复 |
|---|---|---|
| 1 | 去重 ID 用 Python `hash()`(进程随机盐,**重启后记录失配 → 重复回复**) | 改 `md5(username + "\x00" + comment_text[:200])` 稳定 ID |
| 2 | 无登录失效检测(cookie 过期会把登录页文本当评论解析) | 抓取后校验:页面含登录特征/通知容器为空+URL 跳登录 → `LOGIN_EXPIRED` 报告停止 |
| 3 | 点"发送"后不核验 | 发送后确认:该条目 UI 状态变化(回复框收起/出现自己的回复文本);核验失败计 error 不算成功 |
| 4 | `headless=False` 硬编码 | 服务器一律 `xvfb-run -a` 包裹(照抄抖音 collect.sh 模式) |

另有的小改造:Telegram 通知 → 删(报告写文件);macOS launchd → Linux crontab;DeepSeek API → `ws-claw-corp`(key 从 `~/.openclaw/openclaw.json` 自动探测,平移抖音逻辑);人设/笔记上下文硬编码 → `persona.json`;增加 dry-run 模式。

---

## 4. 数据流与判定纪律

### 数据流

```
通知页 DOM
  → items[] {idx, username, comment_text, note_hash}
  → 过滤: replied_ids / 他人回复 / is_spam()
  → reply_queue[] (≤15)
  → LLM 生成 reply_text[] (persona 人设 + 笔记上下文)
  → 页面交互发送 + 核验
  → replied_ids.json 追加;reply-plan 与结果写 comments-output/
  → comment-check-report.md(中文,含每条 @用户/评论/回复/成功与否)
```

### 判定纪律(对齐抖音精神,适配小红书现实)

- "新评论"的判定:**以通知页本次真实抓取 + 本地 replied_ids 为唯一依据**,禁止凭记忆/旧报告编造
- 只有核验通过的条目才计入 `repliedCount`;核验失败/未匹配 → 如实汇报"未全部完成"
- `SKIP` / `EMPTY` / `LOGIN_EXPIRED` / 内存不足 → 各自明确报告,不伪装成功
- 恶意注入防护:命中 `maliciousKeywords` 的评论走机械兜底模板,不进 LLM(平移抖音机制)

### persona.json 结构(与抖音同构)

`identity`(昵称/人设/签名/emoji)、`accountProfile`(账号定位)、`knownNotes`(封面hash→笔记主题,起步可为空用通用上下文)、`spamKeywords`、`maliciousKeywords`、`replyTemplates`(兜底)、`systemPromptTemplate`。

人设起步值:沿用"周五涵"身份(程序员/健身/技术生活分享,龙虾 emoji 前缀+签名),部署后用户可在 persona.json 随时改。

---

## 5. 风控安全阀

| 措施 | 值 | 说明 |
|---|---|---|
| 检查频率 | 12h(10:05/22:05) | 起步保守,跑稳可调 |
| 单次回复总量 | ≤15 条 | 安全阀防失控;**不设每笔记上限**(用户要求:一条笔记内未回复全回) |
| 回复间隔 | 随机 8-25s | 平移开源值 |
| 启动延迟 | 随机 0-5min | 拟人化(比开源的 15min 收敛) |
| 垃圾过滤 | 关键词+规则 | 引流/代购/纯数字/超短文本等,过滤并标记已处理 |

---

## 6. 错误处理

| 场景 | 行为 |
|---|---|
| 登录失效 | LOGIN_EXPIRED 报告"需要人工扫码",本轮停止 |
| 内存不足 | 停止并报告 |
| 通知容器抓取为空且含登录特征 | 按登录失效处理 |
| 单条回复异常 | 计 error,继续下一条,不中断整轮 |
| LLM 失败 | 该条走兜底模板;模板也失败则跳过并如实报告 |
| 采集结果异常(0 条但页面正常) | 正常 EMPTY 报告(确实没新评论) |

---

## 7. 测试与验收(分四关)

1. **登录关**:`login_once.py` 产生二维码截图 → 用户手机扫码 → profile 落地;再跑一次确认免登录直通通知页
2. **dry-run 关**:只抓取+生成回复计划,不发送;输出计划文件供用户过目文案风格
3. **小批量真实关**:强制 `--max-replies 3` 真实发送,核验已回上,检查 replied_ids 记录正确
4. **上线观察关**:crontab 启用,跑 3 天看审计日志无异常(无重复回复/无登录失效误判),后放开 15 条上限

### 验收标准

- dry-run 计划中的评论与通知页肉眼一致
- 真实回复后,页面该评论下出现博主回复,报告 `repliedCount` 与实际相符
- 重启进程后再次运行,已回评论不被重复回复(md5 去重生效)
- SKIP/EMPTY/LOGIN_EXPIRED 三种报告各自正确产出

---

## 8. 部署步骤(实施顺序)

1. 服务器创建 skill 目录与全部文件
2. 装 Python 依赖(playwright 已有 chromium,补 openai/httpx 若缺)
3. `login_once.py` 扫码(用户配合一次)
4. dry-run 验证
5. 小批量真实验证
6. 注册 crontab(备份现有 crontab 后追加)
7. 连跑观察,交付使用说明

---

## 9. 开放问题(默认处理)

- 通知到元宝群:本期不做,报告写文件(与抖音报告同路径风格);后续可接
- 通知页翻页(评论很多时):开源版未翻页,本期同(首轮消化存量后,12h 增量通常一页内);若实测不够再加
