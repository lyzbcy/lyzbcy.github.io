#!/usr/bin/env python3
from check_runtime import managed_run, acquire_lock
import argparse
import json
import os
import shutil
import subprocess
import sys
import traceback
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parent  # 动态推算脚本所在目录


def xvfb_wrap(cmd):
    """cron 环境无 DISPLAY 时，用 xvfb-run 包裹命令（Playwright 需要 X server）。
    有 DISPLAY（交互终端）时不包裹，避免双重开销。"""
    if os.environ.get("DISPLAY"):
        return cmd
    if not shutil.which("xvfb-run"):
        return cmd  # 没有 xvfb-run 就不包裹（让原错误暴露）
    return ["xvfb-run", "-a"] + cmd

# CREATOR_DIR: 默认指向 root 数据(未迁);ubuntu 使用前需 export DOUYIN_CREATOR_DIR 指向可用副本
CREATOR_DIR = Path(os.environ.get("DOUYIN_CREATOR_DIR", "/root/.openclaw/douyin-creator-tools"))
OUTPUT_DIR = BASE_DIR / "comments-output"
REPORT_FILE = BASE_DIR / "comment-check-report.md"
MEMORY_REPORT_FILE = BASE_DIR / "memory-insufficient-report.md"
MANIFEST_FILE = OUTPUT_DIR / "reply-plan-manifest.json"
UNREPLIED_FILE = OUTPUT_DIR / "unreplied-latest.json"
LOG_DIR = BASE_DIR / "logs"
LOG_KEEP_DAYS = 7
WORKS_REFRESH_INTERVAL_HOURS = 2  # 作品列表刷新间隔：超过此时间则重新拉取，避免漏掉新发视频
SH_TZ = ZoneInfo("Asia/Shanghai")


def now_text() -> str:
    return datetime.now(SH_TZ).strftime("%Y-%m-%d %H:%M:%S")


def shanghai_day() -> str:
    return datetime.now(SH_TZ).strftime("%Y-%m-%d")


def works_needs_refresh(marker: Path) -> bool:
    """作品列表是否需要刷新。

    方案 B：标记文件按时间判断，超过 WORKS_REFRESH_INTERVAL_HOURS 即重新拉取。
    之前是"每天只刷新一次"（纯存在性判断），当天发新视频后整天的检查都用旧列表，
    导致新视频的未回复评论永远查不到。
    """
    if not marker.exists():
        return True
    age = datetime.now(SH_TZ).timestamp() - marker.stat().st_mtime
    return age > WORKS_REFRESH_INTERVAL_HOURS * 3600


def run(cmd, cwd=None, check=True):
    result = managed_run(cmd, cwd=cwd, text=True, capture_output=True, timeout=180)
    if check and result.returncode != 0:
        raise RuntimeError(
            f"命令失败: {' '.join(cmd)}\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )
    return result


def append_log(message: str) -> None:
    """追加一行结构化日志到 logs/run-YYYY-MM-DD.log。供近 7 日审计。"""
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_path = LOG_DIR / f"run-{shanghai_day()}.log"
        with log_path.open("a", encoding="utf-8") as f:
            f.write(f"[{now_text()}] {message}\n")
    except Exception:
        # 日志失败绝不能影响主流程
        pass


def cleanup_old_logs(keep_days: int = LOG_KEEP_DAYS) -> None:
    """删除 keep_days 天前的 logs/run-*.log。"""
    try:
        if not LOG_DIR.exists():
            return
        cutoff = datetime.now(SH_TZ) - timedelta(days=keep_days)
        for log_file in LOG_DIR.glob("run-*.log"):
            # 从文件名 run-YYYY-MM-DD.log 解析日期
            try:
                date_str = log_file.stem.replace("run-", "")
                log_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=SH_TZ)
                if log_date < cutoff:
                    log_file.unlink()
            except ValueError:
                continue  # 文件名不符合格式，跳过
    except Exception:
        pass


def write_report(text: str, also_memory=False):
    REPORT_FILE.write_text(text, encoding="utf-8")
    if also_memory:
        MEMORY_REPORT_FILE.write_text(text, encoding="utf-8")
    print(text)


def memory_available_mb() -> int:
    meminfo = Path("/proc/meminfo").read_text(encoding="utf-8")
    for line in meminfo.splitlines():
        if line.startswith("MemAvailable:"):
            kb = int(line.split()[1])
            return kb // 1024
    raise RuntimeError("无法读取 MemAvailable")


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def file_mtime_text(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, SH_TZ).strftime("%Y-%m-%d %H:%M:%S")


def build_skip_report(freq_output: str):
    return (
        f"# 抖音评论检查任务报告\n\n"
        f"## 执行时间\n{now_text()}\n\n"
        f"## 任务状态\nNO_REPLY\n\n"
        f"## 原因\n{freq_output.strip()}\n\n"
        f"## 说明\n本次因频率限制跳过，没有执行评论采集，也没有生成任何回复。"
    )


def build_memory_report(available_mb: int, freq_output: str):
    return (
        f"# 抖音评论检查任务报告\n\n"
        f"## 执行时间\n{now_text()}\n\n"
        f"## 任务状态\n已停止\n\n"
        f"## 停止原因\n内存不足：可用内存 {available_mb}MB < 200MB\n\n"
        f"## 执行步骤\n"
        f"1. 频率检查：{freq_output.strip()}\n"
        f"2. 内存检查：失败\n"
    )


def build_login_report(stderr_text: str):
    return (
        f"# 抖音评论检查任务报告\n\n"
        f"## 执行时间\n{now_text()}\n\n"
        f"## 任务状态\n需要人工处理\n\n"
        f"## 原因\n登录态失效，抖音创作者中心需要重新登录。\n\n"
        f"## 原始提示\n{stderr_text.strip() or 'LOGIN_EXPIRED'}"
    )


def coverage_text(payload):
    scope = payload.get('selection') or {}
    results = payload.get('workResults') or []
    if not scope:
        return ''
    unsupported = sum(r.get('status') == 'unsupported_filter' for r in results)
    failed = sum(r.get('status') == 'error' for r in results)
    checked = sum(r.get('status') == 'checked' for r in results)
    return (f"\n\n## 检查范围\n{scope.get('from')} 至 {scope.get('to')}（上海自然日，含今天）\n"
            f"近 {scope.get('days')} 天作品 {scope.get('eligibleWorks')} 个；实际检查 {checked} 个；"
            f"不支持未回复筛选 {unsupported} 个；检查失败 {failed} 个；日期不明 {scope.get('unknownDates', 0)} 个。\n"
            "未回复数量仅覆盖实际检查成功的作品；被跳过的作品不代表没有未回复评论。")


def build_empty_report(freq_output: str, payload=None):
    return (
        f"# 抖音评论检查任务报告\n\n"
        f"## 执行时间\n{now_text()}\n\n"
        f"## 任务状态\n本次已检查作品未发现未回复评论\n\n"
        f"## 执行步骤\n"
        f"1. 频率检查：{freq_output.strip()}\n"
        f"2. 评论采集：0 条\n\n"
        f"## 说明\n本次没有生成回复计划，也没有执行自动回复。" + coverage_text(payload or {})
    )


def build_stale_output_report(freq_output: str, path: Path, reason: str):
    return (
        f"# 抖音评论检查任务报告\n\n"
        f"## 执行时间\n{now_text()}\n\n"
        f"## 任务状态\n执行失败\n\n"
        f"## 原因\n采集结果未通过新鲜度校验。\n\n"
        f"## 详情\n"
        f"- 文件：{path}\n"
        f"- 文件时间：{file_mtime_text(path) if path.exists() else '不存在'}\n"
        f"- 校验失败原因：{reason}\n\n"
        f"## 说明\n本次禁止继续使用旧评论文件，避免把历史未回复评论误当成当前页面结果。"
    )


def build_final_report(freq_output: str, available_mb: int, unreplied_payload: dict, plan_manifest: dict, aggregate: dict):
    lines = [
        "# 抖音评论检查任务报告",
        "",
        f"## 执行时间",
        now_text(),
        "",
        "## 执行结果",
        f"- 频率检查：{freq_output.strip()}",
        f"- 内存检查：通过（可用内存 {available_mb}MB）",
        f"- 采集到未回复评论：{unreplied_payload.get('count', 0)} 条",
        f"- 生成回复计划：{plan_manifest.get('count', 0)} 条，拆分为 {len(plan_manifest.get('plans', []))} 个作品文件",
        f"- 实际回复成功：{aggregate['replied_count']} 条",
        f"- 未匹配到页面评论：{aggregate['unmatched_count']} 条",
        f"- 执行报错：{aggregate['error_count']} 条",
        "",
        "## 采集到的真实评论",
    ]

    for item in unreplied_payload.get("comments", []):
        work = item.get("work") or item.get("workFull") or "未知作品"
        lines.append(f"- @{item.get('username', '')}｜{item.get('commentText', '')}｜作品：{work}")

    lines.extend(["", "## 分作品执行结果"])
    for summary in aggregate["per_plan"]:
        lines.append(
            f"- {summary['plan_name']}｜作品：{summary['work']}｜计划 {summary['count']} 条｜成功 {summary['replied']}｜未匹配 {summary['unmatched']}｜报错 {summary['errors']}"
        )

    if aggregate["remaining_comments"]:
        lines.extend(["", "## 仍未完成的评论"])
        for item in aggregate["remaining_comments"]:
            lines.append(f"- @{item['username']}｜{item['commentText']}｜作品：{item['work']}")

    lines.extend(["", "## 结论"])
    if aggregate["replied_count"] == plan_manifest.get("count", 0) and aggregate["unmatched_count"] == 0 and aggregate["error_count"] == 0:
        lines.append("本次评论已全部按真实结果完成回复。")
    elif aggregate["replied_count"] == 0:
        lines.append("本次没有成功回复任何评论，仍需继续排查或人工处理。")
    else:
        lines.append("本次只完成了部分回复，仍有评论未处理完，不能汇报为“全部成功”。")

    return "\n".join(lines) + coverage_text(unreplied_payload)



def mark_check_done():
    """2026-08-24 修复:本轮完整结束(含EMPTY/登录失效)才更新检查时间戳。
    崩溃/STALE 的轮次不写,下一小时自动重试,未回复评论不会被晾着。"""
    try:
        cfg_path = BASE_DIR / "comments-output" / "check-freq-config.json"
        cfg = json.loads(cfg_path.read_text(encoding="utf-8")) if cfg_path.exists() else {}
        from datetime import datetime as _dt
        cfg["lastCheckTime"] = _dt.now().isoformat()
        cfg_path.write_text(json.dumps(cfg, ensure_ascii=False, indent=1), encoding="utf-8")
    except Exception:
        pass

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--collect-only', action='store_true', help='只采集验证，不调用 LLM、不发送、不更改检查频率')
    parser.add_argument('--days', type=int, default=30)
    parser.add_argument('--diagnostic-out')
    args = parser.parse_args()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    collect_started_at = None

    lock = acquire_lock(BASE_DIR / '.run-check.lock')
    if lock is None:
        print('SKIP: 已有评论检查正在执行', flush=True)
        return
    append_log('START | mode=' + ('collect_only' if args.collect_only else 'normal'))
    try:
        print('阶段：频率检查', flush=True)
        if args.collect_only:
            freq_output = '只读采集验证（不写检查时间戳）'
        else:
            freq_result = run(["python3", str(BASE_DIR / "adjust-check-freq.py")], cwd=BASE_DIR)
            freq_output = (freq_result.stdout or freq_result.stderr).strip()

        if freq_output.startswith("SKIP:"):
            append_log(f"SKIP | {freq_output}")
            write_report(build_skip_report(freq_output))
            return

        print('阶段：内存与作品列表检查', flush=True)
        available_mb = memory_available_mb()
        if available_mb < 200:
            append_log(f"STOP_MEMORY | available={available_mb}MB | {freq_output}")
            write_report(build_memory_report(available_mb, freq_output), also_memory=True)
            return

        marker = BASE_DIR / f"works-refreshed-{shanghai_day()}"
        if works_needs_refresh(marker):
            run(xvfb_wrap(["npm", "run", "works"]), cwd=BASE_DIR)
            marker.write_text("done\n", encoding="utf-8")  # 更新标记时间戳

        print('阶段：采集近30天未回复评论（最长480秒）', flush=True)
        append_log('STAGE | collect')
        collect_started_at = datetime.now().timestamp()

        # Call comments:collect via collect-comments.js proxy -> douyin-creator-tools.
        # Do NOT run comments:export with cwd=BASE_DIR: BASE_DIR package.json has no such script,
        # it just npm-errors and gets swallowed by except -> always 0 comments.
        collect_proc = managed_run(
            xvfb_wrap(["npm", "run", "comments:collect", "--", "--days", str(args.days), "--limit", "50"] + (["--diagnostic-out", args.diagnostic_out] if args.diagnostic_out else [])),
            cwd=BASE_DIR,
            text=True,
            capture_output=True,
            timeout=480,
        )
        if collect_proc.stdout:
            (OUTPUT_DIR / 'collection-latest.log').write_text(collect_proc.stdout, encoding='utf-8')
            os.chmod(OUTPUT_DIR / 'collection-latest.log', 0o600)
            if args.collect_only:
                print(collect_proc.stdout)
        if collect_proc.returncode != 0:
            combined = (collect_proc.stdout or "") + (collect_proc.stderr or "")
            if "LOGIN_EXPIRED" in combined or collect_proc.returncode == 2:
                append_log(f"LOGIN_EXPIRED | collect exit={collect_proc.returncode}")
                if not args.collect_only:
                    mark_check_done()
                write_report(build_login_report(combined))
                return
            raise RuntimeError(
                f"comments collect failed (exit={collect_proc.returncode})\nstdout:\n{collect_proc.stdout}\nstderr:\n{collect_proc.stderr}"
            )

        # Proxy has synced unreplied-latest.json into BASE_DIR; validate freshness.
        if not UNREPLIED_FILE.exists() or UNREPLIED_FILE.stat().st_mtime < collect_started_at:
            append_log(f"STALE_OUTPUT | unreplied-latest.json 未更新")
            write_report(build_stale_output_report(
                freq_output,
                UNREPLIED_FILE,
                "collect finished but unreplied-latest.json not updated this run (proxy sync missing)",
            ))
            return

        unreplied_payload = load_json(UNREPLIED_FILE)
        comments_list = unreplied_payload.get("comments", []) if isinstance(unreplied_payload, dict) else unreplied_payload
        unreplied_payload = {**(unreplied_payload if isinstance(unreplied_payload, dict) else {}), "count": len(comments_list), "comments": comments_list}
        if args.collect_only:
            print(json.dumps({'mode': 'collect_only', 'count': len(comments_list), 'selection': unreplied_payload.get('selection'), 'workResults': unreplied_payload.get('workResults')}, ensure_ascii=False))
            return

        # 写汇总
        UNREPLIED_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(UNREPLIED_FILE, "w", encoding="utf-8") as f:
            json.dump(unreplied_payload, f, ensure_ascii=False)
        if unreplied_payload.get("count", 0) == 0:
            append_log(f"EMPTY | 采集0条 | {freq_output}")
            mark_check_done()
            write_report(build_empty_report(freq_output, unreplied_payload))
            # 实时反馈：空跑一次
            managed_run(
                ["python3", str(BASE_DIR / "adjust-check-freq.py"), "--result", "empty"],
                cwd=BASE_DIR, text=True, capture_output=True,
            )
            return

        print('阶段：生成回复计划', flush=True)
        run(["python3", str(BASE_DIR / "process-comments.py")], cwd=BASE_DIR)
        plan_manifest = load_json(MANIFEST_FILE)

        aggregate = {
            "replied_count": 0,
            "unmatched_count": 0,
            "error_count": 0,
            "per_plan": [],
            "remaining_comments": [],
        }

        for plan in plan_manifest.get("plans", []):
            plan_path = Path(plan["file"])
            print('阶段：回复 ' + plan_path.name, flush=True)
            result = managed_run(
                ["npm", "run", "comments:reply", "--", str(plan_path)],
                cwd=BASE_DIR,
                text=True,
                capture_output=True,
            )
            if result.returncode != 0:
                raise RuntimeError(
                    f"评论回复失败: {plan_path.name}\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
                )

            result_name = plan["name"].replace("reply-plan", "reply-comments-result")
            result_path = OUTPUT_DIR / result_name
            payload = load_json(result_path)

            replied = int(payload.get("repliedCount", 0))
            unmatched = int(payload.get("unmatchedPlanCount", 0))
            errors = int(payload.get("errorCount", 0))
            aggregate["replied_count"] += replied
            aggregate["unmatched_count"] += unmatched
            aggregate["error_count"] += errors
            aggregate["per_plan"].append(
                {
                    "plan_name": plan["name"],
                    "work": plan.get("work") or plan.get("workFull") or "未知作品",
                    "count": plan.get("count", 0),
                    "replied": replied,
                    "unmatched": unmatched,
                    "errors": errors,
                }
            )

            unmatched_plans = payload.get("unmatchedPlans", [])
            for item in unmatched_plans:
                aggregate["remaining_comments"].append(
                    {
                        "username": item.get("username", ""),
                        "commentText": item.get("commentText", ""),
                        "work": plan.get("work") or plan.get("workFull") or "未知作品",
                    }
                )

        mark_check_done()  # 2026-08-24: 完整结束才记时间戳
        report = build_final_report(freq_output, available_mb, unreplied_payload, plan_manifest, aggregate)
        write_report(report)
        append_log(
            f"DONE | 内存={available_mb}MB | 采集={unreplied_payload.get('count', 0)} | "
            f"成功={aggregate['replied_count']} | 未匹配={aggregate['unmatched_count']} | 报错={aggregate['error_count']}"
        )
        # 实时反馈：发现了未回复评论
        managed_run(
            ["python3", str(BASE_DIR / "adjust-check-freq.py"), "--result", "found"],
            cwd=BASE_DIR, text=True, capture_output=True,
        )

    except Exception as e:
        append_log(f"ERROR | {type(e).__name__}: {str(e)[-3000:]}")
        if isinstance(e, subprocess.TimeoutExpired):
            detail = (str(e.output or "") + "\n" + str(e.stderr or ""))[-12000:]
            append_log("TIMEOUT_OUTPUT | " + detail)
            print("阶段超时，已清理本阶段全部子进程；发送结果不能推断为0。", flush=True)
        traceback.print_exc()
        raise
    finally:
        cleanup_old_logs()
        lock.close()


if __name__ == "__main__":
    main()
