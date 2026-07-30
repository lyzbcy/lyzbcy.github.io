#!/usr/bin/env python3
"""聚合抖音数据生成 Jekyll _data/douyin.json

修复（相对原版）：
- 增量逻辑：原来用 snapshots[-2]（但同一天多次跑会覆盖，prev 永远 None），
  改成用 time_series 去重后的倒数第二条
- 无快照时 sys.exit(1)（原代码 return，退出码 0 让 collect.sh 误以为成功）
- 加派生字段：每个作品的 engagement_score（完播率*0.5 + (1-跳出率)*0.5）
- best_work 用干净标题 + tags
- 路径用环境变量 OPENCLAW_HOME
"""

import json
import math
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

OPENCLAW_HOME = Path(os.environ.get("OPENCLAW_HOME", "/root/.openclaw"))
WORKSPACE = OPENCLAW_HOME / "workspace"
TZ = timezone(timedelta(hours=8))


def load_jsonl(path):
    records = []
    if not path.exists():
        return records
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return records


def dedup_by_date(records):
    """同一天保留最后一条，按日期升序返回。"""
    by_date = {}
    for r in records:
        d = r.get("date")
        if d:
            by_date[d] = r  # 后者覆盖前者
    return [by_date[d] for d in sorted(by_date.keys())]


# ── 评分体系 ──────────────────────────────────────────────────────────────
#
# 设计依据：抖音 2025 公开推荐算法（预测用户各行为概率 × 行为价值权重），
# 结合"前3秒留存是门槛×乘法门控 + 完播/互动/价值/传播 分层加权"的行业共识。
# 分两套：
#   quality_score 质量分 —— 对齐抖音推流，越高代表越"合抖音口味"、越易爆。
#   value_score   价值分 —— 衡量长期价值，以收藏/评论/关注为主，播放量无关。
#                         （高价值 = 大家愿意收藏/讨论/追更的作品，哪怕不爆）


def _ratio_score(value, pass_line, great_line):
    """三段线性归一化：value 到 pass_line 得 0.5，到 great_line 得 1.0，超过封顶。"""
    if value <= 0:
        return 0.0
    if value < pass_line:
        return 0.5 * value / pass_line
    if value < great_line:
        return 0.5 + 0.5 * (value - pass_line) / (great_line - pass_line)
    return 1.0


def score_work(w):
    """给单个作品计算 quality_score / value_score / engagement_score（旧字段兼容）。

    各指标"率"统一用 ÷播放量 归一化，避免播放量大的作品天然占优。
    pass/great 线参考蝉妈妈、抖音官方专题的行业基准（见调研报告）。
    """
    plays = w.get("play_count", 0) or 0
    completion = min(max(w.get("completion_rate_5s", 0) or 0, 0), 1)  # clamp 防御异常值
    bounce = min(max(w.get("bounce_rate_2s", 0) or 0, 0), 1)          # clamp 防御异常值
    likes = w.get("likes", 0) or 0
    comments = w.get("comments", 0) or 0
    shares = w.get("shares", 0) or 0
    favorites = w.get("favorites", 0) or 0
    follower_gain = w.get("follower_gain", 0) or 0

    # —— 质量分（对齐抖音推流）——
    # 结构：前段留存做"软门控"（retention^0.5，留存差会拉低但不压扁）+ 分层加权。
    # 注：retention 不在 inner 里重复计入（避免 completion 双重加权）。
    if plays > 0:
        retention = (                                                # 前段留存分（软门控）
            0.6 * _ratio_score(completion, 0.40, 0.60) +            # 5s完播率
            0.4 * _ratio_score(1 - bounce, 0.80, 0.92)              # 1-2s跳出率（越低越好）
        )
        like_rate = likes / plays
        comment_rate = comments / plays
        fav_rate = favorites / plays
        share_rate = shares / plays
        # inner：互动权重最高（收藏/评论/点赞），传播次之，涨粉低权（多数作品涨粉=0）
        inner = (
            0.45 * (0.5 * _ratio_score(fav_rate, 0.004, 0.02) +    # 收藏率（高权重，抖音2025新规）
                    0.3 * _ratio_score(comment_rate, 0.003, 0.01) + # 评论率
                    0.2 * _ratio_score(like_rate, 0.02, 0.05)) +    # 点赞率（低权重）
            0.40 * _ratio_score(share_rate, 0.003, 0.015) +         # 转发/分享率
            0.15 * _ratio_score(follower_gain / plays, 0.0005, 0.002)  # 涨粉率
        )
        # 软门控：留存差会显著拉低（平方根让中等留存不至于压扁分数）
        quality = (retention ** 0.5) * inner
    else:
        quality = 0.0

    # —— 价值分（长期价值：收藏/评论/关注导向）——
    # 核心：收藏、评论、涨粉 是"大家觉得有用/愿意留存/愿意追更"的信号。
    # 关键防偏：纯"率"会让低播放作品虚高（播放10收藏1=10%），所以：
    #   ① 播放量<500 标记"样本不足"（value_score 置空，看板灰色显示，不参与价值排行）
    #   ② 用 Wilson 下界平滑率（惩罚小样本）+ 绝对量项（奖励规模化真实价值）
    def _wilson_lower(pos, n, z=1.0):
        """二项分布 Wilson 下界：pos=正例数(如收藏数)，n=样本数(播放量)。
        返回平滑后的率，小样本时显著低于裸率，大样本时趋近裸率。
        pos 可能 > n（如涨粉数>播放量），clamp 到 [0,1] 保证 p(1-p) 非负。"""
        if n <= 0:
            return 0.0
        p = min(max(pos / n, 0.0), 1.0)  # clamp：涨粉等可能 > 播放量
        denom = 1 + z * z / n
        center = p + z * z / (2 * n)
        spread = z * math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)
        return max(0.0, (center - spread) / denom)

    sample_sufficient = plays >= 500  # 样本门槛：播放量<500 不参与价值排行
    if plays > 0:
        # Wilson 平滑后的率（惩罚小样本虚高）
        fav_w = _wilson_lower(favorites, plays)
        comment_w = _wilson_lower(comments, plays)
        share_w = _wilson_lower(shares, plays)
        follow_w = _wilson_lower(follower_gain, plays)
        # 绝对量项：log10 归一化，奖励规模化的真实价值（千收藏远胜十收藏）
        abs_value = _ratio_score(
            math.log10((favorites + comments + follower_gain) + 1),
            1.0,   # ~10 个互动总量
            3.0,   # ~1000 个互动总量
        )
        value = (
            0.30 * _ratio_score(fav_w, 0.002, 0.015) +            # 收藏（Wilson 平滑，价值核心）
            0.20 * _ratio_score(comment_w, 0.0015, 0.008) +       # 评论（Wilson 平滑）
            0.20 * abs_value +                                     # 绝对量（规模化的真实价值）
            0.15 * _ratio_score(share_w, 0.002, 0.012) +          # 分享（Wilson 平滑）
            0.15 * _ratio_score(follow_w, 0.0003, 0.0015)         # 涨粉（Wilson 平滑）
        )
    else:
        value = 0.0

    # 旧字段兼容（原 engagement_score = 完播×0.5+(1-跳出)×0.5）
    engagement = round(completion * 0.5 + (1 - bounce) * 0.5, 4)

    return {
        **w,
        "engagement_score": engagement,
        "quality_score": round(quality, 4),       # 0~1，×100 显示
        "value_score": round(value, 4),           # 0~1，×100 显示
        "value_sufficient": sample_sufficient,    # 播放量≥500 才参与价值排行（防小样本虚高）
    }


def main():
    # 加载每日快照
    snapshot_dir = WORKSPACE / "douyin" / "data" / "daily"
    snapshots = []
    if snapshot_dir.exists():
        for f in sorted(snapshot_dir.glob("stats-*.json")):
            try:
                with open(f, encoding="utf-8") as fh:
                    snapshots.append(json.load(fh))
            except Exception as e:
                print(f"⚠️ 跳过损坏的快照 {f.name}: {e}", file=sys.stderr)

    if not snapshots:
        print("❌ 无快照数据", file=sys.stderr)
        sys.exit(1)

    latest = snapshots[-1]

    # 时间序列（用于趋势 + 增量；去重避免同一天多次跑导致重复点）
    ts_raw = load_jsonl(WORKSPACE / "douyin" / "data" / "time_series.jsonl")
    ts_data = dedup_by_date(ts_raw)

    # 作品排行（按最新播放量）+ 加评分派生字段
    raw_works = sorted(latest.get("works", []), key=lambda w: w.get("play_count", 0), reverse=True)
    top_works = []
    for w in raw_works:
        top_works.append(score_work(w))

    # 趋势（近 30 天，基于去重后的 time_series）
    trend = [
        {
            "date": e.get("date"),
            "play": e.get("total_play", 0),
            "works": e.get("total_works", 0),
            "comments": e.get("total_comments", 0),
        }
        for e in ts_data[-30:]
    ]

    # 增量：基于去重后的 time_series 倒数第二条（而不是快照倒数第二个文件）
    if len(ts_data) >= 2:
        prev_play = ts_data[-2].get("total_play", 0)
        prev_comments = ts_data[-2].get("total_comments", 0)
    else:
        prev_play = latest.get("total_play", 0)
        prev_comments = latest.get("total_comments", 0)
    play_delta = latest.get("total_play", 0) - prev_play
    comment_delta = latest.get("total_comments", 0) - prev_comments

    # 平均完播率/跳出率（跨所有作品，按播放量加权）
    total_play = sum(w.get("play_count", 0) for w in top_works)
    if total_play > 0:
        avg_completion = sum(w.get("completion_rate_5s", 0) * w.get("play_count", 0) for w in top_works) / total_play
        avg_bounce = sum(w.get("bounce_rate_2s", 0) * w.get("play_count", 0) for w in top_works) / total_play
    else:
        avg_completion = 0
        avg_bounce = 0

    # 最佳作品（用干净标题）
    best = top_works[0] if top_works else None

    output = {
        "generated_at": datetime.now(TZ).isoformat(),
        "overview": {
            "total_play": latest.get("total_play", 0),
            "total_works": latest.get("total_works", 0),
            "total_comments": latest.get("total_comments", 0),
            "play_delta": play_delta,
            "comment_delta": comment_delta,
            "avg_completion_rate_5s": round(avg_completion, 4),
            "avg_bounce_rate_2s": round(avg_bounce, 4),
            "best_work": {
                "title": best["title"] if best else "",
                "tags": best.get("tags", []) if best else [],
                "play_count": best["play_count"] if best else 0,
            }
            if best
            else None,
            "last_updated": latest.get("date"),
            "snapshot_count": len(snapshots),
        },
        "top_works": top_works[:10],
        "all_works": top_works,  # 全部作品（含双评分），供看板完整展示——含高价值低播放作品
        "trend": trend,
        "all_snapshots": [s["date"] for s in snapshots],
    }

    out_path = WORKSPACE / "lyzbcy.github.io" / "_data" / "douyin.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    delta_str = f"+{play_delta}" if play_delta >= 0 else str(play_delta)
    print(f"✅ 已生成 {out_path}")
    print(f"   {len(top_works)} 作品 | 总播放 {latest.get('total_play', 0)} | {delta_str} 日增")
    print(f"   趋势点数: {len(trend)} | 平均完播率: {round(avg_completion * 100, 1)}%")


if __name__ == "__main__":
    main()
