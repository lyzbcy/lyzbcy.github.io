# AR 质量门禁

## 作品定位

主打作品是 `star-rescue.html`：一个面向手机和平板的浏览器 AR 救援游戏。它使用摄像头画面作为现实层，手部识别或鼠标演示作为物理输入，把星星、污染云、能量环、粒子反馈叠加到画面中，形成可解释、可操作、可演示的完整闭环。

## 作业要求映射

- 实物：玩家手掌、手指、摄像头捕获的现实环境。
- 虚拟物体：发光星星、污染云、救援能量环、连击粒子、计分 HUD。
- 交互方式：手指靠近星星并停留完成救援，碰到污染云会重置连击。
- 手机/平板实现：页面使用响应式全屏 Canvas、`playsinline` 摄像头、触控/鼠标双模式。
- Unity 说明：本项目用 Three.js/Web + MediaPipe 实现，答辩时可解释为 AI 视觉能力推动 Web AR 快速发展；Unity 能力可由其他小作业补充证明。

## 自我批评与修复记录

- 批评：原四个 AR 项目展示力弱，像技术 demo。修复：游戏厅新增原创主打作品 `星愿救援局`，并把旧项目降为展区辅助机台。
- 批评：AR 从街机打开时跳转页面，破坏沉浸感。修复：游戏厅内用童话风 iframe 小窗口打开 AR，关闭时恢复游戏厅。
- 批评：本地 `/world/ar/...` 路由会被 Vite base 拦截。修复：Vite dev middleware 读取 `ar` 源文件并剥离 Jekyll front matter，找不到源文件时再回退到 `_site/ar`。
- 批评：返回链路会让用户重新选择世界。修复：游戏厅出口和左上角返回都使用 `./index.html?spawn=arcade`，主世界自动出生在游戏厅门口。
- 批评：作业要求不清晰。修复：AR 页和入口页都显式写出实物、虚拟物体、交互方式。
- 批评：主打 AR 页静态导入 MediaPipe CDN，离线或 CDN 异常会导致演示模式也无法启动。修复：改为点击摄像头后按需动态加载 MediaPipe，鼠标演示不再依赖 CDN。
- 批评：自动化检测很难判断当前到底是摄像头模式、演示模式还是兜底模式。修复：`star-rescue.html` 在 `body` 上写入 `data-ar-mode`、`data-camera-attempted`、`data-camera-ready`、`data-rounds-started`、`data-last-error`，用于真实检测和答辩前排查。

## 真实检测记录

- 构建检测：在 `site-dev/world` 执行 `npm run build`，通过。仅有 Three.js chunk 大于 500 kB 的 Vite 体积提示，不影响运行。
- 路由检测：启动 `http://127.0.0.1:5180/world/` 后访问 `/world/ar/star-rescue.html`，确认读取源文件版本，初始状态为 `data-ar-mode="boot"`、`data-camera-attempted="false"`、`data-rounds-started="0"`。
- 演示模式检测：点击“先用鼠标演示”，状态变为 `data-ar-mode="mouse"`、`data-rounds-started="1"`，权限层隐藏，倒计时开始，控制台无 error/warn。
- 摄像头入口检测：点击“开启摄像头”，当前浏览器返回 `Permission denied`，状态为 `data-ar-mode="fallback"`、`data-camera-attempted="true"`、`data-camera-ready="false"`、`data-rounds-started="1"`；说明摄像头路径真实发起，但本次环境未授权摄像头，页面正确兜底且没有崩溃。
- 游戏厅嵌入检测：访问 `/world/arcade.html`，默认选中“星愿救援局”，点击“打开 AR 窗口”后 iframe 指向 `/world/ar/star-rescue.html`，iframe 内权限层和演示入口可见，控制台无 error/warn。

## 当前保留风险

- `star-rescue.html` 的真实手势识别依赖 MediaPipe CDN 和摄像头权限；离线、无摄像头或拒绝权限时会进入鼠标演示/兜底模式。
- 交付视频必须再用手机或允许摄像头的浏览器完成一次真机检测，目标状态应为 `data-ar-mode="camera"`、`data-camera-ready="true"`，并录到手指靠近星星触发救援。
- 旧四个 AR 项目已补作品说明与游戏厅入口，但主创意和完成度仍不如 `星愿救援局`，答辩时应优先演示主打作品。
