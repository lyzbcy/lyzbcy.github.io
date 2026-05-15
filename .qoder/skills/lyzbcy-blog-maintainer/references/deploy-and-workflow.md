# Deploy & Workflow 参考

## 适用场景
当任务涉及以下内容时读取本文件：
- GitHub Pages 发布失败
- GitHub Actions workflow 报错
- 本地构建正常但线上未部署
- workflow 版本维护

---

## 1. Jekyll build 成功，不代表部署一定成功

### 典型现象
- 本地 `jekyll build` 正常
- GitHub Actions 最终失败
- 日志只看到 `Process completed with exit code 1`

### 高概率原因
HTMLProofer 在测试阶段发现：
- 死链
- 图片路径错误
- 锚点不存在
- 内部链接不合法

### 推荐排查顺序
1. 本地先跑构建
2. 再单独跑 HTMLProofer
3. 看到明确报错后逐条修复

### 经验判断
如果构建成功、测试失败，不要只盯着 Jekyll 本体，多半是链接校验阶段出了问题。

---

## 2. HTMLProofer 太严格时，先分清“必须修”还是“暂时绕过”

### 原则
- 如果是核心页面链接错误，应该修
- 如果只是为了先恢复发布链路，可以暂时调整 workflow，但要明确这是权宜之计

### 可接受的临时方案
- 暂时注释高噪音的 test 步骤
- 先确保部署链路恢复，再逐步补链接问题

### 注意
临时方案不应伪装成最终方案。提交说明里要写清楚。

---

## 3. GitHub Actions Node 版本升级要看兼容策略

### 典型现象
GitHub Actions 提示：
- Node 20 deprecated
- 某些官方 action 正在切换到新运行时

### 优先处理顺序
1. 优先升级 action 到更高版本
2. 如果 action 尚未全面升级，可用环境变量强制切新版本运行时
3. 不要长期依赖“不安全旧版本”兼容开关

### 接手建议
看到 Node runtime 警告，不要直接恐慌；先判断：
- 是 warning 还是已经阻断构建
- action 是否已有更新版本
- 是否可以先用官方兼容迁移手段过渡

---

## 4. 推送成功后页面未更新，不一定是 push 失败

### 可能原因
- GitHub Pages 构建还在排队
- workflow 还没跑完
- CDN / 浏览器缓存
- permalink 路径与预期不一致

### 检查顺序
1. 先看远程 commit 是否已到 main
2. 再看 Actions 是否成功
3. 最后检查页面链接与缓存

### 接手建议
用户说“页面没更新”，先别立刻改代码，先确认是发布链路问题还是内容问题。
