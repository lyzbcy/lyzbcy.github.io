# 江南大学外卖从夯到拉排名 — 更新细则

对应文章:`_posts/2026-08-15-江南大学外卖从夯到拉排名.md`
状态:已核对数据、评分与统一一图流入口。

## 页面架构

1. 数据:`assets/lib-custom/takeout-tier.js` 的 `stalls`；`takeout-tier-extras.js` 管疑似歇业与海报入口
2. 隐藏文本:文章底部
3. 海报:`assets/img/posters/poster-takeout.png` 和 `poster-takeout.audit.json`

## 店铺与菜品必须分层

`stalls` 的每个顶层对象只能代表一家店。首页档位卡片、一图流和文章下方的详细手记
都只读取顶层 `name`、`tier`、`tierLabel`、`rating`、`description`：

- `name`：只写店铺/品牌/门店，例如 `【外卖】蔓味轻食`。禁止写成
  `【外卖】蔓味轻食·牛力满满经典牛柳意面`。
- `description`：只写这家店的综合评价，不能把一道菜的配料、热量和逐项口味测评堆在首页。
- 不知道真实店名时先向用户补问，不能拿菜名猜一个店名。

吃过的具体菜统一放在该店铺对象的 `dishes` 数组里。点击榜单店铺后，详情弹窗会把
每道菜渲染为正方形小卡片：

```js
dishes: [
  {
    name: '牛力满满经典牛柳意面', // 必填，只写菜名
    rating: 4.8,                  // 有用户原始评分才填
    ratingLabel: '历史口味 4.4', // 可选；需解释评分状态时优先显示
    price: '15 元',               // 可选，保留用户提供的价格口径
    review: '用户对这道菜的原始评价', // 必填，不润色、不由 AI 补写
    image: '/assets/image%20library/takeout-dish-images/xxx.jpg', // 可选
    imageAlt: '实际菜品图说明',    // 有 image 时建议填写
  },
],
```

菜品图片必须能确认是这家店的这道菜，并下载到仓库的
`assets/image library/takeout-dish-images/`。找不到可靠图片就不填 `image`，页面自动显示
“暂无实拍图”；禁止用相似菜、搜索缩略图或 AI 图冒充实物。

录入前先查同名店铺是否已经存在：存在就只向它的 `dishes` 追加/更新菜品；不存在时才
新增顶层店铺，并且必须同时取得用户给出的店铺档位、店铺评分和店铺综合评价。只有菜品
信息、没有店铺信息时，先保存到本轮工作说明并向用户补问，不能把菜品升格成榜单店铺。

原始评分优先取 `tierLabel` 的「店铺得分」或「评分」。例如螺判官标签为 3.83，
旧 `rating` 为 3.8，必须显示 **3.83**。保留原始小数和「估」标记；标签无数字才取 rating。

## 通用规矩(与 noodle-tier 一致)

- 档位/星级/评价 = 用户原话,禁止修改/降档/润色,不确定就问
- 新增条目格式照抄相邻条目；外卖当前条目无必填商品图，不套用方便面图片规范
- 改数据后同步隐藏文本，运行 `python tools/generate_posters.py --all` 和 `--all --check`
- 运行 `python -m unittest discover -s tests -p 'test_takeout_detail_schema.py'`，确认店铺名没有混入菜名、菜品卡字段完整、海报只出现店铺

依赖安装、看图验收、提交文件清单见 [统一一图流 skill](../../lyzbcy-tier-posters/SKILL.md)。
