# 技术架构说明文档 (Technical README)

本文档旨在介绍本网站 ([lyzbcy.github.io](https://lyzbcy.github.io)) 的技术实现细节、架构组成及开发部署流程。

## 1. 项目概述

本网站是一个基于静态网站生成器 (Static Site Generator, SSG) 构建的个人博客/知识库系统。它专注于内容的高效发布与阅读体验，采用 Markdown 编写内容，自动编译生成静态 HTML 页面。

## 2. 核心技术栈 (Tech Stack)

### 核心引擎
- **[Jekyll](https://jekyllrb.com/)**: 网站的核心构建引擎，基于 Ruby 开发。它负责将纯文本 (Markdown) 转化为静态网站和博客。
- **Ruby**: Jekyll 的运行环境语言。

### 主题与主要框架
- **[Jekyll Theme Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy)** (SDK v7.4+): 
  - 采用响应式设计，完美适配移动端与桌面端。
  - 内置深色/浅色模式 (Dark/Light Mode) 切换。
  - 侧边栏导航架构。

### 前端技术
- **HTML5 / Liquid**: 使用 Liquid 模板语言进行动态内容的渲染与逻辑控制。
- **SCSS (Sass)**: 样式表预处理语言，用于模块化管理 CSS。
- **JavaScript (Vanilla JS)**: 处理前端交互，如侧边栏切换、搜索功能、PWA Service Worker 等。
- **Bootstrap**: (作为 Chirpy 主题的底层依赖) 提供了基础的网格系统和部分组件样式。

### 数据与内容
- **Markdown**: 内容创作的主要格式。
- **YAML**: 用于配置文件 (`_config.yml`) 和 Front Matter (文章元数据)。

## 3. 关键功能特性

- **PWA (Progressive Web App)**: 支持离线访问和安装到主屏幕 (配置于 `_config.yml` 中 `pwa: enabled: true`)。
- **SEO 优化**: 集成 `jekyll-seo-tag` 插件，自动生成 meta 标签、Sitemap 等。
- **评论系统**: 支持多种评论插件 (Giscus, Disqus, Utterances)，当前配置可见 `_config.yml`。
- **网站统计**: 集成多种分析工具接口 (Google Analytics, Umami 等)。
- **RSS 订阅**: 自动生成 Atom XML Feed。
- **站内搜索**: 本地搜索索引功能。

## 4. 目录结构说明

```bash
.
├── _config.yml       # 核心配置文件 (站点设置、插件、主题配置等)
├── _posts/           # 博客文章源文件 (Markdown 格式)
├── _tabs/            # 独立页面 (如关于、归档、标签等)
├── _data/            # 静态数据文件 (如本地化字符串、社交链接等)
├── _includes/        # Liquid 模板片段 (Header, Footer, Sidebar 等)
├── _layouts/         # 页面布局模板
├── assets/           # 静态资源 (图片、编译后的 CSS/JS、第三方库)
├── Gemfile           # Ruby 依赖定义 (Jekyll 及插件版本)
└── .github/          # GitHub 配置
    └── workflows/    # GitHub Actions 自动部署脚本
```

## 5. 开发与部署 (DevOps)

### 本地开发
依赖于 Bundler 管理 Gem 环境：
```bash
# 安装依赖
bundle install

# 启动本地服务器 (支持实时重载)
bundle exec jekyll serve
```
*注：Windows 环境下使用 `wdm` 用于文件监控。*

### 持续集成与部署 (CI/CD)
本项目托管于 GitHub，并使用 **GitHub Actions** 进行自动化构建与部署。
- **Workflow**: `.github/workflows/pages-deploy.yml`
- **流程**:
    1. 代码 Push 到远程分支。
    2. GitHub Actions 触发构建任务。
    3. 安装 Ruby 环境与依赖。
    4. 执行 `jekyll build` 生成静态文件。
    5. Artifacts 上传并部署至 GitHub Pages 环境。
