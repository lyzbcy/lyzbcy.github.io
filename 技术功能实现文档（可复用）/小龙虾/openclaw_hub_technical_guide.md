# OpenClaw Hub Pro — 完整技术复刻文档

> **用途**：本文档记录了 OpenClaw Hub Pro 的完整搭建过程、所有功能实现细节、遇到的坑与解决方案。  
> **目标读者**：另一个 AI 代理或开发者，可凭此文档从零复刻出完全相同的成果。

---

## 一、项目概述

**OpenClaw Hub Pro** 是 OpenClaw（小龙虾 AI 网关）的可视化管理工具，由以下组件构成：

| 文件 | 作用 |
|------|------|
| `OpenClaw_Hub.ps1` | PowerShell 桌面原生 GUI（Windows Forms），提供一键启动网关 + 配置入口 |
| `OpenClaw_小龙虾管理器.exe` | 编译后的 `.exe` 启动器（内部调用 `node manager_server.js`） |
| `manager_server.js` | Node.js HTTP 后端，提供 Web UI 服务 + REST API |
| `manager_ui.html` | 单文件 Web 前端（HTML + CSS + JS），提供美观的深色主题管理界面 |
| `hub_strings.json` | PowerShell GUI 的本地化字符串 |

---

## 二、项目目录结构

```
e:\z3h\openclaw\
├── OpenClaw_Hub.ps1          # PowerShell 原生 GUI
├── OpenClaw_小龙虾管理器.exe   # 编译启动器
├── manager_server.js          # ★ 核心后端 (Node.js HTTP Server)
├── manager_ui.html            # ★ 核心前端 (Web UI)
├── hub_strings.json           # GUI 本地化字符串
├── package.json               # Node.js 依赖
├── node_bin/                  # 自带的 Node.js 运行时
│   ├── node.exe
│   └── npx.cmd
├── node_modules/
│   └── openclaw/
│       └── openclaw.mjs       # OpenClaw CLI 入口
└── venv/
    └── Scripts/
        └── cmdop.exe          # Computer Use 运行时
```

### 关键配置文件位置（用户目录）

```
%USERPROFILE%\.openclaw\
├── openclaw.json              # ★ 主配置（模型、网关、认证模式）
├── manager_profiles.json      # ★ 管理器保存的 API 账号列表
└── agents/main/agent/
    └── auth-profiles.json     # ★ 认证凭据存储
```

---

## 三、后端 API 端点清单 (`manager_server.js`)

所有端点均绑定在 `127.0.0.1` 的**随机端口**上（`PORT = 0`），启动后自动打开浏览器。

### 3.1 基础端点

| 方法 | 路径 | 功能 |
|------|------|------|
| `GET /` | 返回 `manager_ui.html` 页面 |
| `POST /save` | 首次配置：写入 API Key → 启动 cmdop + gateway → 打开浏览器 |
| `POST /launch` | 一键启动：启动 cmdop + gateway → 打开浏览器（不需要重新输入 Key） |

### 3.2 API 账号管理端点

| 方法 | 路径 | 功能 |
|------|------|------|
| `GET /api/profiles` | 获取所有已保存账号 + 当前激活 ID |
| `POST /api/profiles` | 新增一个账号（传入 `{name, provider, key}`） |
| `DELETE /api/profiles/{id}` | 删除指定账号 |
| `POST /api/profiles/apply` | **应用账号**（写入 auth-profiles.json + 修改 openclaw.json 默认模型 + 重启网关） |
| `POST /api/profiles/test` | **测试 API Key 有效性和余额**（1-token 真实请求） |

---

## 四、核心实现细节

### 4.1 API 账号存储格式

**`~/.openclaw/manager_profiles.json`**：
```json
{
  "profiles": [
    {
      "id": "1773110554043",
      "name": "白嫖版kimi1号",
      "provider": "moonshot",
      "key": "sk-xxxxx"
    }
  ],
  "activeId": "1773110554043"
}
```

### 4.2 支持的 AI 供应商 (provider)

| provider 值 | 显示名 | API 基础域名 | 默认模型字符串 |
|---|---|---|---|
| `openai` | OpenAI | `api.openai.com` | `openai/gpt-3.5-turbo` |
| `anthropic` | Anthropic (Claude) | `api.anthropic.com` | `anthropic/claude-3-haiku-20240307` |
| `deepseek` | DeepSeek | `api.deepseek.com` | `deepseek/deepseek-chat` |
| `qwen` | Qwen (通义千问) | `dashscope.aliyuncs.com` | `qwen/qwen-turbo` |
| `gemini` | Google Gemini | `generativelanguage.googleapis.com` | `google/gemini-2.5-flash` |
| `moonshot` | Moonshot (Kimi) | `api.moonshot.cn` | `moonshot/moonshot-v1-8k` |
| `groq` | Groq | `api.groq.com` | `groq/llama3-8b-8192` |
| `perplexity` | Perplexity | `api.perplexity.ai` | `perplexity/sonar-small-chat` |

### 4.3 Apply（应用账号）的完整流程

> [!IMPORTANT]
> 仅写入 `auth-profiles.json` 是**不够的**！必须同时修改 `openclaw.json` 中的模型配置并重启网关。

```
用户点击「应用此账号」
    ↓
1. 读取 manager_profiles.json，找到对应的 profile
    ↓
2. 写入 auth-profiles.json：
   profiles["{provider}:default"] = { type: "api_key", provider, key }
    ↓
3. 写入 openclaw.json：
   agents.defaults.model.primary = "{provider}/{model}"  ← ★关键步骤
    ↓
4. 杀掉旧的 gateway 进程（wmic，仅杀 openclaw.mjs 相关进程）
    ↓
5. 重新 spawn 新的 gateway 进程
    ↓
6. 返回 { success: true }
```

**核心代码片段（网关重启）**：
```javascript
const { exec: execCmd, spawn } = require('child_process');
const killCmd = process.platform === 'win32'
    ? 'wmic process where "commandline like \'%openclaw.mjs%gateway%\'" call terminate'
    : 'pkill -f "openclaw.mjs gateway"';

execCmd(killCmd, (killErr) => {
    const nodeBinDir = path.join(__dirname, 'node_bin');
    const mjsPath = path.join(__dirname, 'node_modules', 'openclaw', 'openclaw.mjs');
    const envPath = nodeBinDir + path.delimiter + process.env.PATH;
    const gatewayProc = spawn('node', [mjsPath, 'gateway', '--port', '18789', '--verbose', '--allow-unconfigured'], {
        detached: true, stdio: 'ignore',
        env: Object.assign({}, process.env, { PATH: envPath })
    });
    gatewayProc.unref();
});
```

### 4.4 API 测额（Test）的完整流程

> [!WARNING]
> **绝对不要**用 `GET /v1/models` 来测试余额！大部分服务商（尤其是 Moonshot/Kimi）即使账户余额为零，也会返回 HTTP 200。这会产生**假阳性**。

**正确做法**：发送一条 **1-token 的真实 Chat Completion 请求**。

```
用户点击「测额」
    ↓
1. 构建 POST 请求到 /{provider}/chat/completions
   payload = { model: "cheapest_model", messages: [{role: "user", content: "hi"}], max_tokens: 1 }
    ↓
2. 发送 HTTPS 请求
    ↓
3. 根据 HTTP 状态码判断：
   200     → ✔ 可用 (Valid)
   401/403 → ✘ 无效或过期 (Invalid/Expired)
   402/429 → ⚠ 限流或欠费 (Rate/Quota Limit)
   404     → ✔ 连通可用 (Valid Auth)
   其他    → ? 未知状态
```

**每个 provider 的测试端点**：

| Provider | Endpoint | Model |
|---|---|---|
| openai | `/v1/chat/completions` | `gpt-3.5-turbo` |
| anthropic | `/v1/messages` | `claude-3-haiku-20240307` |
| deepseek | `/chat/completions` | `deepseek-chat` |
| qwen | `/compatible-mode/v1/chat/completions` | `qwen-turbo` |
| moonshot | `/v1/chat/completions` | `moonshot-v1-8k` |
| groq | `/openai/v1/chat/completions` | `llama3-8b-8192` |
| perplexity | `/chat/completions` | `sonar-small-chat` |
| gemini | `/v1beta/models/gemini-2.5-flash:generateContent?key={key}` | N/A（用 contents 格式） |

> [!NOTE]
> Anthropic 使用 `x-api-key` 头而不是 `Authorization: Bearer`。Gemini 使用 URL 参数 `?key=` 而不是 Authorization 头。

---

## 五、前端 UI 结构 (`manager_ui.html`)

单文件 Web 应用，深色主题，内联 CSS + JS。

### 5.1 页面布局

```
┌─ 侧边栏 (180px) ──┐┌─ 主内容区 ────────────────────┐
│ OPENCLAW HUB PRO   ││                               │
│ 🦞                 ││  [运行中心页] 或 [API设置页]    │
│                    ││                               │
│ ► 运行中心         ││                               │
│ ► API 设置         ││                               │
│                    ││                               │
│ ● 参数设置中       ││                               │
│ 当前账号: xxx      ││                               │
└────────────────────┘└───────────────────────────────┘
```

### 5.2 API 设置页双栏布局

```
┌─ 添加新账号 ─────────┐┌─ 已保存的 API 列表 ────────┐
│ 自定义名称            ││ ┌──────────────────────────┐│
│ [________________]    ││ │ 白嫖版kimi1号  moonshot  ││
│ 选择供应商            ││ │ [应用] [测额] [删除]     ││
│ [OpenAI        ▼]    ││ └──────────────────────────┘│
│ API 密钥              ││ ┌──────────────────────────┐│
│ [sk-***** ] [显示]    ││ │ 白嫖版deepseek deepseek  ││
│                       ││ │ [应用] [测额] [删除]     ││
│ [测试连通性⚡] [保存]  ││ └──────────────────────────┘│
└───────────────────────┘└────────────────────────────┘
```

### 5.3 关键 JavaScript 函数

```javascript
// 加载账号列表
async function loadProfiles() { /* fetch GET /api/profiles */ }

// 应用账号
async function applyProfile(id) { /* fetch POST /api/profiles/apply */ }

// 删除账号
async function deleteProfile(id) { /* fetch DELETE /api/profiles/{id} */ }

// 测试账号余额（已保存的）
async function testProfile(id) { /* fetch POST /api/profiles/test, body: {id} */ }

// 测试新账号（未保存的）
document.getElementById('testBtn').addEventListener('click', () => {
    /* fetch POST /api/profiles/test, body: {provider, key} */
});
```

---

## 六、踩坑记录与解决方案

### 坑 1：UI 自动关闭

**问题**：保存配置后，Node.js 后端调用了 `process.exit(0)`，前端调用了 `window.close()`，导致用户无法继续操作。

**解决**：删除所有 `process.exit(0)` 和 `window.close()` 调用。服务器持久运行。

---

### 坑 2：端口占用 `EADDRINUSE`

**问题**：使用固定端口（如 1327）时，如果上次进程没正常退出，新进程会因端口被占用而崩溃。

**解决**：将 `PORT` 设为 `0`（随机端口）。Node.js 会自动分配空闲端口：
```javascript
const PORT = 0;
server.listen(PORT, '127.0.0.1', () => {
    const actualPort = server.address().port;
    console.log(`Running at http://127.0.0.1:${actualPort}`);
});
```

---

### 坑 3：API 测额假阳性（GET /models 的陷阱）

**问题**：使用 `GET /v1/models` 来测试 API Key 有效性。Kimi (Moonshot) 等供应商即使**账户余额为零**，也会返回 `HTTP 200`，导致显示"可用"但实际网关报错 `API rate limit reached`。

**根因**：`/v1/models` 是公开接口，不检查余额。

**解决**：改用 `POST /v1/chat/completions` 发送 1-token 的真实请求（`max_tokens: 1`）。服务商的计费网关会在此时校验账户余额。

---

### 坑 4：Apply 只写了凭据，没切换模型

**问题**：点击"应用此账号"后，代码只写入了 `auth-profiles.json`（存放 API Key），但没有修改 `openclaw.json` 中的 `agents.defaults.model.primary`。导致网关仍然使用旧的模型去调用 API，自然被拒绝。

**根因**：OpenClaw 的路由系统通过 `openclaw.json` 的 `model.primary` 字段来决定用哪个供应商。仅有凭据而没有匹配的模型配置，等于什么都没变。

**解决**：Apply 时同时修改两个文件：
```javascript
// 1. auth-profiles.json — 凭据
authData.profiles[`${provider}:default`] = { type: "api_key", provider, key };

// 2. openclaw.json — 默认模型
ocData.agents.defaults.model.primary = modelString; // 如 "google/gemini-2.5-flash"
```

---

### 坑 5：网关不重启，新配置不生效

**问题**：即使成功修改了配置文件，正在运行的网关进程仍在使用启动时加载的旧配置。

**解决**：Apply 后自动杀旧网关 + 启动新网关：
```javascript
// 用 wmic 精确杀掉 openclaw.mjs 相关进程（不杀 manager_server.js）
execCmd('wmic process where "commandline like \'%openclaw.mjs%gateway%\'" call terminate', () => {
    // 重新启动
    spawn('node', [mjsPath, 'gateway', '--port', '18789', '--verbose', '--allow-unconfigured'], {
        detached: true, stdio: 'ignore', env: ...
    }).unref();
});
```

> [!CAUTION]
> 不要用 `taskkill /F /IM node.exe`！这会把 manager_server.js 自身也杀掉。必须用 `wmic` + `commandline like` 精确匹配。

---

### 坑 6：eval() 中的模板字符串崩溃

**问题**：曾尝试用 `eval(restartScript)` 执行网关重启逻辑，但因为字符串中包含反引号模板字面量（`` ` ``），转义混乱导致 JavaScript 语法错误，服务器直接崩溃。

**解决**：**永远不要在 eval() 字符串里嵌套模板字面量**。直接用 `child_process` 的 `exec` 和 `spawn` 调用。

---

### 坑 7：Gemini 模型名过时

**问题**：将 Gemini 模型写为 `gemini-1.5-flash`，Google 返回 `404: models/gemini-1.5-flash is not found`。

**解决**：通过 API 查询可用模型：
```
GET https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}
```
发现当前可用的是 `gemini-2.5-flash`。**模型名会随时间变化，建议在代码中保持更新或动态查询**。

---

### 坑 8：Anthropic 认证方式不同

**问题**：大部分服务商使用 `Authorization: Bearer {key}`，但 Anthropic 使用 `x-api-key: {key}` + `anthropic-version` 头。

**解决**：在 switch 中特殊处理：
```javascript
case 'anthropic':
    options.headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
```

---

## 七、OpenClaw CLI 参考命令

```bash
# 使用 OpenClaw 自带的 node 运行时
SET NODE=e:\z3h\openclaw\node_bin\node.exe
SET MJS=e:\z3h\openclaw\node_modules\openclaw\openclaw.mjs

# 查看所有命令
%NODE% %MJS% --help

# 配置 API Key（交互式向导）
%NODE% %MJS% onboard --moonshot-api-key sk-xxx --non-interactive --accept-risk

# 手动启动网关
%NODE% %MJS% gateway --port 18789 --verbose --allow-unconfigured

# 查看/修改配置
%NODE% %MJS% config get agents.defaults.model.primary
%NODE% %MJS% config set agents.defaults.model.primary "google/gemini-2.5-flash"

# 健康检查
curl http://127.0.0.1:18789/health
# → {"ok":true,"status":"live"}
```

### 支持的 `--auth-choice` 值
```
openai-api-key | anthropic | deepseek | moonshot-api-key | gemini-api-key
qwen-portal | groq | perplexity | custom-api-key | ...
```

---

## 八、从零复刻步骤

### 前提条件
- Windows 10/11
- 项目目录含 `node_bin/node.exe`（自带的 Node.js v22+）
- 项目目录含 `node_modules/openclaw/openclaw.mjs`
- 至少一个 AI 供应商的 API Key

### 步骤

1. **创建 `manager_server.js`**  
   - 实现 HTTP Server，`PORT = 0`
   - 实现 `GET /` 返回 UI 页面
   - 实现 `POST /save` 写入凭据 + 启动 gateway + 打开浏览器
   - 实现 `POST /launch` 仅启动 gateway + 打开浏览器
   - 实现 `GET/POST/DELETE /api/profiles` RESTful 账号管理
   - 实现 `POST /api/profiles/apply`（三步：写 auth → 写 openclaw.json model → 重启 gateway）
   - 实现 `POST /api/profiles/test`（1-token 真实请求测额）

2. **创建 `manager_ui.html`**  
   - 深色主题，侧边栏导航，双栏 API 管理布局
   - 前端 JS 对接所有 REST API
   - 测额按钮：绿色=可用，红色=无效，黄色=欠费

3. **创建 `OpenClaw_Hub.ps1`**（可选）  
   - Windows Forms GUI，提供桌面入口

4. **运行测试**：
```bash
# 启动管理器
node manager_server.js

# 验证端点
curl http://127.0.0.1:{PORT}/api/profiles  # 查看账号
curl -X POST http://127.0.0.1:{PORT}/api/profiles/test -d '{"provider":"moonshot","key":"sk-xxx"}'  # 测额
curl http://127.0.0.1:18789/health  # 网关健康检查
```

---

## 九、关键注意事项总结

| # | 注意事项 |
|---|---------|
| 1 | `PORT = 0` 防止端口冲突 |
| 2 | 不要用 `process.exit()` 或 `window.close()` |
| 3 | 测额必须用 `POST /chat/completions`，不要用 `GET /models` |
| 4 | Apply 必须同时写 `auth-profiles.json` + `openclaw.json` |
| 5 | Apply 后必须重启 gateway 进程 |
| 6 | 杀进程用 `wmic commandline like`，不要用 `taskkill /IM node.exe` |
| 7 | 不要在 `eval()` 里用模板字面量 |
| 8 | Gemini 模型名经常更新，需动态查询 |
| 9 | Anthropic 认证头格式不同（`x-api-key` 而非 `Bearer`） |
| 10 | Gemini 认证用 URL 参数 `?key=` 而非 `Authorization` 头 |
