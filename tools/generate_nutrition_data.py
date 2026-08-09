#!/usr/bin/env python3
"""
聚合营养数据生成 Jekyll _data/nutrition.json

数据来源:
  - nutrition/YYYY-MM-DD.json    # 每日饮食记录
  - nutrition/config.json        # 目标配置
  - fitness/records.jsonl        # 体重记录 + 训练消耗联动
  - skills/.../data/food.db      # 食物营养库（含累计统计）
  - skills/.../scripts/health_score.py  # 今日健康得分

产出:
  - lyzbcy.github.io/_data/nutrition.json

v2 改造（2026-08）:
  - 训练消耗统一走 body_composition.compute_training_burn（MET×真实时长，解决三公式打架）
  - 热量目标改为动态（Mifflin BMR × 训练日/休息日），替代写死的 1800
  - 接入 health_score（看板顶部展示今日健康得分）
  - 接入 food_library（看板底部展示食物库 + 累计消费统计）
  - 低于 BMR 时标注 below_bmr（看板提示"建议多吃"）
"""

import json
import os
import sys
import sqlite3
import subprocess
from datetime import datetime, timedelta, timezone
from collections import defaultdict

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NUTRITION_DIR = os.path.join(WORKSPACE, "nutrition")
FITNESS_DIR = os.path.join(WORKSPACE, "fitness")
OUTPUT_DIR = os.path.join(WORKSPACE, "lyzbcy.github.io", "_data")

# ▼ v2: 让 body_composition 可被 import（它和 health_score 同 skill scripts 目录）
NUTRITION_SKILL_DIR = "/home/openclaw-shared/skills/lyzbcy-nutrition-tracker"
NUTRITION_SCRIPTS = os.path.join(NUTRITION_SKILL_DIR, "scripts")
FOOD_DB_PATH = os.path.join(NUTRITION_SKILL_DIR, "data", "food.db")
HEALTH_SCORE_SCRIPT = os.path.join(NUTRITION_SCRIPTS, "health_score.py")
if os.path.isdir(NUTRITION_SCRIPTS) and NUTRITION_SCRIPTS not in sys.path:
    sys.path.insert(0, NUTRITION_SCRIPTS)
try:
    import body_composition as bc
except Exception:
    bc = None  # 测试环境可能没有，退化到旧逻辑

def parse_date(s):
    return datetime.fromisoformat(s).date() if isinstance(s, str) else s


def _self_heal_permissions():
    """
    权限自愈：扫描 nutrition 目录，把所有 .json 文件权限设为 644（所有人可读）。
    防止 root 手动改文件后 owner/权限变更导致 ubuntu cron 读不了（历史 bug）。
    只动权限不动 owner——chown 需要 root 权限，ubuntu cron 跑不了，所以靠 chmod 644 让其他用户可读。
    """
    import glob
    healed = 0
    for pattern in [os.path.join(NUTRITION_DIR, "*.json"),
                    os.path.join(FITNESS_DIR, "*.jsonl"),
                    os.path.join(FITNESS_DIR, "*.json")]:
        for f in glob.glob(pattern):
            try:
                mode = os.stat(f).st_mode & 0o777
                if mode != 0o644:
                    os.chmod(f, 0o644)
                    healed += 1
            except OSError:
                pass
    return healed

def estimate_calorie_burn(records_jsonl_path, exercises_data=None, weight_kg=None):
    """
    每日训练消耗 — v2 统一走 body_composition.compute_training_burn。
    用真实 endTime 时长 + 动作类型 MET，解决旧版"组数×系数"与 health_score.py 不一致的问题。
    若 bc 模块不可用（测试环境），退化到旧逻辑。
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
            except Exception:
                continue
            if r.get("action") == "set" and r.get("date"):
                sets_by_date[r["date"]].append(r)

    daily_burn = {}
    for date_str, sets in sets_by_date.items():
        set_count = len(sets)
        total_volume = sum((s.get("weight", 0) or 0) * (s.get("reps", 0) or 0) for s in sets)

        if bc is not None and weight_kg:
            # ▼ v2 统一算法
            r = bc.compute_training_burn(sets, weight_kg, exercises_data)
            daily_burn[date_str] = {
                "total_volume": r["volume"],
                "sets": r["sets"],
                "estimated_min": r["duration_min"],     # 真实训练时长
                "active_min": r["active_min"],          # 纯动作时长（参考）
                "calories_burned": r["calories_burned"],
                "calories_net": r["calories_net"],      # 净额外消耗（供饮食净热量）
                "by_type": r["by_type"],
                "method": r["method"],
            }
        else:
            # 退化：旧逻辑（<5组跳过）
            if set_count < 5:
                continue
            estimated_min = set_count * 2.5
            cal_burn = round(estimated_min * 7)
            daily_burn[date_str] = {
                "total_volume": round(total_volume, 1),
                "sets": set_count,
                "estimated_min": round(estimated_min),
                "active_min": round(estimated_min),  # legacy 无区分，保持一致
                "calories_burned": cal_burn,
                "calories_net": cal_burn,             # legacy 不区分净消耗
                "by_type": {},                        # legacy 不分动作类型
                "method": "legacy-sets",
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
                    bodyfat_records.append({
                        "date": entry["date"],
                        "bodyfat_pct": entry["bodyfat_pct"],
                        "note": entry.get("note", "")
                    })
        except:
            pass

    return sorted(bodyfat_records, key=lambda x: x["date"])


def get_body_composition_history():
    """读 skills config.json 的 bodyMeasurementHistory, 对每条体测算 FFM/SMM/TBW.
    返回 [{date, weight, bodyfat_pct, ffm, smm, tbw}, ...] 按日期升序."""
    cfg_path = "/home/openclaw-shared/skills/lyzbcy-nutrition-tracker/config.json"
    if not os.path.exists(cfg_path):
        return []
    try:
        with open(cfg_path) as f:
            cfg = json.load(f)
    except Exception:
        return []
    height = cfg.get("height")
    history = cfg.get("bodyMeasurementHistory", [])
    if not height or not history:
        return []
    out = []
    for e in history:
        w = e.get("weight")
        bf = e.get("bodyfat_pct")
        if not w:
            continue
        ffm = bc.compute_lbm(height, w, bf) if bc else None
        smm = bc.compute_smm(height, w, 25, "male", bf) if bc else None
        tbw = bc.compute_tbw(height, w, 25, "male", ffm["avg"] if ffm else None) if bc else None
        rec = {"date": e["date"], "weight": w}
        if bf is not None:
            rec["bodyfat_pct"] = bf
        if ffm:
            rec["ffm"] = ffm
        if smm:
            rec["smm"] = smm
        if tbw:
            rec["tbw"] = tbw
        out.append(rec)
    return sorted(out, key=lambda x: x["date"])




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


def _load_exercises():
    """加载 fitness/exercises.json（动作类型/估时，喂给统一训练消耗算法）"""
    p = os.path.join(FITNESS_DIR, "exercises.json")
    if os.path.exists(p):
        try:
            with open(p, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


def _compute_dynamic_goals(cfg, latest_weight, bodyfat_pct, today_is_training, age=21):
    """
    v2 动态热量目标：基于 Mifflin BMR 算训练日/休息日目标。
    替代写死的 1800。若 bc 不可用则退化到 config 静态值。
    返回 (goals_dict, meta_dict)。goals_dict 兼容旧字段名 {calories, water, protein}。
    """
    static_cal = cfg.get("dailyCalorieTarget", 1800)
    static_water = cfg.get("dailyWaterGoal", 2000)
    static_prot = cfg.get("proteinTarget", 150)
    base_goals = {"calories": static_cal, "water": static_water, "protein": static_prot}

    if bc is None or not latest_weight:
        return base_goals, {"dynamic": False, "reason": "no body_composition or weight"}

    height = cfg.get("height") or 172.0
    try:
        height = float(height)
    except (TypeError, ValueError):
        height = 172.0

    bmr_info = bc.compute_bmr(latest_weight, height, age, bodyfat_pct=bodyfat_pct)
    bmr = bmr_info["primary"]

    target = bc.compute_calorie_target(bmr, today_is_training)
    # 训练日吃回一部分训练消耗已体现在 activity factor，这里不再额外加
    goals = {
        "calories": target["target"],
        "water": static_water,
        "protein": static_prot,
    }
    meta = {
        "dynamic": True,
        "bmr": bmr,
        "bmr_formulas": bmr_info["formulas"],
        "tdee": target["tdee"],
        "bmr_floor": target["bmr_floor"],
        "below_bmr": target["below_bmr"],
        "is_training_day": today_is_training,
        "deficit": target["deficit"],
    }
    return goals, meta


def _load_health_score():
    """调 health_score.py export 拿今日健康得分 + 14天历史"""
    if not os.path.exists(HEALTH_SCORE_SCRIPT):
        return None
    try:
        r = subprocess.run(
            ["python3", HEALTH_SCORE_SCRIPT, "export"],
            capture_output=True, text=True, timeout=30
        )
        if r.returncode == 0 and r.stdout.strip():
            return json.loads(r.stdout)
    except Exception:
        pass
    return None


def _load_food_library():
    """v2: 读 food.db 产出食物库（含累计统计 + source），供看板底部展示"""
    if not os.path.exists(FOOD_DB_PATH):
        return None
    try:
        conn = sqlite3.connect(FOOD_DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT name, brand, per_unit, calories, carbs, protein, fat, "
                  "category, ref_price, total_servings, total_grams, source "
                  "FROM foods ORDER BY category, total_servings DESC, name")
        rows = c.fetchall()
        conn.close()
        items = []
        total_servings_all = 0.0
        total_spending_all = 0.0
        for r in rows:
            srv = r["total_servings"] or 0
            price = r["ref_price"] or 0
            total_servings_all += srv
            cum_spend = round(price * srv, 2)
            total_spending_all += cum_spend
            items.append({
                "name": r["name"], "brand": r["brand"], "per_unit": r["per_unit"],
                "calories": r["calories"], "carbs": r["carbs"], "protein": r["protein"],
                "fat": r["fat"], "category": r["category"], "ref_price": r["ref_price"],
                "total_servings": round(srv, 1),
                "total_grams": round(r["total_grams"] or 0, 0),
                "cumulative_spending": cum_spend,
                "source": r["source"] or "预置",
            })
        # 按分类汇总
        by_category = {}
        for it in items:
            cat = it["category"]
            by_category.setdefault(cat, {"count": 0, "servings": 0})
            by_category[cat]["count"] += 1
            by_category[cat]["servings"] += it["total_servings"]
        return {
            "items": items,
            "total_foods": len(items),
            "total_servings": round(total_servings_all, 1),
            "total_spending": round(total_spending_all, 2),
            "by_category": {k: {"count": v["count"], "servings": round(v["servings"], 1)}
                            for k, v in by_category.items()},
        }
    except Exception as e:
        print(f"⚠️ food_library 加载失败: {e}", file=sys.stderr)
        return None


def main():
    # 0. 权限自愈（防止 root 改文件后 ubuntu cron 读不了，历史 bug）
    healed = _self_heal_permissions()
    if healed:
        print(f"🔧 权限自愈：修正了 {healed} 个文件的权限为 644", file=sys.stderr)

    # 1. 加载营养数据
    daily_data, goals = load_daily_nutrition(NUTRITION_DIR)
    cfg_path = os.path.join(NUTRITION_DIR, "config.json")
    cfg = {}
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, encoding="utf-8") as f:
                cfg = json.load(f)
        except Exception:
            pass

    # 2. 健身消耗联动（v2 统一算法：需 exercises.json + 最新体重）
    records_path = os.path.join(FITNESS_DIR, "records.jsonl")
    exercises_data = _load_exercises()
    bodyweight = get_bodyweight_history(records_path)
    latest_weight_val = bodyweight[-1]["weight"] if bodyweight else None
    today_str = datetime.now().strftime("%Y-%m-%d")
    # 判断今天是否训练日：与 health_score.py 对齐——当天 set 记录 >= 3 才算训练日
    today_set_count = 0
    if os.path.exists(records_path):
        with open(records_path) as f:
            for line in f:
                try:
                    r = json.loads(line.strip())
                    if r.get("date") == today_str and r.get("action") == "set":
                        today_set_count += 1
                except Exception:
                    continue
    today_is_training = today_set_count >= 3

    calorie_burn = estimate_calorie_burn(records_path, exercises_data, latest_weight_val)

    # 3. 体脂历史
    bodyfat = get_bodyfat_history(NUTRITION_DIR)
    body_comp_history = get_body_composition_history()
    latest_bodyfat_pct = bodyfat[-1]["bodyfat_pct"] if bodyfat else None

    # 4. ▼ v2 动态热量目标
    goals, goals_meta = _compute_dynamic_goals(
        cfg, latest_weight_val, latest_bodyfat_pct, today_is_training
    )

    # 5. 汇总每日摘要
    summaries = aggregate_daily_summaries(daily_data, calorie_burn, goals)
    stats = compute_stats(summaries, goals, calorie_burn)

    # 6. 近 14 天趋势
    trend = get_recent_trend(summaries)

    # 7. 宏量营养素近 7 天分布
    macros_dist = compute_macros_comparison(summaries, goals)

    # 8. 计算减脂进度
    if bodyweight and len(bodyweight) >= 2:
        first_w = bodyweight[0]["weight"]
        last_w = bodyweight[-1]["weight"]
        weight_change = round(last_w - first_w, 1)
    else:
        weight_change = 0

    # 9. 检查数据完整性
    has_today = any(s["date"] == today_str and s["has_data"] for s in summaries)
    has_yesterday = any(
        s["date"] == (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        and s["has_data"]
        for s in summaries
    )

    # 10. ▼ v2 接入健康得分
    health_score = _load_health_score()

    # 11. ▼ v2 接入食物库
    food_library = _load_food_library()

    # 12. 组装输出
    latest_weight = bodyweight[-1] if bodyweight else None
    output = {
        "generated_at": datetime.now(timezone(timedelta(hours=8))).isoformat(),
        "goals": goals,
        "goals_meta": goals_meta,
        "overview": stats,
        "weight": {
            "latest": latest_weight,
            "change": weight_change,
            "history": bodyweight
        },
        "bodyfat": {
            "history": bodyfat
        },
        "body_composition": {
            "history": body_comp_history,
            "latest": body_comp_history[-1] if body_comp_history else None
        },
        "macros": macros_dist,
        "trend": trend,
        "summaries": summaries,
        "status": {
            "has_today": has_today,
            "has_yesterday": has_yesterday,
            "today": today_str,
            "is_active": has_today or has_yesterday,
            "is_training_day": today_is_training,
        },
        "health_score": health_score,       # ▼ v2
        "food_library": food_library,       # ▼ v2
    }

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
    if goals_meta.get("dynamic"):
        print(f"   🎯 动态目标: {goals['calories']} kcal "
              f"(BMR {goals_meta['bmr']} | {'训练日' if goals_meta['is_training_day'] else '休息日'}"
              f"{' ⚠️低于基础代谢' if goals_meta.get('below_bmr') else ''})")
    if health_score:
        print(f"   📊 健康得分: {health_score['today']['total_score']}/100 {health_score['today']['grade']}")
    if food_library:
        print(f"   🥗 食物库: {food_library['total_foods']} 种 | 累计 {food_library['total_servings']} 份")


if __name__ == "__main__":
    main()
