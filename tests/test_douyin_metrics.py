import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from douyin_metrics import normalize_snapshots, build_trend


def work(iid, plays, published="2026-06-24 09:16:30"):
    return {"item_id": iid, "play_count": plays, "publish_time": published, "comments": 1}


def snapshot(date, works):
    return {"date": date, "works": works}


class ComparableMetricsTests(unittest.TestCase):
    def test_scope_exit_does_not_erase_real_growth(self):
        series = normalize_snapshots([
            snapshot("2026-09-21", [work("a", 1000), work("old", 46677), work("real", 195), work("xlsx_无标题", 195)]),
            snapshot("2026-09-23", [work("a", 1584)]),
        ])
        # Keep distinct real works distinct even when timestamps collide.
        point = build_trend(series)[-1]
        self.assertEqual(point["play_delta"], 584)
        self.assertEqual(point["previous_date"], "2026-09-21")
        self.assertEqual(point["interval_days"], 2)
        self.assertEqual(point["scope_total_delta"], point["play_delta"] + point["added_play"] - point["removed_play"])

    def test_unique_publication_minute_resolves_duplicate(self):
        raw = snapshot("2026-09-21", [work("real", 195), work("xlsx_无标题", 195)])
        result = normalize_snapshots([raw])[0]
        self.assertEqual(result["total_play"], 195)
        self.assertEqual(result["total_works"], 1)
        self.assertEqual(len(raw["works"]), 2)  # raw snapshots remain unchanged

    def test_placeholder_to_real_id_is_continuous(self):
        series = normalize_snapshots([snapshot("2026-09-21", [work("xlsx_a", 10)]), snapshot("2026-09-23", [work("real", 14)])])
        point = build_trend(series)[-1]
        self.assertEqual((point["play_delta"], point["added_works"], point["removed_works"]), (4, 0, 0))

    def test_ambiguous_publication_minute_is_not_merged(self):
        result = normalize_snapshots([snapshot("2026-09-21", [work("a", 10), work("b", 20), work("xlsx_a", 10)])])[0]
        self.assertEqual(result["total_works"], 3)

    def test_new_works_are_separate_from_comparable_growth(self):
        point = build_trend(normalize_snapshots([
            snapshot("2026-09-21", [work("a", 10)]),
            snapshot("2026-09-23", [work("a", 12), work("new", 500)]),
        ]))[-1]
        self.assertEqual((point["play_delta"], point["added_play"], point["scope_total_delta"]), (2, 500, 502))

    def test_real_counter_correction_stays_visible(self):
        point = build_trend(normalize_snapshots([snapshot("2026-09-21", [work("a", 10)]), snapshot("2026-09-23", [work("a", 9)])]))[-1]
        self.assertEqual(point["play_delta"], -1)

    def test_first_snapshot_has_no_invented_growth(self):
        point = build_trend(normalize_snapshots([snapshot("2026-09-21", [work("a", 10)])]))[0]
        self.assertIsNone(point["play_delta"])
        self.assertIsNone(point["previous_date"])


if __name__ == "__main__":
    unittest.main()
