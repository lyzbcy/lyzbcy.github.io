#!/usr/bin/env python3
"""
聚合营养数据生成 Jekyll _data/nutrition.json

数据来源:
  - nutrition/YYYY-MM-DD.json    # 每日饮食记录
  - nutrition/config.json        # 目标配置
  - fitness/records.jsonl        # 体重记录 + 训练消耗联动

产出:
  - lyzbcy.github.io/_data/nutrition.json
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from collections import defaultdict

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NUTRITION_DIR = os.path.join(WORKSPACE, "nutrition")
FITNESS_DIR = os.path.join(WORKSPACE, "fitness")
OUTPUT_DIR = os.path.join(WORKSPACE, "lyzbcy.github.io", "_data")

def parse_date(s):
    return datetime.fromisoformat(s).date() if isinstance(s, str) else s

def estimate_calorie_burn(records_jsonl_path):
    """
    从健身记录中估算每日训练消耗。
    基于训练量（weight × reps）和动作的 MET 值粗略估算。
    简化版：中强度力量训练 ~ 6 METs，高强度 ~ 8 METs
    """
    if not os.path.exists(records_jsonl_path):
        return {}

    sets_by_date = defaultdict(list)
    with open(records_jsonl_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except:
                continue
            if r.get("action") == "set" and r.get("date"):
                sets_by_date[r["date"]].append(r)

    daily_burn = {}
    for date_str, sets in sets_by_date.items():
        total_volume = sum(s.get("weight", 0) * s.get("reps", 0) for s in sets)
        # 粗略估算：每 1000kg 训练量 ≈ 50-80 kcal 消耗（含 EPOC）
        # 基础代谢约 5 kcal/min，训练 45-60 min
        set_count = len(sets)
        if set_count < 5:
            continue  # 热身/少量，不计入

        # 训练时长估算：每组 ~2min（含休息）
        estimated_min = set_count * 2.5
        # 中等强度力量训练：~7 kcal/min
        cal_burn = round(estimated_min * 7)

        daily_burn[date_str] = {
            "total_volume": round(total_volume, 1),
            "sets": set_count,
            "estimated_min": round(estimated_min),
            "calories_burned": cal_burn
        }

    return daily_burn


def get_bodyweight_history(records_jsonl_path):
    """从健身记录提取体重历史"""
    if not os.path.exists(records_jsonl_path):
        return []

    weights = []
    with open(records_jsonl_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except:
                continue
            if r.get("action") == "bodyweight" and r.get("date"):
                weights.append({
                    "date": r["date"],
                    "weight": r.get("value", 0),
                    "unit": r.get("unit", "kg")
                })

    # 去重：同一天保留最后一条
    seen = {}
    for w in weights:
        seen[w["date"]] = w

    return sorted(seen.values(), key=lambda x: x["date"])


def get_bodyfat_history(nutrition_dir):
    """从营养配置或数据中获取体脂率历史"""
    # 尝试从 nutrition/config.json 读体脂配置
    bodyfat_config_path = os.path.join(nutrition_dir, "config.json")
    bodyfat_records = []

    if os.path.exists(bodyfat_config_path):
        try:
            with open(bodyfat_config_path) as f:
                config = json.load(f)
            if "bodyfatHistory" in config:
                for entry in config["bodyfatHistory"]:
                    bf = {
                        "date": entry["date"],
                        "bodyfat_pct": entry.get("bodyfat_pct", entry.get("bodyfat_consensus", 0)),
                        "bodyfat_consensus": entry.get("bodyfat_consensus"),
                        "note": entry.get("note", "")
                    }
                    # 维度数据（非身高）
                    if "neck" in entry:
                        bf["neck"] = entry["neck"]
                    if "waist" in entry:
                        bf["waist"] = entry["waist"]
                    if "hip" in entry:
                        bf["hip"] = entry["hip"]
                    if "weight" in entry:
                        bf["weight"] = entry["weight"]
                    if "bmi" in entry:
                        bf["bmi"] = entry["bmi"]
                    if "whr" in entry:
                        bf["whr"] = entry["whr"]
                    if "whtr" in entry:
                        bf["whtr"] = entry["whtr"]
                    # 多公式详情
                    if "formulas" in entry:
                        bf["formulas"] = entry["formulas"]
                    bodyfat_records.append(bf)
        except:
            pass

    return sorted(bodyfat_records, key=lambda x: x["date"])


def load_daily_nutrition(nutrition_dir):
    """加载所有日期的营养数据"""
    if not os.path.isdir(nutrition_dir):
        return {}, {}

    daily_data = {}

    # goals 来源优先级：config.json > 任意日期文件里的 goal > 默认值
    # （之前是"碰运气取第一个遍历到的文件"，依赖 listdir 顺序，不稳定）
    goals_from_config = None
    config_path = os.path.join(nutrition_dir, "config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path) as f:
                config = json.load(f)
            goals_from_config = {
                "calories": config.get("dailyCalorieTarget", 1800),
                "water": config.get("dailyWaterGoal", 2000),
                "protein": config.get("proteinTarget", 120)
            }
        except Exception:
            pass

    goals_from_day = None
    for fname in os.listdir(nutrition_dir):
        if fname.endswith(".json") and fname.startswith("20"):
            fpath = os.path.join(nutrition_dir, fname)
            try:
                with open(fpath) as f:
                    data = json.load(f)
                date_str = data.get("date", fname.replace(".json", ""))
                daily_data[date_str] = data
                if goals_from_day is None:
                    goals_from_day = data.get("goal", None)
            except Exception:
                continue

    goals = goals_from_config or goals_from_day or {"calories": 1800, "water": 2000, "protein": 120}

    return daily_data, goals


def aggregate_daily_summaries(daily_data, calorie_burn, goals):
    """
    构建每日营养摘要列表。
    汇总热量 / 碳水 / 蛋白 / 脂肪 / 饮水。
    联动健身消耗，算出净热量。
    """
    summaries = []

    for date_str in sorted(daily_data.keys()):
        data = daily_data[date_str]
        summary = data.get("summary", {})

        total_calories = summary.get("totalCalories", 0)
        total_carbs = summary.get("totalCarbs", 0)
        total_protein = summary.get("totalProtein", 0)
        total_fat = summary.get("totalFat", 0)
        total_water = summary.get("totalWater", 0)

        # 任一宏量指标缺失时，从 meals 逐项重新累加（避免部分缺失被忽略）
        if (total_calories == 0 or total_carbs == 0 or total_protein == 0 or total_fat == 0) and "meals" in data:
            recalc_cal = sum(m.get("totalCalories", 0) for m in data["meals"])
            recalc_carbs = sum(m.get("totalCarbs", 0) for m in data["meals"])
            recalc_prot = sum(m.get("totalProtein", 0) for m in data["meals"])
            recalc_fat = sum(m.get("totalFat", 0) for m in data["meals"])
            # 只在原值为 0 时用回算值填补，保留已有的非零值
            if total_calories == 0:
                total_calories = recalc_cal
            if total_carbs == 0:
                total_carbs = recalc_carbs
            if total_protein == 0:
                total_protein = recalc_prot
            if total_fat == 0:
                total_fat = recalc_fat
        # 饮水量缺失时从 water 记录重算
        if total_water == 0:
            total_water = sum(w.get("volume", 0) for w in data.get("water", []))

        # 补充剂统计
        supplements = data.get("supplements", [])
        supp_count = len(supplements)
        supp_creatine = any("肌酸" in s.get("beverage", "") or "肌酸" in s.get("note", "")
                            for s in supplements)
        supp_protein = any("蛋白粉" in s.get("beverage", "") or "蛋白粉" in s.get("note", "")
                           for s in supplements)

        # 餐次数量
        meal_count = len(data.get("meals", []))
        water_entries = len(data.get("water", []))

        # 联动健身消耗
        fitness = calorie_burn.get(date_str, None)

        # 净热量 = 摄入 - 运动消耗
        net_calories = total_calories - (fitness["calories_burned"] if fitness else 0) if total_calories > 0 else 0

        # 达标率（有数据且有目标时才计算）
        calorie_pct = round(total_calories * 100.0 / goals["calories"], 1) if total_calories > 0 else 0
        protein_pct = round(total_protein * 100.0 / goals["protein"], 1) if total_protein > 0 else 0
        water_pct = round(total_water * 100.0 / goals["water"], 1) if total_water > 0 else 0

        entry = {
            "date": date_str,
            "total_calories": total_calories,
            "total_carbs": total_carbs,
            "total_protein": total_protein,
            "total_fat": total_fat,
            "total_water": total_water,
            "net_calories": round(net_calories),
            "meal_count": meal_count,
            "water_entries": water_entries,
            "supplements": {
                "count": supp_count,
                "has_creatine": supp_creatine,
                "has_protein": supp_protein
            },
            "calorie_pct": max(calorie_pct, 0),
            "protein_pct": max(protein_pct, 0),
            "water_pct": max(water_pct, 0),
            "has_data": total_calories > 0 or total_water > 0
        }

        if fitness:
            entry["fitness"] = fitness

        summaries.append(entry)

    return summaries


def compute_stats(summaries, goals, calorie_burn):
    """计算整体统计"""
    if not summaries:
        return {
            "recorded_days": 0,
            "date_range": {"first": None, "last": None},
            "avg_calories": 0,
            "avg_protein": 0,
            "avg_water": 0,
            "avg_carbs": 0,
            "avg_fat": 0,
            "total_training_calories": 0,
            "training_days": 0,
            "compliance": {"calorie": 0, "protein": 0, "water": 0}
        }

    days_with_data = [s for s in summaries if s["has_data"]]
    recorded_days = len(days_with_data)

    if recorded_days == 0:
        return {
            "recorded_days": 0,
            "date_range": {"first": None, "last": None},
            "avg_calories": 0,
            "avg_protein": 0,
            "avg_water": 0,
            "avg_carbs": 0,
            "avg_fat": 0,
            "total_training_calories": 0,
            "training_days": 0,
            "compliance": {"calorie": 0, "protein": 0, "water": 0}
        }

    calorie_days = [s for s in days_with_data if s["total_calories"] > 0]
    water_days = [s for s in days_with_data if s["total_water"] > 0]

    avg_calories = round(sum(s["total_calories"] for s in calorie_days) / len(calorie_days)) if calorie_days else 0
    avg_protein = round(sum(s["total_protein"] for s in calorie_days) / len(calorie_days)) if calorie_days else 0
    avg_water = round(sum(s["total_water"] for s in water_days) / len(water_days)) if water_days else 0
    avg_carbs = round(sum(s["total_carbs"] for s in calorie_days) / len(calorie_days)) if calorie_days else 0
    avg_fat = round(sum(s["total_fat"] for s in calorie_days) / len(calorie_days)) if calorie_days else 0

    # 达标率：所有有记录的天中，热量/蛋白/饮水分别达标的天数占比
    if calorie_days:
        calorie_comply = sum(1 for s in calorie_days if s["total_calories"] >= goals["calories"] * 0.8)
        protein_comply = sum(1 for s in calorie_days if s["total_protein"] >= goals["protein"] * 0.8)
        # water 达标率用真正有饮水记录的天数做分母，与 avg_water 口径一致
        water_comply = sum(1 for s in water_days if s["total_water"] >= goals["water"] * 0.8)
        compliance = {
            "calorie": round(calorie_comply * 100.0 / len(calorie_days)),
            "protein": round(protein_comply * 100.0 / len(calorie_days)),
            "water": round(water_comply * 100.0 / len(water_days)) if water_days else 0
        }
    else:
        compliance = {"calorie": 0, "protein": 0, "water": 0}

    # 训练消耗汇总
    training_days = len([d for d in calorie_burn.values() if d["calories_burned"] > 0])
    total_training_calories = sum(d["calories_burned"] for d in calorie_burn.values())

    return {
        "recorded_days": recorded_days,
        "date_range": {
            "first": days_with_data[0]["date"],
            "last": days_with_data[-1]["date"]
        },
        "avg_calories": avg_calories,
        "avg_protein": avg_protein,
        "avg_water": avg_water,
        "avg_carbs": avg_carbs,
        "avg_fat": avg_fat,
        "total_training_calories": total_training_calories,
        "training_days": training_days,
        "compliance": compliance
    }


def compute_macros_comparison(summaries, goals):
    """
    计算近 7 天宏量营养素平均分布，用于饼图/堆叠条。
    返回百分比形式: carbs_pct, protein_pct, fat_pct
    """
    today = datetime.now().date()
    recent = [s for s in summaries
              if s["has_data"]
              and s["total_calories"] > 0
              and (today - parse_date(s["date"])).days <= 6]

    if not recent:
        return {"carbs_pct": 0, "protein_pct": 0, "fat_pct": 0, "total_cal": 0}

    total_carbs = sum(s["total_carbs"] for s in recent)
    total_protein = sum(s["total_protein"] for s in recent)
    total_fat = sum(s["total_fat"] for s in recent)
    total_cal = total_carbs * 4 + total_protein * 4 + total_fat * 9

    if total_cal == 0:
        return {"carbs_pct": 0, "protein_pct": 0, "fat_pct": 0, "total_cal": 0}

    carbs_pct = round(total_carbs * 4 * 100.0 / total_cal)
    protein_pct = round(total_protein * 4 * 100.0 / total_cal)
    fat_pct = round(100 - carbs_pct - protein_pct)

    return {
        "carbs_pct": carbs_pct,
        "protein_pct": protein_pct,
        "fat_pct": fat_pct,
        "total_cal": round(total_cal / len(recent))
    }


def get_recent_trend(summaries, days=14):
    """获取最近 N 天的趋势数据（用于看板图表）"""
    today = datetime.now().date()
    week_ago = today - timedelta(days=days - 1)

    trend = []
    for s in summaries:
        try:
            d = parse_date(s["date"])
        except:
            continue
        if d < week_ago:
            continue
        trend.append({
            "date": s["date"],
            "calories": s["total_calories"],
            "protein": s["total_protein"],
            "carbs": s["total_carbs"],
            "fat": s["total_fat"],
            "water": s["total_water"],
            "net_calories": s["net_calories"],
            "has_fitness": "fitness" in s
        })

    return trend


def main():
    # 1. 加载营养数据
    daily_data, goals = load_daily_nutrition(NUTRITION_DIR)

    # 2. 健身消耗联动
    records_path = os.path.join(FITNESS_DIR, "records.jsonl")
    calorie_burn = estimate_calorie_burn(records_path)

    # 3. 体重历史
    bodyweight = get_bodyweight_history(records_path)

    # 4. 体脂历史
    bodyfat = get_bodyfat_history(NUTRITION_DIR)

    # 5. 汇总每日摘要
    summaries = aggregate_daily_summaries(daily_data, calorie_burn, goals)
    stats = compute_stats(summaries, goals, calorie_burn)

    # 6. 近 14 天趋势
    trend = get_recent_trend(summaries)

    # 7. 宏量营养素近 7 天分布
    macros_dist = compute_macros_comparison(summaries, goals)

    # 8. 查找最近体重
    latest_weight = bodyweight[-1] if bodyweight else None
    # 计算减脂进度
    if bodyweight and len(bodyweight) >= 2:
        first_w = bodyweight[0]["weight"]
        last_w = bodyweight[-1]["weight"]
        weight_change = round(last_w - first_w, 1)
    else:
        weight_change = 0

    # 9. 检查数据完整性
    today_str = datetime.now().strftime("%Y-%m-%d")
    has_today = any(s["date"] == today_str and s["has_data"] for s in summaries)
    has_yesterday = any(
        s["date"] == (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        and s["has_data"]
        for s in summaries
    )

    # 10. 食物库（从 food.db 读取）
    food_library = []
    try:
        food_db_path = os.path.join(WORKSPACE, "skills", "lyzbcy-nutrition-tracker", "data", "food.db")
        if os.path.exists(food_db_path):
            import sqlite3 as _sql
            _conn = _sql.connect(food_db_path)
            _c = _conn.cursor()
            _c.execute("SELECT name, per_unit, calories, carbs, protein, fat, category FROM foods ORDER BY category, name")
            food_library = [{"name": r[0], "unit": r[1], "calories": r[2], "carbs": r[3],
                            "protein": r[4], "fat": r[5], "category": r[6]} for r in _c.fetchall()]
            _conn.close()
    except Exception:
        pass  # 食物库不可用不影响主流程


    # 11. 组装输出
    output = {
        "generated_at": datetime.now(timezone(timedelta(hours=8))).isoformat(),
        "goals": goals,
        "overview": stats,
        "weight": {
            "latest": latest_weight,
            "change": weight_change,
            "history": bodyweight
        },
        "bodyfat": {
            "history": bodyfat
        },
        "macros": macros_dist,
        "trend": trend,
        "summaries": summaries,
        "food_library": food_library,
        "status": {
            "has_today": has_today,
            "has_yesterday": has_yesterday,
            "today": today_str,
            "is_active": has_today or has_yesterday
        }
    }

    # 健康得分联动
    try:
        sys.path.insert(0, os.path.join(WORKSPACE, "skills", "lyzbcy-nutrition-tracker", "scripts"))
        from health_score import compute_score, save_score
        _hs = compute_score(datetime.now().strftime("%Y-%m-%d"))
        save_score(_hs)
        output["health_score"] = _hs
    except Exception:
        output["health_score"] = None

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "nutrition.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✅ 已生成 {out_path}")
    print(f"   {stats['recorded_days']} 天记录 | "
          f"平均 {stats['avg_calories']}/{goals.get('calories','?')} kcal | "
          f"饮水 {stats['avg_water']}/{goals.get('water','?')} ml")
    if bodyweight:
        print(f"   体重: {latest_weight['weight']}kg | 变化: {weight_change}kg")
    if bodyfat:
        latest_bf = bodyfat[-1]
        print(f"   体脂: {latest_bf['bodyfat_pct']}% ({latest_bf['date']})")


if __name__ == "__main__":
    main()
