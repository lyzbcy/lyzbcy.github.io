# HowTo:博客/skill 推送链路

## 铁律:走服务器推,别本地直连 GitHub

本地 `git push`/`pull` 到 github.com 经常**卡死**(网络问题,历史多次)。服务器(ubuntu)的 push 链路稳定(营养/抖音看板每天在用)。

## 标准流程

```bash
# 1. 本地改好文件
# 2. tar 流传输到服务器(避免 scp 多文件引号问题)
cd 本地项目 && tar cf - 文件... | ssh -i ~/.ssh/id_ed25519_tencent root@111.231.25.152 \
  'cd /home/openclaw-shared/lyzbcy.github.io && tar xf - && chown -R ubuntu:ubuntu 对应路径'
# 3. 服务器上 commit+push(以 ubuntu 身份)
ssh ... 'cd /home/openclaw-shared/lyzbcy.github.io && sudo -u ubuntu git add -A 路径 && \
  sudo -u ubuntu git commit -m "..." && sudo -u ubuntu git push origin main'
# 4. 等 ~90s(Pages 构建+CDN),再验证线上
```

## 拉取远端最新(改文件前必做!)

```bash
ssh ... 'cat /home/openclaw-shared/lyzbcy.github.io/目标文件' > 本地基底.md
# 或 tar 流拉回。**绝不用本地旧副本直接覆盖远端**(见 pitfalls/ops.md 坑2,真实事故)
```

## 服务器本地也有未提交改动

服务器仓库常有 openclaw agent 的进行中改动(`git status` 可见 nutrition 等)——`git add` **只加自己的路径**,别 `git add -A` 全仓。

## 验证线上

```bash
# 构建状态(GitHub API,token 见本地 lyzbcy-git skill)
curl -s -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/lyzbcy/lyzbcy.github.io/actions/runs?per_page=2"
# 产物确认:下载 run logs 搜目标文件名
# 页面确认:注意 permalink 是 /posts/:title/(无日期前缀!)
```

## URL 规则(踩过)

博客 Chirky 主题 permalink = `/posts/:title/`(**不含日期**),sitemap.xml 是权威 URL 来源。
