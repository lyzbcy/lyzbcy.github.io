# Git 发布说明

这份说明记录本仓库当前的 Git / Pages 发布方式，方便后续接手的人直接照着操作。

## 当前发布结构

- 开发分支：`dev`
- 静态发布分支：`gh-pages`
- GitHub Pages：从 `gh-pages` 分支根目录发布
- 发布模式：`legacy`

## 为什么要这样改

这个仓库之前使用 GitHub Actions 进行 Pages 构建和部署，但当前账号遇到了 billing issue，Actions job 无法启动。
为了绕开这个外部限制，把发布方式改成了“本地构建 + 推送静态文件到 `gh-pages`”。

## 当前操作流程

### 1. 本地构建站点

在源码仓库根目录执行：

```bash
bundle exec jekyll build
```

构建产物会输出到 `_site/`。

### 2. 准备发布分支

我使用了单独的 worktree 来放 `gh-pages` 分支，避免污染源码分支：

```bash
git worktree add -B gh-pages E:\gh-pages-publish-temp dev
```

然后把 `_site/` 的内容复制到这个工作区，并创建 `.nojekyll`：

```powershell
Copy-Item -Path .\_site\* -Destination E:\gh-pages-publish-temp -Recurse -Force
New-Item -ItemType File -Force -Path E:\gh-pages-publish-temp\.nojekyll
```

### 3. 提交并推送发布分支

在 `gh-pages` worktree 中提交：

```bash
git add -A
git commit -m "deploy: publish static site to gh-pages"
git push origin gh-pages
```

### 4. 切换 GitHub Pages 设置

GitHub Pages 现在已经配置为：

- `build_type`: `legacy`
- `source.branch`: `gh-pages`
- `source.path`: `/`

这一步的等价 API 操作是：

```bash
gh api -X PUT repos/lyzbcy/lyzbcy.github.io/pages -f build_type=legacy -f source[branch]=gh-pages -f source[path]=/
```

## 以后怎么更新站点

如果以后源码有改动，按下面顺序更新：

1. 在 `dev` 分支修改源码
2. 本地执行 `bundle exec jekyll build`
3. 把新的 `_site/` 内容同步到 `gh-pages`
4. 提交并推送 `gh-pages`

### 推荐命令顺序

源码分支：

```bash
git add -A
git commit -m "chore: your message"
git push origin dev
```

发布分支：

```bash
cd E:\gh-pages-publish-temp
git add -A
git commit -m "deploy: update gh-pages"
git push origin gh-pages
```

## 注意事项

- `gh-pages` 分支只放静态产物，不要把源码混进去。
- 如果站点依赖 Jekyll 插件或主题功能，记得先本地构建，再更新 `gh-pages`。
- 如果以后 GitHub 账户恢复正常，也可以考虑再切回 Actions workflow。

