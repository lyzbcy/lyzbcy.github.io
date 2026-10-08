---
name: lyzbcy-blog-dev
description: 博客维护与构建排障入口。
---

# 博客开发入口

## 项目一句话
Jekyll 个人博客与排名海报，通过 GitHub Actions 发布到 gh-pages。

## 技术栈
Jekyll / Ruby 3.3；海报工具使用 Python 3.10+、Pillow、fontTools 和 Node.js 18+。

## 目录地图
- AGENTS.md、skills/lyzbcy-blog-update/：博客更新规则。
- docs/agent.md：开发导航；docs/INDEX.md：现有知识库导航。
- assets/lib-custom/：排名原始数据；assets/img/posters/：海报和审计。
- tools/、tests/：生成工具和回归测试。
- .github/workflows/：构建与发布；reference/：深度资料。

## 开发流程
先读 AGENTS.md、docs/agent.md、docs/roadmap.md 与相关模块文档。
代码、模块文档、package.json 的 version 字段同步更新。
只提交相关路径，先验证单元测试与海报 --all --check，再检查远端构建和部署。

## 红线
保留作者原始评分、档位和评价；不关闭检查来掩盖失败；不改 Secret。
保留已有未提交工作，发布前核对远端最新内容。

## 当前状态
版本以 package.json 的 version 字段为准。进度见 docs/roadmap.md。
