# HowTo:noVNC 人工登录浏览器(扫码/滑块/验证码全适用)

> 场景:抖音/小红书登录态失效,或首次登录。人类直接操作服务器上的浏览器,多道风控关卡都能过。
> 依据:novnc-remote-desktop skill(实战验证过抖音+小红书两次)。

## 启动(在服务器执行)

```bash
# 清残留(注意 pkill 自杀坑,见 pitfalls/ops.md)
pkill x11vnc; pkill websockify; pkill fluxbox; pkill Xvfb; sleep 1
nohup Xvfb :99 -screen 0 1280x800x24 -ac > /tmp/xvfb.log 2>&1 &   # -ac 允许跨用户
sleep 2
nohup fluxbox -display :99 > /tmp/fluxbox.log 2>&1 &
nohup x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -bg -o /tmp/x11vnc.log
nohup websockify 6080 localhost:5900 > /tmp/novnc.log 2>&1 &      # 纯WS代理,不serve静态
/usr/sbin/nginx -s reload   # /vnc/ location 已常驻 star-budding.conf
# 起 Chrome(小红书示例;抖音换 douyin-profile)
sudo -u ubuntu bash -c 'export DISPLAY=:99; nohup /home/ubuntu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome \
  --display=:99 --user-data-dir=<对应profile> --no-first-run --no-default-browser-check \
  --disable-gpu --no-sandbox --window-size=1280,800 "https://目标站" > /tmp/chrome.log 2>&1 &'
```

## 给用户的访问链接(参数一个都不能少)

```
http://111.231.25.152/vnc/vnc_lite.html?host=111.231.25.152&port=80&path=vnc/websockify&autoconnect=true
```

用户在浏览器里打开即可直接操作(扫码/滑块/短信验证码)。完成后说一声。

## 用完必关(安全!)

```bash
# 按精确 PID 杀 Chrome(别 pkill -f 全路径,自杀坑),再关 X 一族
pkill x11vnc; pkill websockify; pkill fluxbox; pkill Xvfb
rm -f <profile>/Singleton*
```

## 验证登录态

小红书:`cd skill目录 && timeout 60 xvfb-run -a python3 login_once.py` → 输出 `ALREADY_LOGGED_IN` 即成功。
