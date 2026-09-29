# 公网 IP HTTPS 与自动续期

2026-09-29 已上线，证书和域名新增费用 0 元；使用现有服务器带宽。

- 公网前缀：https://111.231.25.152:8443/launcher-stats
- HTTP-01：80 端口 /.well-known/acme-challenge/，根目录 /var/www/laoyu-acme。必须保持公网 80 可达。
- nginx 配置：/etc/nginx/conf.d/laoyu-https.conf；原 443 DERP 保持不变。
- 客户端：acme.sh，从 acmesh-official/acme.sh 官方 master 获取；源 SHA-256 c7d68b021cfd6380ea83a82962abde5b484779fee0b97d38681dfa1396bbc8d7。/opt/laoyu-acme/acme.sh。自动升级未启用。
- 私密账户与证书：/etc/laoyu-acme（0700）；私钥不得进 Git 或客户端。
- timer：laoyu-acme-renew.timer，每日 03:20、15:20 + 0–15 分钟随机延迟，Persistent=true。
- oneshot：laoyu-acme-renew.service，96 MiB / CPU 15% / 240 秒超时；平时无常驻 ACME 进程。
- 申请 shortlived profile，--days 3；当前 acme.sh 计算的首次续期时间为 2026-10-01 08:07 UTC（证书约 160 小时有效）。以客户端实际配置为准，不按长期证书周期运行。
- 自动部署证书后执行 nginx -t && systemctl reload nginx。真实 --renew --force 成功及 reload 成功均已验证。不要高频 force。

## 检查

    systemctl status laoyu-acme-renew.timer --no-pager
    journalctl -u laoyu-acme-renew.service -n 20 --no-pager
    openssl x509 -in /etc/laoyu-acme/server-fullchain.pem -noout -dates -issuer
    curl -fsS https://111.231.25.152:8443/launcher-stats/health

失败会记录在 systemd journal。没有配置外部消息提醒，需运维查看；不要将“已配置定时器”理解为永久不需维护。

## 公开下载

/var/www/laoyu-public/downloads 仅保存启动器 ZIP 与 SHA256SUMS.txt。ZIP 114249304 字节，SHA-256 819e5bb66b6631d676d153b1d2ac088408aa3e62c4d534fea678f89cd318b465。每连接限速 2 MiB/s，每 IP 最多 3 个下载连接；实际速度受服务器带宽限制。软件各自下载仍走原 GitHub 发布渠道。

更新包先上传 .part，核对 SHA-256 后原子改名；更新入口页面前确认公开地址返回正确长度。代码仓库维持私有。

## Launcher 0.4.1 (2026-09-29)

Per owner request, anonymous daily analytics defaults to enabled for new installations, with a visible off switch. Existing saved opt-out stays preserved; the owner explicitly enabled their current installation. AirPods portable ZIP is verified, safely extracted and associated locally; never automatically executed. Public package: laoyu-software-center-0.4.1-win-x64.zip, 114253997 bytes, SHA-256 688bd4292da38a29265ad1804b178b4ddc5f06c271d506d08928219fb9288551. Previous 0.4.0 package retained for existing links.
