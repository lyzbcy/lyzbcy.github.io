现状：稳定
负责人：仓库维护者
最后更新时间：2026-10-08

# 构建架构

Actions 先安装海报依赖，执行 unittest 与 generate_posters.py --all --check，
随后使用 Ruby 3.3 构建 Jekyll，上传 _site，deploy 作业推送 gh-pages。

网页每次加载即最新，不做客户端更新机制。维护版本在 package.json 的 version 字段。
日志使用现有 unittest 与生成器的标准输出/错误输出，Actions 保存逐步日志与退出状态。
