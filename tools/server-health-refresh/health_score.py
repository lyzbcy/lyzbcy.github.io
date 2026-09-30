#!/usr/bin/env python3
"""
lyzbcy-nutrition-tracker / 健康得分引擎

综合评分维度（满分100）：
  营养子分(50):
    - 热量控制(20): 摄入/目标比值，越接近1越好
    - 蛋白质达标(15): 蛋白/目标比值
    - 饮水达标(15): 饮水/目标比值
  运动子分(30):
    - 训练消耗(20): 总训练量千kg + 热量消耗
    - 训练组数(10): 组数分档
  额外(20):
    - 数据完整性(10): 今天有没有记录
    - 体脂趋势(10): 体脂率变化方向

存储: data/health_scores.db (SQLite)
互操作: starbudding-study-tracker 可跨库读取
"""

import sqlite3, json, os, sys, math
from contextlib import closing
from datetime import datetime, date, timedelta
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = Path(__file__).resolve().parent
DB_PATH = SKILL_DIR / "data" / "health_scores.db"

# 跨库共享位置
SHARED_DB = Path("/home/openclaw-shared/health_scores.db")

# ▼ v2: 接入统一算法模块
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
try:
    import body_composition as bc
except Exception:
    bc = None

FITNESS_DIR = "/home/openclaw-shared/fitness"
RECORDS_PATH = os.path.join(FITNESS_DIR, "records.jsonl")
EXERCISES_PATH = os.path.join(FITNESS_DIR, "exercises.json")

def now_date():
    return datetime.now().strftime("%Y-%m-%d")

def normalize_date(value=None):
    value = now_date() if value is None else value
    if not isinstance(value, str) or date.fromisoformat(value).isoformat() != value:
        raise ValueError("date must be YYYY-MM-DD")
    return value

def _ensure_schema(conn):
    c = conn.cursor()
    # 迁移：为已有的表添加 is_training_day 列
    try:
        c.execute("ALTER TABLE health_scores ADD COLUMN is_training_day INTEGER DEFAULT 0")
    except Exception:
        pass  # 列已存在
    c.execute("""
        CREATE TABLE IF NOT EXISTS health_scores (
            date        TEXT PRIMARY KEY,
            user        TEXT NOT NULL DEFAULT 'lyzbcy',
            nutrition_score   INTEGER DEFAULT 0,
            nutrition_detail  TEXT,
            exercise_score    INTEGER DEFAULT 0,
            exercise_detail   TEXT,
            bonus_score       INTEGER DEFAULT 0,
            bonus_detail      TEXT,
            total_score       INTEGER DEFAULT 0,
            grade             TEXT,
            calories_in       REAL DEFAULT 0,
            calories_target   REAL DEFAULT 0,
            protein_in        REAL DEFAULT 0,
            protein_target    REAL DEFAULT 0,
            water_in          REAL DEFAULT 0,
            water_target      REAL DEFAULT 0,
            training_sets     INTEGER DEFAULT 0,
            training_volume   REAL DEFAULT 0,     -- kg total
            training_cal      REAL DEFAULT 0,
            is_training_day   INTEGER DEFAULT 0,
            bodyfat_pct       REAL,
            updated_at        TEXT
        )
    """)
    c.execute("DELETE FROM health_scores WHERE date IS NULL OR date = '' OR length(date) != 10 OR date NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'")
    for operation in ("INSERT", "UPDATE"):
        c.execute(f"""CREATE TRIGGER IF NOT EXISTS health_date_{operation.lower()}
            BEFORE {operation} ON health_scores
            WHEN NEW.date IS NULL OR length(NEW.date) != 10
              OR NEW.date NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
            BEGIN SELECT RAISE(ABORT, 'valid health score date required'); END""")
    conn.commit()

def load_nutrition_data(date_str):
    """加载指定日期的营养数据"""
    fpath = Path("/home/openclaw-shared/nutrition") / f"{date_str}.json"
    if not fpath.exists():
        return None
    with open(fpath) as f:
        return json.load(f)

def load_config():
    fpath = Path("/home/openclaw-shared/nutrition/config.json")
    if fpath.exists():
        with open(fpath) as f:
            return json.load(f)
    return {}

def load_fitness_data(date_str):
    """从 records.jsonl 提取当日训练数据。v2: 训练消耗走统一算法 bc.compute_training_burn"""
    fpath = Path(RECORDS_PATH)
    if not fpath.exists():
        return {"sets": 0, "volume": 0, "exercises": 0, "cal_burned": 0, "duration_min": 0}

    sets = []
    for line in fpath.read_text().splitlines():
        if not line.strip():
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        if r.get("date") == date_str and r.get("action") == "set":
            sets.append(r)

    volume = sum((s.get("weight", 0) or 0) * (s.get("reps", 0) or 0) for s in sets)
    exercises = len(set(s.get("exercise", "") for s in sets))

    # ▼ v2 统一训练消耗算法
    cal_burned = 0
    duration_min = 0
    if sets and bc is not None:
        # 取最近体重用于 MET 计算
        weight_kg = bc.load_latest_bodyweight(RECORDS_PATH, date_str)
        ex_data = None
        if os.path.exists(EXERCISES_PATH):
            try:
                with open(EXERCISES_PATH) as f:
                    ex_data = json.load(f)
            except Exception:
                pass
        if weight_kg:
            burn = bc.compute_training_burn(sets, weight_kg, ex_data)
            cal_burned = burn["calories_burned"]
            duration_min = burn["duration_min"]

    return {
        "sets": len(sets),
        "volume": round(volume, 1),
        "exercises": exercises,
        "cal_burned": cal_burned,        # ▼ v2 统一算法（原为 len(sets)*2.5*7）
        "duration_min": duration_min,    # ▼ v2 真实训练时长
    }

def load_bodyfat(date_str):
    """获取最近体脂率"""
    cfg = load_config()
    history = cfg.get("bodyfatHistory", [])
    history = [h for h in history if h.get("date", "") <= date_str]
    if history:
        return max(history, key=lambda h: h["date"]).get("bodyfat_pct")
    return None

def compute_score(date_str):
    """计算指定日期健康得分，返回 dict。v2: 热量目标走统一动态算法"""
    date_str = normalize_date(date_str)
    nutrition = load_nutrition_data(date_str)
    cfg = load_config()
    fitness = load_fitness_data(date_str)
    bodyfat = load_bodyfat(date_str)
    if not nutrition and not fitness["sets"]:
        return None

    # ▼ v2 动态热量目标：优先用 body_composition 算 BMR + 训练日/休息日
    is_training = fitness["sets"] >= 3
    prot_target = cfg.get("proteinTarget", 150)
    water_target = cfg.get("dailyWaterGoal", 2000)
    bmr_floor = None
    below_bmr = False

    if bc is not None:
        weight_kg = bc.load_latest_bodyweight(RECORDS_PATH, date_str)
        height = cfg.get("height") or 172.0
        try:
            height = float(height)
        except (TypeError, ValueError):
            height = 172.0
        if weight_kg:
            bmr_info = bc.compute_bmr(weight_kg, height, 21, bodyfat_pct=bodyfat)
            target_info = bc.compute_calorie_target(bmr_info["primary"], is_training)
            cal_target = target_info["target"]
            bmr_floor = target_info["bmr_floor"]
            below_bmr = target_info["below_bmr"]
        else:
            # 无体重，退化到 config 静态
            cal_target = cfg.get("dailyCalorieTarget", 1800)
    else:
        dyn = cfg.get("dailyCalorieTarget_dynamic", {})
        cal_target = dyn.get("training_day" if is_training else "rest_day",
                             cfg.get("dailyCalorieTarget", 1800))

    # ── 营养子分 (50) ──
    nutri_score = 0
    nutri_parts = []

    if nutrition:
        summary = nutrition.get("summary", {})
        cals_in = summary.get("calories") or summary.get("totalCalories", 0)
        prot_in = summary.get("protein") or summary.get("totalProtein", 0)
        water_in = summary.get("totalWater") or summary.get("water", 0)
    else:
        cals_in = 0
        prot_in = 0
        water_in = 0

    # 热量 (20): 比值 0.9-1.1 得满分，偏离扣分
    if cals_in > 0:
        ratio = cals_in / cal_target if cal_target > 0 else 1
        if 0.85 <= ratio <= 1.05:
            cal_score = 20
        elif 0.7 <= ratio <= 1.2:
            cal_score = round(20 - abs(ratio - 1) * 40)
        else:
            cal_score = max(0, round(20 - abs(ratio - 1) * 30))
    else:
        cal_score = 0
    nutri_score += cal_score
    nutri_parts.append(f"热量 {cals_in}/{cal_target} kcal ({cal_score}/20)")

    # 蛋白 (15)
    if prot_in > 0:
        p_ratio = prot_in / prot_target
        prot_score = min(15, round(p_ratio * 15))
    else:
        prot_score = 0
    nutri_score += prot_score
    nutri_parts.append(f"蛋白 {prot_in}/{prot_target}g ({prot_score}/15)")

    # 饮水 (15)
    if water_in > 0:
        w_ratio = water_in / water_target
        water_score = min(15, round(w_ratio * 15))
    else:
        water_score = 0
    nutri_score += water_score
    nutri_parts.append(f"饮水 {water_in}/{water_target}ml ({water_score}/15)")

    # ── 运动子分 (30) ──
    exer_score = 0
    exer_parts = []

    # 训练量 (20): 基于总训练量千kg + 组数
    if fitness["sets"] >= 3:
        vol_kg = fitness["volume"]
        sets = fitness["sets"]
        # 训练量评分: 5k kg=10分, 10k kg=15分, 15k+=20分
        vol_ratio = vol_kg / 1000  # 千kg
        vol_score = min(20, round(vol_ratio * 5))
        exer_parts.append(f"训练量 {vol_kg:.0f}kg ({vol_score}/20)")
        exer_score += vol_score
    else:
        exer_parts.append("今日无训练 (0/20)")

    # 组数/多样性 (10)
    if fitness["sets"] >= 8:
        set_score = 10
    elif fitness["sets"] >= 5:
        set_score = 7
    elif fitness["sets"] >= 3:
        set_score = 4
    else:
        set_score = 0
    exer_score += set_score
    exer_parts.append(f"组数 {fitness['sets']} ({set_score}/10)")

    # ── 加分项 (20) ──
    bonus_score = 0
    bonus_parts = []

    # 数据完整性 (10)
    completeness = 0
    if cals_in > 0: completeness += 5
    if water_in >= 500: completeness += 3
    if fitness["sets"] >= 3: completeness += 2
    bonus_score += completeness
    bonus_parts.append(f"数据完整性 ({completeness}/10)")

    # 体脂趋势 (10) — 跟上周/上个月比
    if bodyfat is not None:
        bf_history = [h for h in cfg.get("bodyfatHistory", []) if h.get("date", "") <= date_str]
        if len(bf_history) >= 2:
            bf_sorted = sorted(bf_history, key=lambda x: x["date"])
            oldest = bf_sorted[0]["bodyfat_pct"]
            trend = bodyfat - oldest
            if trend < -2: bf_trend_score = 10
            elif trend < -1: bf_trend_score = 7
            elif trend < 0: bf_trend_score = 5
            elif trend == 0: bf_trend_score = 3
            else: bf_trend_score = 0
            bonus_parts.append(f"体脂趋势 {trend:+.1f}% ({bf_trend_score}/10)")
        else:
            bf_trend_score = 3
            bonus_parts.append(f"体脂 {bodyfat}%（历史不足2次）({bf_trend_score}/10)")
        bonus_score += bf_trend_score
    else:
        bonus_parts.append("无体脂数据 (0/10)")

    # ── 汇总 ──
    total = nutri_score + exer_score + bonus_score

    if total >= 85: grade = "🌟 S"
    elif total >= 70: grade = "😊 A"
    elif total >= 55: grade = "😐 B"
    elif total >= 35: grade = "⚠️ C"
    else: grade = "💀 D"

    return {
        "date": date_str,
        "nutrition_score": nutri_score,
        "nutrition_detail": "; ".join(nutri_parts),
        "exercise_score": exer_score,
        "exercise_detail": "; ".join(exer_parts),
        "bonus_score": bonus_score,
        "bonus_detail": "; ".join(bonus_parts),
        "total_score": total,
        "grade": grade,
        "calories_in": cals_in,
        "calories_target": cal_target,
        "protein_in": prot_in,
        "protein_target": prot_target,
        "water_in": water_in,
        "water_target": water_target,
        "training_sets": fitness["sets"],
        "training_volume": fitness["volume"],
        "training_cal": fitness["cal_burned"],
        "training_duration_min": fitness.get("duration_min", 0),  # ▼ v2 真实时长
        "bodyfat_pct": bodyfat,
        "is_training_day": is_training,
        "bmr_floor": bmr_floor,           # ▼ v2 基础代谢基准线
        "below_bmr": below_bmr,           # ▼ v2 是否低于基础代谢
    }

def save_score(data):
    """保存到本地 SQLite + 共享 SQLite"""
    normalize_date(data["date"])
    for db in [DB_PATH, SHARED_DB]:
        db.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(db)
        _ensure_schema(conn)
        c = conn.cursor()
        c.execute("""
            INSERT OR REPLACE INTO health_scores
            (date, user, nutrition_score, nutrition_detail,
             exercise_score, exercise_detail,
             bonus_score, bonus_detail,
             total_score, grade,
             calories_in, calories_target,
             protein_in, protein_target,
             water_in, water_target,
             training_sets, training_volume, training_cal,
             is_training_day, bodyfat_pct, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["date"], "lyzbcy",
            data["nutrition_score"], data["nutrition_detail"],
            data["exercise_score"], data["exercise_detail"],
            data["bonus_score"], data["bonus_detail"],
            data["total_score"], data["grade"],
            data["calories_in"], data["calories_target"],
            data["protein_in"], data["protein_target"],
            data["water_in"], data["water_target"],
            data["training_sets"], data["training_volume"], data["training_cal"],
            1 if data["is_training_day"] else 0,
            data["bodyfat_pct"],
            datetime.now().isoformat()
        ))
        conn.commit()
        conn.close()

    return DB_PATH

def cmd_compute(args=None):
    date_str = normalize_date(args.date if args else None)
    score = compute_score(date_str)
    if score is None:
        print(f"{date_str}: 暂无饮食或训练记录，不生成得分")
        return
    path = save_score(score)

    print(f"📊 健康得分 — {date_str}")
    print(f"   总分: {score['total_score']}/100  {score['grade']}")
    print(f"   营养: {score['nutrition_score']}/50 — {score['nutrition_detail']}")
    print(f"   运动: {score['exercise_score']}/30 — {score['exercise_detail']}")
    print(f"   加分: {score['bonus_score']}/20 — {score['bonus_detail']}")
    print(f"   🎯 动态目标: {score['calories_target']} kcal (训练日={score['is_training_day']})")
    print(f"   💾 已保存至: {path}")

def cmd_export_json(date_str=None):
    """导出 JSON 供看板生成器使用"""
    date_str = normalize_date(date_str)
    # Rebuild from source records, including corrections to earlier days.
    dates = {p.stem for p in Path("/home/openclaw-shared/nutrition").glob("????-??-??.json")}
    if Path(RECORDS_PATH).exists():
        for line in Path(RECORDS_PATH).read_text().splitlines():
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if record.get("action") == "set":
                dates.add(record.get("date"))
    scores = {}
    dates.add(date_str)
    for day in sorted(d for d in dates if isinstance(d, str)):
        try:
            normalize_date(day)
        except ValueError:
            continue
        if day > date_str:
            continue
        score = compute_score(day)
        if score is not None:
            scores[day] = score
    # All source reads succeeded before updating either cache.
    for score in scores.values():
        save_score(score)
    for db in [DB_PATH, SHARED_DB]:
        db.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(db)) as conn, conn:
            _ensure_schema(conn)
            for (day,) in conn.execute("SELECT date FROM health_scores WHERE user='lyzbcy'").fetchall():
                if day <= date_str and day not in scores:
                    conn.execute("DELETE FROM health_scores WHERE date=? AND user='lyzbcy'", (day,))
    start = (date.fromisoformat(date_str) - timedelta(days=13)).isoformat()
    history = [{"date": d, "score": s["total_score"], "grade": s["grade"],
                "nutrition": s["nutrition_detail"], "exercise": s["exercise_detail"]}
               for d, s in scores.items() if start <= d <= date_str]
    return {"today": scores.get(date_str), "history": history,
            "range_start": start, "range_end": date_str,
            "exported_at": datetime.now().isoformat()}

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    sp = p.add_subparsers(dest="cmd", required=True)

    sp1 = sp.add_parser("compute", help="计算今日健康得分")
    sp1.add_argument("--date", default=None, help="指定日期")

    sp2 = sp.add_parser("export", help="导出 JSON")
    sp2.add_argument("--date", default=None)

    sp.add_parser("init-db", help="初始化数据库")

    args = p.parse_args()

    if args.cmd == "compute":
        cmd_compute(args)
    elif args.cmd == "export":
        date_str = args.date
        data = cmd_export_json(date_str)
        print(json.dumps(data, ensure_ascii=False, indent=2))
    elif args.cmd == "init-db":
        for db in [DB_PATH, SHARED_DB]:
            db.parent.mkdir(parents=True, exist_ok=True)
            conn = sqlite3.connect(db)
            _ensure_schema(conn)
            conn.close()
            print(f"✅ 数据库已初始化: {db}")
