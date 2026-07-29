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

    # 作品排行（按最新播放量）+ 加 engagement_score 派生字段
    raw_works = sorted(latest.get("works", []), key=lambda w: w.get("play_count", 0), reverse=True)
    top_works = []
    for w in raw_works:
        completion = w.get("completion_rate_5s", 0)
        bounce = w.get("bounce_rate_2s", 0)
        engagement = round(completion * 0.5 + (1 - bounce) * 0.5, 4)
        # 复制一份避免改原数据
        top_works.append({**w, "engagement_score": engagement})

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
