# Pitfalls: Agent 上下文与遵循性问题

## 坑1:AGENTS.md 里的规则 ≠ Agent 会执行(2026-08-24 诊断)

**现象**:AGENTS.md 明确写了"更新博客前必须先读页面头部指南注释",但小龙虾
(th-deepseek-v4-flash)更新方便面排名时**从未读过**(`_posts/*.md` 头部指南
在会话轨迹中零出现),直接凭记忆改 → 找错图(8KB 占位图也敢用)、命名违规。

**根因**(三层叠加):
1. **模型太弱**:flash 级模型在长指令下会循环打转——单次 run 重复
   "好的…先找图"15+ 遍,烧 560 万 token 才出结果
2. **指令过载**:系统提示 ~38K 字符 + 64 工具 + 10 万 token 上下文,
   埋在 248 行 AGENTS.md 第 233 行的两行规则根本轮不到被执行
3. **记忆误导**:每次更新会召回"我已完成更新"类历史记忆,模型以为自己会了

**规避铁律**:
- 关键操作规范做成**独立 skill**(触发词强制),别只在 AGENTS.md 里写一行
  → 已建 `skills/lyzbcy-blog-update/`(仓库内权威,agent workspace 符号链接)
- 页面级细则放 skill 的 `references/`(渐进式披露),别塞进文章 HTML 注释
  ——注释既占每次读取的上下文,又随增量更新越滚越大
- 精细任务(找图核验/档位判断)别用 flash 级模型
- 机械可校验的规矩(图片≥50KB、命名格式)值得加 git pre-commit 钩子兜底

## 坑2:trajectory 里 systemPrompt 是截断桩

排查 agent 行为时,trajectory 的 `systemPrompt` 字段是
`{"truncated":true,"reason":"trajectory-field-size-limit",...}` 桩对象,
**不能**据此判断模型实际看到了什么;要用 `context.compiled` 事件或
`messagesSnapshot` 交叉验证。
