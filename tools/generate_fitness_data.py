#!/usr/bin/env python3
"""聚合健身数据生成 Jekyll _data/fitness.json"""

import json
import os
from datetime import datetime, timedelta
from collections import defaultdict

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_jsonl(path):
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records

def parse_date(s):
    return datetime.fromisoformat(s).date() if isinstance(s, str) else s

def main():
    # 加载数据
    records = load_jsonl(os.path.join(WORKSPACE, "fitness", "records.jsonl"))
    with open(os.path.join(WORKSPACE, "fitness", "config.json")) as f:
        config = json.load(f)
    with open(os.path.join(WORKSPACE, "fitness", "exercises.json")) as f:
        exercises = json.load(f)

    # 筛选 set 记录
    sets = [r for r in records if r.get("action") == "set"]
    sessions_starts = [r for r in records if r.get("action") == "session_start"]
    sessions_ends = [r for r in records if r.get("action") == "session_end"]

    # 按日期分组
    sessions_by_date = {}
    for r in records:
        d = r.get("date")
        if d not in sessions_by_date:
            sessions_by_date[d] = {"start": None, "end": None, "sets": [], "split": ""}
        if r.get("action") == "session_start":
            sessions_by_date[d]["start"] = r
            sessions_by_date[d]["split"] = r.get("session", "")
        elif r.get("action") == "session_end":
            sessions_by_date[d]["end"] = r
        elif r.get("action") == "set":
            sessions_by_date[d]["sets"].append(r)

    # 每个训练日的摘要
    session_summaries = []
    for d in sorted(sessions_by_date.keys(), reverse=True):
        sess = sessions_by_date[d]
        if not sess["sets"]:
            continue
        total_sets = len(sess["sets"])
        total_volume = sum(s.get("weight", 0) * s.get("reps", 0) for s in sess["sets"])
        exercises_done = list(set(s["exercise"] for s in sess["sets"]))
        # 估算时长
        if sess["start"] and sess["end"]:
            try:
                start_ts = datetime.fromisoformat(sess["start"]["ts"].replace("Z", "+00:00")).replace(tzinfo=None)
                end_ts = datetime.fromisoformat(sess["end"]["ts"].replace("Z", "+00:00")).replace(tzinfo=None)
                duration_min = round((end_ts - start_ts).total_seconds() / 60)
            except:
                duration_min = None
        else:
            duration_min = None

        session_summaries.append({
            "date": d,
            "split": sess["split"],
            "split_label": {"push": "推日", "pull": "拉日", "legs": "腿日", "upper": "上身", "lower": "下身", "full_body": "全身", "cardio": "有氧"}.get(sess["split"], sess["split"]),
            "total_sets": total_sets,
            "total_volume": round(total_volume, 1),
            "exercises": exercises_done,
            "duration_min": duration_min,
            "note": sess["start"].get("note", "") if sess["start"] else ""
        })

    # PR 列表（从 config 提取）
    prs = []
    for muscle_group, ex_dict in config.get("personalRecords", {}).items():
        for ex_name, pr_data in ex_dict.items():
            prs.append({
                "exercise": ex_name.replace("_", " "),
                "muscle_group": muscle_group,
                "weight": pr_data.get("weight", 0),
                "reps": pr_data.get("reps", 0),
                "note": pr_data.get("note", ""),
                "volume": pr_data.get("weight", 0) * pr_data.get("reps", 0)
            })
    prs.sort(key=lambda x: x["volume"], reverse=True)

    # 训练频率统计
    all_dates = sorted(set(r["date"] for r in records if r.get("action") in ("session_start", "set")))
    if all_dates:
        first_date = parse_date(all_dates[0])
        last_date = parse_date(all_dates[-1])
        total_weeks = max(1, (last_date - first_date).days / 7)
        session_count = len(session_summaries)
        avg_per_week = round(session_count / total_weeks, 1)

        # 近4周频率
        four_weeks_ago = last_date - timedelta(days=28)
        recent_sessions = [s for s in session_summaries if parse_date(s["date"]) >= four_weeks_ago]
        recent_count = len(recent_sessions)
    else:
        avg_per_week = 0
        recent_count = 0

    # 肌肉平衡分析
    muscle_volume = defaultdict(float)
    for s in sets:
        muscle_volume[s.get("muscleGroup", "unknown")] += s.get("weight", 0) * s.get("reps", 0)

    muscle_labels = {
        "chest": "胸", "upper_chest": "上胸", "back": "背", "lats": "背阔",
        "mid_back": "中背", "shoulders": "肩前束", "lateral_delt": "肩中束",
        "rear_delt": "肩后束", "biceps": "肱二头肌", "triceps": "肱三头肌",
        "quads": "股四头肌", "hamstrings": "腘绳肌", "glutes": "臀",
        "calves": "小腿", "core": "核心", "inner_thigh": "大腿内侧",
        "forearms": "前臂", "brachioradialis": "肱桡肌"
    }

    muscle_balance = []
    for mg in sorted(muscle_volume.keys()):
        muscle_balance.append({
            "group": mg,
            "label": muscle_labels.get(mg, mg),
            "total_volume": round(muscle_volume[mg], 1)
        })
    muscle_balance.sort(key=lambda x: x["total_volume"], reverse=True)
    # 派生：各肌群占总训练量的百分比（看板堆叠条直接用，避免 Liquid 循环计算）
    total_muscle_volume = sum(m["total_volume"] for m in muscle_balance)
    for m in muscle_balance:
        m["percentage"] = round(m["total_volume"] * 100.0 / total_muscle_volume, 1) if total_muscle_volume > 0 else 0

    # 训练量趋势（周汇总）
    weekly_volume = defaultdict(float)
    weekly_sessions = defaultdict(int)
    for s in sets:
        d = parse_date(s["date"])
        # ISO week
        week_key = d.isocalendar()[:2]  # (year, week)
        weekly_volume[week_key] += s.get("weight", 0) * s.get("reps", 0)
        weekly_sessions[week_key] += 1

    volume_trend = []
    # 派生：标记本周（看板柱状图高亮用）
    today_iso = datetime.now().isocalendar()
    current_week_key = (today_iso[0], today_iso[1])
    for wk in sorted(weekly_volume.keys()):
        year, week = wk
        volume_trend.append({
            "week": f"{year}-W{week:02d}",
            "volume": round(weekly_volume[wk], 1),
            "sessions": weekly_sessions[wk],
            "is_current": wk == current_week_key,
            "is_latest": False  # 循环后回填最后一个为 True
        })

    # 回填：最后一个有数据的周标记为 is_latest（看板高亮最新数据用）
    if volume_trend:
        volume_trend[-1]["is_latest"] = True

    # 最喜欢的动作（按频次）
    exercise_freq = defaultdict(int)
    exercise_weight_max = defaultdict(float)
    exercise_volume = defaultdict(float)
    for s in sets:
        ex = s["exercise"]
        exercise_freq[ex] += 1
        exercise_weight_max[ex] = max(exercise_weight_max[ex], s.get("weight", 0))
        exercise_volume[ex] += s.get("weight", 0) * s.get("reps", 0)

    top_exercises = sorted(exercise_freq.items(), key=lambda x: x[1], reverse=True)
    # 每个动作的最新数据（最近日期、最高重量、最高次数等）
    exercise_metrics = []
    for ex, count in top_exercises:
        ex_sets = [s for s in sets if s["exercise"] == ex]
        ex_dates = sorted(set(s["date"] for s in ex_sets))
        # 最近的训练组
        last_date = ex_dates[-1] if ex_dates else None
        last_sets = [s for s in ex_sets if s["date"] == last_date] if last_date else []
        last_weight = max((s.get("weight", 0) for s in last_sets), default=0)
        last_reps = max((s.get("reps", 0) for s in last_sets), default=0)

        exercise_metrics.append({
            "name": ex,
            "total_sets": count,
            "max_weight": max((s.get("weight", 0) for s in ex_sets), default=0),
            "max_reps": max((s.get("reps", 0) for s in ex_sets), default=0),
            "last_date": last_date,
            "last_weight": last_weight,
            "last_reps": last_reps,
            "total_volume": round(exercise_volume[ex], 1)
        })

    # ── 输出 ──
    output = {
        "generated_at": datetime.now().isoformat(),
        "overview": {
            "total_sessions": session_count,
            "total_sessions_recent_4w": recent_count,
            "avg_sessions_per_week": avg_per_week,
            "total_sets": len(sets),
            "total_volume": round(sum(s.get("weight", 0) * s.get("reps", 0) for s in sets), 1),
            "date_range": {
                "first": all_dates[0] if all_dates else None,
                "last": all_dates[-1] if all_dates else None
            },
            "preferences": config.get("preferences", {}),
            # 派生：看板 KPI 卡直接用（避免 Liquid size 过滤器链）
            "muscle_groups_count": len(muscle_volume),
            "exercises_count": len(exercise_metrics)
        },
        "sessions": session_summaries,
        "personal_records": prs,
        "muscle_balance": muscle_balance,
        "volume_trend": volume_trend,
        "exercises": exercise_metrics
    }

    out_path = os.path.join(WORKSPACE, "lyzbcy.github.io", "_data", "fitness.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✅ 已生成 {out_path}")
    print(f"   {session_count} 次训练 | {len(sets)} 组 | {output['overview']['total_volume']} kg 总量")

if __name__ == "__main__":
    main()
