#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
星星布丁考公学习追踪器 / 聚合 + 评分引擎 v2
新增：健康评分（休息+饮水）+ daily_health 表
"""
import sqlite3, json, os, sys
from collections.abc import Mapping
from pathlib import Path
from datetime import datetime, timedelta

SKILL_DIR = Path(__file__).resolve().parent.parent
DB_PATH = SKILL_DIR / "data/study.db"
LOG_PATH = SKILL_DIR / "data/records.jsonl"
HEALTH_LOG_PATH = SKILL_DIR / "data/health_records.jsonl"
DASH_PATH = SKILL_DIR / "data/dashboard.json"

def load_fish_health(date_str):
    """Refresh even when a cached score already exists; fail before publication."""
    import subprocess
    script = "/home/openclaw-shared/skills/lyzbcy-nutrition-tracker/scripts/health_score.py"
    result = subprocess.run([sys.executable, script, "export", "--date", date_str],
                            capture_output=True, text=True, timeout=60, check=True)
    return json.loads(result.stdout)

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import clean_record  # 共用同一份字段清洗 + 科目归一化，杜绝双份逻辑漂移

STICKERS = {
    "perfect":  ["第30弹-太美了.png","第39弹-到顶啦.png","第53弹-星星眼.png","第12弹-开心.png","第9弹-闪亮眼.png"],
    "great":    ["第39弹-看我的.png","第17弹-决定了.png","第9弹-灵机一动.png","第12弹-期待.png"],
    "good":     ["第11弹-偷笑.png","第11弹-谢谢.png","第35弹-画好啦.png","第8弹-可爱.png","第9弹-萌萌.png"],
    "study":    ["第17弹-专注.png","第35弹-刷刷刷.png","第6弹-一起学习.png","第9弹-工作.png"],
    "tired":    ["第17弹-累趴.png","第12弹-困困.png","第46弹-不想动.png","第18弹-趴着.png"],
    "sleep":    ["第13弹-晚安.png","第43弹-睡觉咯.png","第13弹-盖被.png","第6弹-晚安吻.png"],
    "cheer":    ["第12弹-加油.png","第13弹-摸头.png","第53弹-抱抱.png","第13弹-靠靠.png"],
    "soso":     ["第19弹-闲着没事.png","第52弹-算了算了.png","第37弹-嗯.png"],
    "sad":      ["第4弹-难过.png","第12弹-委屈.png","星第3弹-呜呜.png","第4弹-哭.png"],
    "lazy":     ["第46弹-再睡会.png","第16弹-又睡了.png","第43弹-钻进去.png","星第3弹-吃饭.png"],
    "surprise": ["第12弹-震惊.png","第19弹-咦？.png","第29弹-啊啊啊.png","第9弹-天塌了.png"],
    "motivate": ["第29弹-我要瘦.png","第17弹-决定了.png","第39弹-看我的.png","第12弹-敬礼.png"],
}

PRAISE = {
    "S": ["哇！今天简直是考公战神本神！✨ 这个状态保持下去，上岸稳稳的！",
          "满分开局！这学习强度，连我自己都佩服你！",
          "S级！你正在把'可能'变成'一定'！"],
    "A": ["A 级！今天的你超棒，明天继续冲！",
          "进步很明显哦，按这个节奏，目标院校在向你招手～",
          "高质量的一天！你就是自己的锦鲤！"],
    "B": ["稳扎稳打的一天，B 级说明你在持续前进！",
          "及格啦！每一分钟都在为上岸攒底气～",
          "不错哦，保持住，量变会变质变的！"],
    "C": ["今天有学到东西就好，明天再加把劲！",
          "C 级，别灰心，调整状态明天追回来！",
          "至少没空手而归，明天我们一起加油！"],
    "D": ["今天是不是太累啦？休息好明天再战！",
          "摸鱼日没事的，记得明天补回来哦～",
          "没关系，学习是马拉松，调整节奏继续跑！"],
    "ZERO": ["今天还没开始学习记录哦，点开书本就算赢！",
             "等你回来～任何一分钟的学习我都给你记着",
             "今天先好好休息，明天我们重新出发！"],
}

# ── v2: 健康评分 ──
HEALTH_STICKERS = {
    "🌟": ["第53弹-星星眼.png","第12弹-开心.png","第39弹-看我的.png"],
    "😊": ["第9弹-萌萌.png","第11弹-偷笑.png","第8弹-可爱.png"],
    "😐": ["第19弹-闲着没事.png","第37弹-嗯.png","第11弹-谢谢.png"],
    "⚠️": ["第17弹-累趴.png","第12弹-委屈.png","第4弹-难过.png"],
}

HEALTH_PRAISE = {
    "🌟": "身体状态超棒！休息和喝水都做得很好，继续保持～",
    "😊": "还不错哦，记得多起来走动走动～",
    "😐": "今天休息和饮水有欠缺，明天记得提醒自己哦！",
    "⚠️": "身体在抗议啦！一定要记得休息和喝水，健康第一！",
}

def today_str():
    return datetime.now().strftime("%Y-%m-%d")


def build_fish_comparison(lyzbcy_history, xingxing_history):
    """Build the newest 14 valid dates without letting one bad row erase the table."""
    def by_date(rows):
        result = {}
        if not isinstance(rows, (list, tuple)):
            return result
        for row in rows:
            if not isinstance(row, Mapping):
                continue
            date = row.get("date")
            if not isinstance(date, str) or len(date) != 10 or date[4:5] != "-" or date[7:8] != "-":
                continue
            result[date] = row
        return result

    lyzbcy_by_date = by_date(lyzbcy_history)
    xingxing_by_date = by_date(xingxing_history)
    dates = sorted(set(lyzbcy_by_date) | set(xingxing_by_date), reverse=True)[:14]
    return [{
        "date": date[5:],
        "ly_score": lyzbcy_by_date.get(date, {}).get("score", "-"),
        "ly_grade": lyzbcy_by_date.get(date, {}).get("grade", ""),
        "xx_score": xingxing_by_date.get(date, {}).get("score", "-"),
        "xx_grade": xingxing_by_date.get(date, {}).get("grade", ""),
    } for date in dates]

# ── 健康评分算法 ──
def compute_health_score(rest_count, rest_min, water_count, water_ml):
    """
    身体友好得分 v3（满分100，健康分保持百分制——健康不是越多越好）：
    - 休息分(50)：休息次数×10 + 休息时长分(每10分钟+5)，上限50（不变）
    - 饮水分(50)：次数分(20) + 量分(30)
      · 次数分：8 次拿满 20（min(20, 次数/8×20)）
      · 量分：1800ml 拿满 30（min(30, ml/1800×30)）——v2 的 1500ml 封顶不合理，v3 对齐"每天至少 1800ml"
    0分=无任何记录
    """
    if rest_count == 0 and water_count == 0:
        return 0, "⚠️"

    rest_score = min(50, rest_count * 10 + min(25, rest_min / 10 * 5))
    water_freq = min(20, water_count / 8 * 20) if water_count else 0
    water_vol = min(30, water_ml / 1800 * 30) if water_ml else 0
    total = round(rest_score + water_freq + water_vol)

    if total >= 80: grade = "🌟"
    elif total >= 55: grade = "😊"
    elif total >= 25: grade = "😐"
    else: grade = "⚠️"

    return total, grade

def pick_health_sticker(grade):
    import random
    pool = HEALTH_STICKERS.get(grade, HEALTH_STICKERS["😐"])
    return random.choice(pool) if pool else ""

def pick_health_praise(grade):
    import random
    pool = HEALTH_PRAISE.get(grade, HEALTH_PRAISE["😐"])
    return pool


# ── 学习评分（v3：去封顶，梯度递减）──
def score_to_grade(score):
    if score >= 90:  return "S", "perfect"
    if score >= 75:  return "A", "great"
    if score >= 60:  return "B", "good"
    if score >= 40:  return "C", "soso"
    if score >  0:   return "D", "tired"
    return "ZERO", "cheer"


def tiered(value, base_target, base_score):
    """v3 无封顶评分曲线：基准段线性到 base_score；超出后量程翻倍、增速减半，无限延伸。
    例：tiered(360, 360, 40)=40（基准）；tiered(720, 360, 40)=60；tiered(1440, 360, 40)=80。
    越努力分越高，但边际递减，杜绝"到顶躺平"。"""
    value = max(0.0, float(value or 0))
    if value <= 0:
        return 0.0
    if value <= base_target:
        return value / base_target * base_score
    score = float(base_score)
    extra = value - base_target
    seg_len = float(base_target)
    rate = base_score / base_target / 2.0
    while extra > 0:
        seg = min(extra, seg_len)
        score += seg * rate
        extra -= seg
        seg_len *= 2
        rate /= 2
    return score


def breadth_score_v3(n_subjects):
    """科目广度 v3：前3科每科5分（15基准），第4科+3、第5科+2、之后每科+1，无上限。"""
    if n_subjects <= 0:
        return 0.0
    score = min(n_subjects, 3) * 5
    if n_subjects >= 4: score += 3
    if n_subjects >= 5: score += 2
    if n_subjects >= 6: score += (n_subjects - 5)
    return score


def compute_study_score(duration, questions, correct, subject_durations, pages):
    """学习总分 v3 的唯一计算入口：除正确率外全部去封顶，超量学习可突破100分。
    基准一天（360分钟+40题+全对+3科+2科深度）= 85 分，等级阈值不变。
    注意：pages 参数 v3 已废弃不计分（保留仅为兼容旧调用方签名）。"""
    duration = max(0, int(duration or 0))
    questions = max(0, int(questions or 0))
    correct = min(questions, max(0, int(correct or 0)))
    subject_durations = {
        str(name): max(0, int(minutes or 0))
        for name, minutes in (subject_durations or {}).items()
        if str(name).strip()
    }
    accuracy = correct / questions if questions else 0
    duration_value = round(tiered(duration, 360, 40), 1)
    question_value = round(tiered(questions, 40, 10), 1)
    accuracy_value = round(accuracy * 10, 1) if questions else 0.0
    breadth_value = round(breadth_score_v3(len(subject_durations)), 1)
    deep_count = sum(1 for minutes in subject_durations.values() if minutes >= 60)
    deep_value = round(tiered(deep_count, 2, 10), 1)
    subject_names = "、".join(sorted(subject_durations)) or "无"

    components = [
        {"key": "duration", "name": "⏱️ 学习时长分", "value": duration_value, "max": 40,
         "unlimited": True,
         "formula": f"无封顶：前360分钟线性到40分，超出后增速减半 → {duration}分钟 = {duration_value}分",
         "detail": f"学习 {duration} 分钟（360分钟=40分基准，720分钟=60分，上不封顶）"},
        {"key": "questions", "name": "📝 题量分", "value": question_value, "max": 10,
         "unlimited": True,
         "formula": f"无封顶：前40题线性到10分，超出后增速减半 → {questions}题 = {question_value}分",
         "detail": f"完成 {questions} 题（40题=10分基准，80题=15分，上不封顶）"},
        {"key": "accuracy", "name": "✅ 正确率分", "value": accuracy_value, "max": 10,
         "unlimited": False,
         "formula": (f"正确率×10 = ({correct}÷{questions})×10 = {accuracy_value}" if questions
                     else "未记录客观题，正确率项为 0"),
         "detail": (f"答对 {correct} 题 / 共 {questions} 题 = {accuracy * 100:.1f}%" if questions
                    else "当天没有可计算正确率的题目")},
        {"key": "breadth", "name": "🎯 科目广度分", "value": breadth_value, "max": 15,
         "unlimited": True,
         "formula": f"前3科每科5分，第4科+3、第5科+2、之后每科+1 → {len(subject_durations)}科 = {breadth_value}分",
         "detail": f"学习 {len(subject_durations)} 个科目：{subject_names}"},
        {"key": "depth", "name": "🧠 深度学习分", "value": deep_value, "max": 10,
         "unlimited": True,
         "formula": f"无封顶：2个深度科目(单科≥60分钟)=10分基准，超出增速减半 → {deep_count}科 = {deep_value}分",
         "detail": f"单科不少于 60 分钟的科目有 {deep_count} 个"},
    ]
    for component in components:
        # gap 只统计"未达基准"的缺口；无上限项超基准后 gap=0（超额完成，无需建议）
        component["gap"] = round(max(0, component["max"] - component["value"]), 1)
        component["percent"] = round(component["value"] / component["max"] * 100) if component["max"] else 0
    total = round(sum(component["value"] for component in components), 1)
    return {
        "total": total,
        "components": components,
        "weakest": sorted((c.copy() for c in components if c["gap"] > 0), key=lambda c: (-c["gap"], c["key"])),
    }


def build_week_days(records, current_date=None):
    """构造北京时间自然周（周一到周日），明确记录、休息未记录和未来状态。"""
    current_date = current_date or datetime.now().date()
    monday = current_date - timedelta(days=current_date.weekday())
    weekdays = "一二三四五六日"
    result = []
    for offset in range(7):
        day = monday + timedelta(days=offset)
        day_key = day.strftime("%Y-%m-%d")
        record = (records or {}).get(day_key)
        if record:
            status, label = "recorded", "已记录"
        elif day > current_date:
            status, label = "future", "待开始"
        else:
            status, label = "rest_unrecorded", "休息日（未记录）"
        item = {"date": day_key, "wd": weekdays[offset], "status": status,
                "status_label": label, "is_today": day == current_date}
        if record:
            item.update(record)
        result.append(item)
    return result


def compute_week_stats(records, current_date=None):
    week = build_week_days(records, current_date)
    scores = [float(item["score"]) for item in week if item["status"] == "recorded"]
    return {
        "study_days": len(scores),
        "sum": round(sum(scores), 1),
        "average": round(sum(scores) / len(scores), 1) if scores else None,
        "best": round(max(scores), 1) if scores else None,
    }

def pick_sticker(cat, duration):
    import random
    pool = STICKERS.get(cat, STICKERS["cheer"])
    return random.choice(pool) if pool else ""

def pick_praise(cat):
    import random
    return random.choice(PRAISE.get(cat, PRAISE["B"]))


def rebuild_records(conn):
    c = conn.cursor()
    c.execute("DELETE FROM study_records")
    if not LOG_PATH.exists():
        conn.commit(); return 0
    n = 0
    with open(LOG_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            # 共用 clean_record：科目归一化 + correct 截断 + 所有类型转换带 try
            rec = clean_record(r)
            if rec is None:
                continue
            c.execute("""INSERT INTO study_records
                (date,ts,subject,topic,duration,questions,correct,pages,mood,note,extra,source)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (rec["date"], rec["ts"], rec["subject"], rec["topic"],
                 rec["duration"], rec["questions"], rec["correct"], rec["pages"],
                 rec["mood"], rec["note"], rec["extra"], rec["source"]))
            n += 1
    conn.commit()
    return n


def rebuild_health(conn):
    """从 health_records.jsonl 重建 health_logs"""
    c = conn.cursor()
    c.execute("DELETE FROM health_logs")
    if not HEALTH_LOG_PATH.exists():
        conn.commit(); return 0
    n = 0
    with open(HEALTH_LOG_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try: r = json.loads(line)
            except json.JSONDecodeError: continue
            date = r.get("date") or today_str()
            try: datetime.strptime(date, "%Y-%m-%d")
            except (ValueError, TypeError): date = today_str()
            ts = r.get("ts") or datetime.now().isoformat()
            typ = r.get("type", "other")
            dur = int(r.get("duration") or 0)
            note = (r.get("note") or "").strip()
            src = (r.get("source") or "auto").strip()
            c.execute("""INSERT INTO health_logs (date,ts,type,duration,note,source)
                VALUES (?,?,?,?,?,?)""", (date,ts,typ,dur,note,src))
            n += 1
    conn.commit()
    return n


def compute_health_daily(conn):
    """计算每日健康汇总"""
    c = conn.cursor()
    c.execute("DELETE FROM daily_health")

    c.execute("SELECT DISTINCT date FROM health_logs ORDER BY date")
    dates = [row[0] for row in c.fetchall()]

    for d in dates:
        c.execute("""SELECT type, COUNT(*), SUM(duration)
            FROM health_logs WHERE date=? GROUP BY type""", (d,))
        rows = {r[0]: (r[1], r[2]) for r in c.fetchall()}

        rest_count = int(rows.get("rest", (0, 0))[0])
        rest_min   = int(rows.get("rest", (0, 0))[1] or 0)
        water_count = int(rows.get("water", (0, 0))[0])
        water_ml    = int(rows.get("water", (0, 0))[1] or 0)
        reminder_count = int(rows.get("reminder", (0, 0))[0])

        # v4.1 诚实性修复：只有自动提醒、没有任何实际休息/饮水记录的日期不算"健康记录日"，
        # 不写入 daily_health（否则看板会出现 0 分红柱，把"没记录"伪装成"0分"）
        if rest_count == 0 and water_count == 0:
            continue

        score, grade = compute_health_score(rest_count, rest_min, water_count, water_ml)

        c.execute("""INSERT OR REPLACE INTO daily_health
            (date,rest_count,rest_total_min,water_count,water_total_ml,reminder_count,health_score,health_grade)
            VALUES (?,?,?,?,?,?,?,?)""",
            (d, rest_count, rest_min, water_count, water_ml, reminder_count, score, grade))
    conn.commit()
    return len(dates)


def compute_daily(conn):
    c = conn.cursor()
    c.execute("DELETE FROM daily_summary")
    c.execute("DELETE FROM daily_total")

    c.execute("SELECT DISTINCT date FROM study_records ORDER BY date")
    dates = [row[0] for row in c.fetchall()]

    for d in dates:
        c.execute("""SELECT subject,
                SUM(duration), SUM(questions), SUM(correct), SUM(pages), COUNT(*)
            FROM study_records WHERE date=? GROUP BY subject""", (d,))
        day_dur = day_q = day_cr = 0
        day_pages = 0.0
        subjects = []
        subj_durations = {}  # 用于「深度学习」维度
        for subj, dur, q, cr, pg, cnt in c.fetchall():
            dur = dur or 0; q = q or 0; cr = cr or 0; pg = pg or 0; cnt = cnt or 0
            acc = (cr / q * 100) if q > 0 else 0
            # 单科时长分与总分 v3 口径对齐：360 分钟基准（保持线性封顶，仅作参考值）
            sub_score = min(40, dur / 360 * 40)
            if q > 0:
                sub_score += min(15, q / 50 * 15)
                sub_score += min(5, acc / 100 * 5)
            sub_score = round(sub_score, 1)
            c.execute("""INSERT OR REPLACE INTO daily_summary
                (date,subject,total_duration,total_questions,total_correct,accuracy,pages,record_count,score)
                VALUES (?,?,?,?,?,?,?,?,?)""",
                (d,subj,dur,q,cr,round(acc,1),pg,cnt,sub_score))
            day_dur += dur; day_q += q; day_cr += cr; day_pages += pg
            subjects.append(subj)
            subj_durations[subj] = dur

        total = compute_study_score(day_dur, day_q, day_cr, subj_durations, day_pages)["total"]
        grade, cat = score_to_grade(total)
        sticker = pick_sticker(cat, day_dur)
        praise = pick_praise(grade)

        c.execute("""INSERT OR REPLACE INTO daily_total
            (date,total_duration,total_questions,total_correct,total_score,subjects,grade,sticker,praise)
            VALUES (?,?,?,?,?,?,?,?,?)""",
            (d, day_dur, day_q, day_cr, total, json.dumps(subjects, ensure_ascii=False),
             grade, sticker, praise))
    conn.commit()
    return len(dates)


def update_milestones(conn):
    c = conn.cursor()
    c.execute("DELETE FROM milestones")
    def setm(k,v):
        c.execute("INSERT OR REPLACE INTO milestones VALUES(?,?,?)",
                  (k,str(v),datetime.now().isoformat()))
    c.execute("SELECT MAX(total_score) FROM daily_total WHERE total_score IS NOT NULL")
    row = c.fetchone()
    setm("highest_score", row[0] if row and row[0] is not None else 0)
    c.execute("SELECT date FROM daily_total WHERE total_score>0 ORDER BY date")
    study_dates = [r[0] for r in c.fetchall()]
    setm("total_study_days", len(study_dates))
    # v4：连续天数按"截至最近一个学习日"计算，当天还没记录不清零（避免昨天刚学今天显示0天的打击）
    streak = 0
    today = datetime.now().date()
    study_date_set = set(study_dates)
    if study_dates:
        latest_study = datetime.strptime(max(study_dates), "%Y-%m-%d").date()
        # 最近学习日距今不超过7天则连续有效；从最近学习日往前数
        if 0 <= (today - latest_study).days <= 7:
            d = latest_study
            while d.strftime("%Y-%m-%d") in study_date_set:
                streak += 1
                d -= timedelta(days=1)
    setm("current_streak", streak)
    longest = 0; cur = 0; prev = None
    for d in sorted(study_dates):
        if prev is None: cur = 1
        else:
            pp = datetime.strptime(prev,"%Y-%m-%d").date()
            dd = datetime.strptime(d,"%Y-%m-%d").date()
            cur = cur + 1 if (dd - pp).days == 1 else 1
        longest = max(longest, cur); prev = d
    setm("longest_streak", longest)
    c.execute("SELECT SUM(total_duration), SUM(total_questions), SUM(total_correct) FROM daily_total")
    row = c.fetchone()
    setm("total_duration", row[0] or 0)
    setm("total_questions", row[1] or 0)
    setm("total_correct", row[2] or 0)
    now = datetime.now()
    monday = (now - timedelta(days=now.weekday())).replace(hour=0,minute=0,second=0,microsecond=0)
    sunday = monday + timedelta(days=6)
    c.execute("SELECT date,total_score FROM daily_total WHERE date BETWEEN ? AND ?",
              (monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")))
    week = [(r[0],r[1]) for r in c.fetchall()]
    setm("week_score_sum", round(sum(s for _,s in week),1))
    setm("week_study_days", len(week))
    setm("week_best_score", max((s for _,s in week), default=0))
    setm("week_avg_score", round(sum(s for _,s in week) / len(week), 1) if week else "")
    conn.commit()


def export_dashboard(conn):
    c = conn.cursor()
    current = datetime.now().date()
    today_local = current.strftime("%Y-%m-%d")
    out = {"generated_at": datetime.now().isoformat(timespec="seconds"),
           "current_date": today_local, "user":"星星布丁","goal":"考公",
           "stickers_base":"/stickers/"}

    # milestones
    c.execute("SELECT key,value FROM milestones")
    out["milestones"] = {k:v for k,v in c.fetchall()}
    for k in ["highest_score","total_duration","total_questions","total_correct",
              "week_score_sum","week_best_score","week_avg_score"]:
        try: out["milestones"][k] = float(out["milestones"].get(k,0))
        except (ValueError, TypeError): pass
    for k in ["total_study_days","current_streak","longest_streak","week_study_days"]:
        try: out["milestones"][k] = int(out["milestones"].get(k,0))
        except (ValueError, TypeError): pass

    # 最近 30 天每日
    c.execute("""SELECT date,total_duration,total_questions,total_correct,total_score,
                        subjects,grade,sticker,praise
                 FROM daily_total ORDER BY date DESC LIMIT 30""")
    days = []
    for row in c.fetchall():
        days.append({
            "date":row[0],"duration":row[1],"questions":row[2],"correct":row[3],
            "score":row[4],"subjects":json.loads(row[5] or "[]"),
            "grade":row[6],"sticker":row[7],"praise":row[8]
        })
    out["recent_days"] = days
    latest = days[0] if days else {
        "date": today_local, "duration": 0, "questions": 0, "correct": 0, "score": 0,
        "subjects": [], "grade": "ZERO", "sticker": STICKERS["cheer"][0],
        "praise": PRAISE["ZERO"][0]}
    out["has_record_today"] = bool(days and days[0]["date"] == today_local)
    out["latest_record"] = latest
    out["today"] = latest  # 兼容旧消费者；页面必须同时读取 has_record_today
    c.execute("""SELECT subject,
            SUM(total_duration),SUM(total_questions),SUM(total_correct),
            AVG(accuracy),SUM(record_count)
        FROM daily_summary WHERE date>=date(?, '-30 days')
        GROUP BY subject ORDER BY SUM(total_duration) DESC""", (today_local,))
    out["subjects_30d"] = [{
        "subject":r[0],"duration":r[1],"questions":r[2],"correct":r[3],
        "accuracy":round(r[4] or 0,1),"records":r[5]
    } for r in c.fetchall()]

    # ── 首卡使用最近一次记录的每科目数据，不把昨天误写成今天 ──
    display_date = latest["date"]
    c.execute("""SELECT subject,total_duration,total_questions,total_correct,accuracy,pages
                 FROM daily_summary WHERE date=? ORDER BY total_duration DESC""", (display_date,))
    out["today_subjects"] = [{
        "subject":r[0],"duration":r[1] or 0,"questions":r[2] or 0,"correct":r[3] or 0,
        "accuracy":round(r[4] or 0,1), "pages": r[5] or 0
    } for r in c.fetchall()]
    score_result = compute_study_score(
        latest.get("duration", 0), latest.get("questions", 0), latest.get("correct", 0),
        {s["subject"]: s["duration"] for s in out["today_subjects"]},
        sum(s["pages"] for s in out["today_subjects"]),
    )
    out["latest_record"]["score_components"] = score_result["components"]
    out["latest_record"]["score_weakest"] = score_result["weakest"]

    # ── 近 14 天每日每科目时长（供历史列表展开看每科）──
    c.execute("""SELECT date,subject,total_duration,total_questions,total_correct
                 FROM daily_summary WHERE date>=date(?, '-29 days')
                 ORDER BY date DESC, total_duration DESC""", (today_local,))
    _by_date = {}
    for d, subj, dur, q, cr in c.fetchall():
        _by_date.setdefault(d, []).append({
            "subject":subj,"duration":dur or 0,"questions":q or 0,"correct":cr or 0
        })
    out["recent_subjects"] = _by_date  # {date: [{subject,duration,...}, ...]}

    # ── 日历弹窗数据：近 30 天每日（含 score/grade/sticker/每科目），点日历某天弹出 ──
    c.execute("""SELECT date,total_score,total_duration,grade,sticker
                 FROM daily_total WHERE date>=date(?, '-29 days')
                 ORDER BY date DESC""", (today_local,))
    _cal = {}
    for d, sc, dur, gr, st in c.fetchall():
        _cal[d] = {
            "date":d, "score":sc, "duration":dur or 0, "grade":gr,
            "sticker":st, "subjects": _by_date.get(d, [])
        }
    out["calendar_subjects"] = _cal  # {date: {date,score,duration,grade,sticker,subjects[]}}

    # ── 全部历史（每日明细，倒序），供"查看全部"按钮 + 周/月复盘看板用 ──
    # v3 修复：科目明细改为全量查询（原 _by_date 只含近30天，周/月看板需要全历史）
    c.execute("""SELECT date,subject,total_duration,total_questions,total_correct
                 FROM daily_summary ORDER BY date DESC, total_duration DESC""")
    _all_by_date = {}
    for d, subj, dur, q, cr in c.fetchall():
        _all_by_date.setdefault(d, []).append({
            "subject":subj,"duration":dur or 0,"questions":q or 0,"correct":cr or 0
        })
    c.execute("""SELECT date,total_score,total_duration,total_questions,total_correct,
                        subjects,grade,sticker,praise
                 FROM daily_total ORDER BY date DESC""")
    out["full_history"] = [{
        "date":r[0],"score":r[1],"duration":r[2] or 0,"questions":r[3] or 0,
        "correct":r[4] or 0,"grade":r[6] or "ZERO","sticker":r[7],
        "subjects": json.loads(r[5] or "[]"),
        "subjects_detail": _all_by_date.get(r[0], []),
        "praise":r[8]
    } for r in c.fetchall()]

    c.execute("""SELECT date,total_score,total_duration FROM daily_total
                 WHERE date>=date(?, '-13 days') ORDER BY date""", (today_local,))
    out["trend_14d"] = [{"date":r[0],"score":r[1],"duration":r[2]} for r in c.fetchall()]

    monday = current - timedelta(days=current.weekday())
    sunday = monday + timedelta(days=6)
    c.execute("""SELECT date,total_score,grade,sticker FROM daily_total
                 WHERE date BETWEEN ? AND ? ORDER BY date""",
              (monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")))
    week_records = {r[0]: {"score":r[1],"grade":r[2],"sticker":r[3]} for r in c.fetchall()}
    out["week"] = build_week_days(week_records, current)
    out["week_start"] = monday.strftime("%Y-%m-%d")
    out["week_end"] = sunday.strftime("%Y-%m-%d")
    out["week_stats"] = compute_week_stats(week_records, current)

    # ── v2: 健康数据 ──
    # 今日健康
    c.execute("""SELECT date,rest_count,rest_total_min,water_count,water_total_ml,
                        reminder_count,health_score,health_grade
                 FROM daily_health WHERE date<=? ORDER BY date DESC LIMIT 1""", (today_local,))
    health_row = c.fetchone()
    if health_row:
        out["health"] = {
            "date": health_row[0], "has_record_today": health_row[0] == today_local,
            "rest_count": health_row[1], "rest_min": health_row[2],
            "water_count": health_row[3], "water_ml": health_row[4],
            "reminder_count": health_row[5], "score": health_row[6],
            "grade": health_row[7], "sticker": pick_health_sticker(health_row[7]),
            "praise": pick_health_praise(health_row[7])
        }
    else:
        out["health"] = {
            "date": today_local, "has_record_today": False,
            "rest_count": 0, "rest_min": 0, "water_count": 0, "water_ml": 0,
            "reminder_count": 0, "score": 0, "grade": "⚠️",
            "sticker": pick_health_sticker("⚠️"),
            "praise": HEALTH_PRAISE["⚠️"]
        }

    # 最近7天健康趋势
    c.execute("""SELECT date,health_score,health_grade FROM daily_health
                 WHERE date>=date(?, '-6 days') ORDER BY date""", (today_local,))
    out["health_trend"] = [{"date":r[0],"score":r[1],"grade":r[2]} for r in c.fetchall()]

    # Always refresh through the single scoring engine; never trust an old daily cache.
    import subprocess
    _hs_path = "/home/openclaw-shared/skills/lyzbcy-nutrition-tracker/scripts/health_score.py"
    _td = today_local
    try:
        health_export = load_fish_health(_td)
        out["lyzbcy_today"] = health_export["today"]
        out["lyzbcy_history"] = health_export["history"]
        out["lyzbcy_updated_at"] = health_export["exported_at"]
    except (subprocess.SubprocessError, OSError, ValueError, KeyError) as exc:
        # Stop publishing rather than silently presenting stale scores as current.
        raise RuntimeError("捞鱼健康分刷新失败，保留已发布看板") from exc

    # ── 星星布丁健康历史（同库，直接用现有 conn）──
    try:
        c.execute("SELECT date,health_score,health_grade,rest_count,rest_total_min,water_count,water_total_ml FROM daily_health ORDER BY date")
        out["xingxing_history"] = [{"date":r[0],"score":r[1]or 0,"grade":r[2]or"⚠️","rest_count":r[3]or 0,"rest_min":r[4]or 0,"water_count":r[5]or 0,"water_ml":r[6]or 0} for r in c.fetchall()[-14:]]
    except (sqlite3.Error, ValueError, TypeError):
        pass

    # ── 每日对比表 ──
    out["lyzbcy_matched"] = build_fish_comparison(
        out.get("lyzbcy_history", []), out.get("xingxing_history", [])
    )

    # 写文件（所有字段填充完再写）
    DASH_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DASH_PATH,"w",encoding="utf-8") as f:
        json.dump(out,f,ensure_ascii=False,indent=2)

    return out


def main():
    if not DB_PATH.exists():
        print("❌ 数据库不存在，请先跑 init_db.py", file=sys.stderr); sys.exit(1)
    conn = sqlite3.connect(DB_PATH)
    n = rebuild_records(conn)
    h = rebuild_health(conn)
    d = compute_daily(conn)
    hd = compute_health_daily(conn)
    update_milestones(conn)
    out = export_dashboard(conn)
    conn.close()
    print(f"✅ 聚合完成：{n} 条学习记录 + {h} 条健康记录，{d} 个学习日，{hd} 个健康日")
    print(f"   里程碑：最高分 {out['milestones'].get('highest_score',0)} | "
          f"连续 {out['milestones'].get('current_streak',0)} 天 | "
          f"本周均分 {out['milestones'].get('week_avg_score',0)}")
    health = out.get("health", {})
    print(f"   健康分：{health.get('score',0)} {health.get('grade','')} | "
          f"🧘×{health.get('rest_count',0)} 💧×{health.get('water_count',0)}")
    print(f"   看板数据：{DASH_PATH}")

if __name__ == "__main__":
    main()
