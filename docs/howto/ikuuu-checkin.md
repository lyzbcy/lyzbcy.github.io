# iKuuu 签到：云端部署与恢复

2026-10-16 部署于腾讯云 VM-0-8-ubuntu，由 ubuntu 用户运行。

- 源码：`/home/openclaw-shared/skills/ikuuu-checkin/ikuuu.py`，本地副本 `E:\共享\创业\ikuuu-checkin`。
- ubuntu 系统 crontab 唯一标记 `# ikuuu-checkin`，每天北京时间 09:00。
- 服务器时区已核对 Asia/Shanghai，cron active。
- 私有状态目录：`/home/ubuntu/.local/state/ikuuu`（700）。
- Cookie：session.json；机器人配置：notifications.json；运行状态：result.json。均 600、ubuntu:ubuntu，禁止打印或入仓。
- 日志：同目录 cron.log；crontab 安装前备份：crontab-before-ikuuu-*.txt。

## 核查和恢复

以 ubuntu 执行：

```bash
python3 /home/openclaw-shared/skills/ikuuu-checkin/ikuuu.py status
python3 /home/openclaw-shared/skills/ikuuu-checkin/ikuuu.py checkin
```

status 只读。checkin 仅在未签到时提交，回读页面确认后才通知企业微信，每天最多一次通知。错误不发群消息，写入日志；登录过期时需浏览器重新登录，再通过 Kimi CDP Network.getCookies 导出当前域 Cookie、通过 SSH 上传 session.json。不得保存账户密码。上传后必须保持 ubuntu:ubuntu 和 600。

POST 结果不确定时禁止自动重发，当日 submit_date 留在 result.json。先通过 status 核查；若人工确认确实未签到且可以重试，再清除对应日期标记。通知失败不会触发重新签到，notification_attempt_date 防止不确定送达造成重复群消息。

暂停仅移除 ubuntu crontab 中 `# ikuuu-checkin` 对应行。不要恢复旧全量 crontab 覆盖后来新增的任务。

## 网站协议与坑

GET /user 可能返回 originBody base64 包装 HTML，必须解码后解析。登录判断必须存在 `/user/logout`，签到区域必须为 `#checkin-div`。文本“明日再来”证明今天已签到；启用按钮调用 `checkin()`。页面脚本 `/theme-e5556/malio/js/malio.js?v11` 使用 `POST /user/checkin`，空请求体、Cookie 认证。不能像原网页 success 回调那样对任何 HTTP 200 都提示成功，必须回读页面确认。

## 部署验收

2026-10-16 16:05:56 +08:00，在清空环境变量的 cron 等价环境执行：already_claimed、退出 0、notification.sent=true，群通知由企业微信接口确认。4 项云端测试通过：登录和包装 HTML、签到后回读、未确认状态失败、超时不重发。源码 SHA-256 已与本地核对一致。

首次计划触发为 2026-10-17 09:00；部署验收未观察未来定时运行。现有 HireMe cron 保留。
