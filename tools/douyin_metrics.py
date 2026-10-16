"""Comparable work metrics from immutable daily snapshots.

A missing work is a scope change, not proof of deletion. A unique real ID at
the same publication minute resolves legacy xlsx placeholders conservatively.
"""
from collections import defaultdict
from datetime import datetime


def publication_minute(work):
    value = str(work.get("publish_time") or "").replace("T", " ")
    try:
        return datetime.fromisoformat(value).strftime("%Y-%m-%d %H:%M")
    except ValueError:
        return ""


def normalize_snapshots(snapshots):
    real_ids = defaultdict(set)
    for snapshot in snapshots:
        for work in snapshot.get("works", []):
            iid = str(work.get("item_id") or "")
            minute = publication_minute(work)
            if iid and not iid.startswith("xlsx_") and minute:
                real_ids[minute].add(iid)
    normalized = []
    for snapshot in snapshots:
        works = {}
        for original in snapshot.get("works", []):
            work = dict(original)
            iid = str(work.get("item_id") or "")
            if not iid:
                raise ValueError("Snapshot contains a work without item_id")
            candidates = real_ids[publication_minute(work)]
            key = next(iter(candidates)) if iid.startswith("xlsx_") and len(candidates) == 1 else iid
            existing = works.get(key)
            # Prefer the real-ID record; preserve the richer duplicate's counters.
            if existing:
                preferred, supplement = (work, existing) if iid == key else (existing, work)
                merged = {**supplement, **preferred, "item_id": key}
                for field in ("play_count", "comments", "likes", "shares", "favorites", "danmaku", "profile_visits", "follower_gain"):
                    merged[field] = max(preferred.get(field, 0) or 0, supplement.get(field, 0) or 0)
                works[key] = merged
            else:
                works[key] = {**work, "item_id": key}
        normalized.append({**snapshot, "works": list(works.values()),
                           "total_works": len(works),
                           "total_play": sum(w.get("play_count", 0) or 0 for w in works.values()),
                           "total_comments": sum(w.get("comments", 0) or 0 for w in works.values())})
    return sorted(normalized, key=lambda s: s["date"])


def compare_snapshots(previous, current):
    before = {w["item_id"]: w for w in previous["works"]} if previous else {}
    after = {w["item_id"]: w for w in current["works"]}
    common = before.keys() & after.keys()
    added, removed = after.keys() - before.keys(), before.keys() - after.keys()
    return {
        "previous_date": previous["date"] if previous else None,
        "interval_days": (datetime.fromisoformat(current["date"]) - datetime.fromisoformat(previous["date"])).days if previous else None,
        "play_delta": sum((after[k].get("play_count", 0) or 0) - (before[k].get("play_count", 0) or 0) for k in common) if previous else None,
        "comment_delta": sum((after[k].get("comments", 0) or 0) - (before[k].get("comments", 0) or 0) for k in common) if previous else None,
        "comparable_works": len(common),
        "added_works": len(added) if previous else 0,
        "removed_works": len(removed),
        "added_play": sum(after[k].get("play_count", 0) or 0 for k in added) if previous else 0,
        "removed_play": sum(before[k].get("play_count", 0) or 0 for k in removed),
        "scope_total_delta": current["total_play"] - previous["total_play"] if previous else None,
    }


def build_trend(snapshots):
    return [{"date": s["date"], "play": s["total_play"], "works": s["total_works"],
             "comments": s["total_comments"], **compare_snapshots(snapshots[i-1] if i else None, s)}
            for i, s in enumerate(snapshots)]
