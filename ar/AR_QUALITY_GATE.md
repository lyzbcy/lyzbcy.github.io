# AR 质量门禁

## 作品定位

AR 区是游戏厅（`world/arcade.html`）里的四台街机，每台一个独立的浏览器 AR 体验，用摄像头画面作为现实层，把虚拟物体叠加到画面中。四台各有一个清晰的"实物 / 虚拟物体 / 交互方式"闭环，覆盖图像追踪、人脸追踪、手势识别、人体姿态四种不同的 AI 视觉能力，互不重复。

## 四台机台

| 机台 | 文件 | 追踪技术 | 实物 | 虚拟物体 | 交互 |
|---|---|---|---|---|---|
| AR 试戴间 | `tryon.html` | MediaPipe FaceLandmarker 468 点 + 头部位姿矩阵 | 用户的脸 | 3D 眼镜/帽子/耳环 | 转头实时试戴，自动测瞳距推荐尺寸，截图保存 |
| AR 手语桥 | `signbridge.html` | MediaPipe HandLandmarker 双手 21 点 | 用户的双手 | 手势词卡片、句子区 | 做手势识别成词，拼句语音朗读（公益无障碍） |
| AR 护脊官 | `posture.html` | MediaPipe PoseLandmarker 33 点 | 用户的身体 | 彩色骨骼、角度、警告标记 | 办公监测坐姿防驼背，健身纠正深蹲/俯卧撑/弯举 |
| AR 邀请函 | `invite.html` | AR.js NFT 图像追踪 | 弹珠台触发图 | 3D 星球、光环、粒子、飘字 | 对准图触发动画，扫码级传播体验 |

技术选型原则：**用对的工具**。图像追踪用 AR.js（它的强项），人脸/手势/姿态用 MediaPipe（AR.js 早期 face 模块已废弃，官方 README 也推荐 MediaPipe/MindAR）。WebARonARKit 是 2017 年的废弃 iOS 实验项目，与本作业无关，已从参考列表删除。

## 作业要求映射

- 实物：玩家手掌、手指、脸、身体、摄像头捕获的现实环境、打印的触发图。
- 虚拟物体：3D 配饰、骨骼连线、手势词、3D 星球/光环/粒子、计分 HUD。
- 交互方式：转头试戴、做手势拼句、坐姿/动作纠错、对准图触发动画。
- 手机/平板实现：响应式全屏 Canvas、`playsinline` 摄像头、触控/鼠标双模式、多摄像头选择。
- Unity 说明：本项目用 Three.js/Web + MediaPipe/AR.js 实现，答辩时可解释为 AI 视觉能力推动 Web AR 快速发展；Unity 能力可由其他小作业补充证明。

## 本轮改进记录（2026-06）

针对"四个 AR 效果都不太好"的反馈，按"各用对的工具、逐个打磨"的思路做了以下改进：

### 试戴间：修头部追踪真 bug + 补网红配饰
- **bug 修复**：`mediapipe-loader.js` 里 `outputFacialTransformationMatrixes` 原本是 `false`，但 `tryon-app.js` 一直在读 `facialTransformationMatrixes[0].data` 算头部俯仰/偏航——这个值永远是空的，导致配饰只能平移 + z 轴旋转，点头/摇头/歪头时配饰不跟着动。改为 `true` 后，配饰能跟随头部 6DoF 转动。
- **贴合逻辑重写**：`positionPropByFace` 重构，平移/缩放/翻滚用 landmark（正交相机下稳定），俯仰/偏航用 transformMatrix（真实头部位姿），两者解耦更鲁棒，加了 NaN 钳制。
- **新增配饰**：补了"毕业帽"和"兔耳"两款网红款（走 top anchor，正好验证头部追踪），配饰从 12 款增至 14 款，截图传播性更强。

### 邀请函：识别超时自动兜底
- **痛点**：NFT 图像追踪对打印质量/光线/距离敏感，演示时对准图识别不出来会全场冷场。
- **改进**：开摄像头后启动 8 秒倒计时，期间未识别成功则浮现兜底条"还没识别到？看演示动画 / 继续等"。识别成功自动隐藏。这样无论环境如何，演示都不会干等。
- **实现**：`invite.html` 加 `#fallback-bar`，`invite-app.js` 加 `cameraStartAt`/`fallbackShown`/`FALLBACK_HINT_MS`。

### 手语桥：扩词库 + 识别中过程反馈
- **扩词**：词库从 16 个增至 20 个，新增"你好/妈妈/爸爸/喜欢"。每个新词都和已有词逐一比对过 `test()` 规则，加了 y 位置/拇指约束消歧，避免同时命中导致 ambiguous。舍弃了"老师/哪里/早安"等与"学习/否/加油"判定重叠的词——宁可少几个也别误触发。
- **过程反馈**：原来要等 `pendingCount>=2` 才有任何反馈，用户不知道手势被"看到"。新增 `#pending-word` 半透明候选提示，第一次看到候选就轻量显示"词 ?"，确认后变实心大字。

### 护脊官：demo 模式改成回放脚本
- **痛点**：原来 demo 模式只是 `Math.sin` 摆评分数字，演示价值低，讲不清产品逻辑。
- **改进**：办公模式 demo 改成 14 秒循环脚本——良好(92) → 渐差驼背(58) → 警告峰值 → 纠正回升 → 恢复，并画示意骨骼（驼背相位时头肩前移、关节标红）。健身模式 demo 按动作周期自动计数并显示下放/最低点/发力阶段提示。无摄像头环境也能讲完整闭环。

## 自我批评与历史修复记录

- 批评：AR 从街机打开时跳转页面，破坏沉浸感。修复：游戏厅内用童话风 iframe 小窗口打开 AR，关闭时恢复游戏厅。
- 批评：本地 `/world/ar/...` 路由会被 Vite base 拦截。修复：Vite dev middleware 读取 `ar` 源文件并剥离 Jekyll front matter，找不到源文件时再回退到 `_site/ar`。
- 批评：返回链路会让用户重新选择世界。修复：游戏厅出口和左上角返回都使用 `./index.html?spawn=arcade`，主世界自动出生在游戏厅门口。
- 批评：作业要求不清晰。修复：AR 页和入口页都显式写出实物、虚拟物体、交互方式。
- 批评：静态导入 MediaPipe CDN，离线或 CDN 异常会导致演示模式也无法启动。修复：改为点击摄像头后按需动态加载 MediaPipe，鼠标演示不再依赖 CDN。
- 批评：自动化检测很难判断当前模式。修复：所有 AR 页在 `body` 上写入 `data-ar-mode`、`data-camera-attempted`、`data-camera-ready`、`data-last-error`，以及各机台专属的 `data-posture-score`/`data-reps`/`data-pd`/`data-sentence-length`/`data-recognized`/`data-tracking`/`data-phase`。
- 批评：邀请函 NFT 在 Blob Worker 内 `self.origin="null"` 导致相对路径 fetch 失败、永不识别。修复：descriptor 和 camera_para 用 `location.origin + '/ar/data/...'` 绝对 URL。

## 检测方式

每台机台都支持三种模式，通过 `body[data-ar-mode]` 区分：
- `boot`：初始未启动。
- `camera`：摄像头 + 真实 AI 追踪（`data-camera-ready="true"`）。
- `mouse`：鼠标/演示模式（`data-camera-attempted="false"` 或无摄像头时）。
- `fallback`：摄像头失败兜底（`data-camera-attempted="true"` + `data-camera-ready="false"`）。

自动化检测（playwright）可读这些 data 属性判断状态；答辩前真机自检也可用浏览器开发者工具查 `document.body.dataset`。

## 当前保留风险

- **摄像头依赖**：四台的真实追踪都依赖 MediaPipe CDN + 摄像头权限；离线、无摄像头或拒绝权限时进入鼠标演示/兜底模式（演示模式不调 landmarker，但摄像头模式 CDN 异常会 fallback）。
- **邀请函 NFT 识别率**：受触发图打印质量、光线、手机稳定性影响，无法保证陌生人陌生环境下必识别。已加 8 秒兜底，演示不会冷场，但"对准图就浮起"的体验需在好环境下才能完整呈现。
- **真机交付视频**：交付视频需用手机或允许摄像头的浏览器完成一次真机检测，目标状态为 `data-ar-mode="camera"`、`data-camera-ready="true"`，并录到各机台的核心交互（转头试戴、做手势拼句、坐姿纠错、对准图触发）。
