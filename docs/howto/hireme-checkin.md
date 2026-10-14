# HireMe 签到：云端部署与恢复

2026-10-14 部署。源码私有仓库：https://github.com/lyzbcy/hireme-checkin，当前安装对应提交 737f40b9065fbb9c765c135ae8930a1dc2075ee1。

- 主机：111.231.25.152（VM-0-8-ubuntu）。业务执行用户 ubuntu。
- skill：/home/openclaw-shared/skills/hireme-checkin。
- 状态目录：/home/ubuntu/.local/state/hireme，权限 700。
- 登录态：session.json；企业微信机器人配置：notifications.json。两者 ubuntu:ubuntu、权限 600，内容禁止打印或入仓。
- 日志：/home/ubuntu/.local/state/hireme/cron.log。
- Python：/usr/bin/python3（3.12.3），仅标准库。
- 调度：ubuntu 系统 crontab，每天北京时间 09:00；服务器已验证 CST +0800、cron active。没有新增 OpenClaw 内置 cron 或 root cron。

## 运行与核对

每日任务命令（以 ubuntu 执行）：

~~~bash
/usr/bin/env -i HOME=/home/ubuntu USER=ubuntu LOGNAME=ubuntu PATH=/usr/local/bin:/usr/bin:/bin HIREME_SESSION_FILE=/home/ubuntu/.local/state/hireme/session.json /usr/bin/python3 /home/openclaw-shared/skills/hireme-checkin/scripts/hireme.py checkin
~~~

从 root SSH 检查时，在上述命令前加 sudo -u ubuntu -H。业务脚本必须以 ubuntu 运行，避免把日志/文件锁写成 root。

每次执行自动企业微信通知。claimed 表示本次领取且回读确认；already_claimed 表示当天之前已领取。not_logged_in 退出 2 并通知人工登录。通知失败时业务结果保留，成功业务退出 7，不重复领取。只读检查可把末尾 checkin 换成 --no-notify status。

## 更新登录态

在自己浏览器手动登录网站，使用仓库脚本 export-session 导出，或在服务器人工终端用 import-session。更新服务器 session.json 后，确保 ubuntu:ubuntu 和 600。不要把 Cookie、机器人 key、SSH 密码写进聊天通知、代码或此知识库。notifications.json 格式详见 skill 内 references/linux-cron.md，环境变量 HIREME_WECOM_WEBHOOK 可覆盖配置。

## 任务与回滚

ubuntu crontab 中唯一标记为 # hireme-checkin: daily 09:00 Asia/Shanghai。原有 crontab 全量备份在状态目录的 crontab-before-hireme-*.txt，权限 600。暂停时仅移除该标记和紧接的任务行，保留其他所有定时任务；不要直接恢复旧备份覆盖之后新增的任务。

## 部署验收

- 25 项测试在云端通过，包含 Linux 文件锁、超时不重发、访客页面不伪报登录以及企业微信错误响应。
- 2026-10-14 16:00（北京时间），在隔离环境模拟 cron 真实执行：already_claimed、80 积分、退出 0、notification.sent=true。
- SSH 上传源文件后读取 SHA-256，与本地源文件比较；凭据通过 SSH 单独传输，没有进入 GitHub。
- 首次定时触发预期为 2026-10-15 09:00；部署验收不代表已经观察到次日定时运行。
