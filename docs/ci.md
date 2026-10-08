现状：稳定
负责人：仓库维护者
最后更新时间：2026-10-08

# 饮料榜新增条目的 CI 回归

运行 37569542726（147e6b3）和后续 37633761334 在海报单元测试失败：
test_drink_anchors_keep_author_scores 写死 11 项，而作者新增黑魔爪后源数据已有 12 项。
这是测试契约过时，不是作者评分或生成器错误。

保留三个守门员精确映射，检查已有关键饮料的名称、档位和精确评分，
新增黑魔爪 NPC 3 星回归断言。允许后续新增产品；完整性、唯一性、
源数据/网页/海报一致性继续由 SourceData 测试和 --check 验证。

验证命令：
```sh
python -m unittest discover -s tests -p 'test_tier_posters.py'
python tools/generate_posters.py --all --check
```

本次仅更新测试与开发文档/维护版本，不改排名数据、海报及 workflow。
