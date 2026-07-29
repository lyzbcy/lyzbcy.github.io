import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
POST = ROOT / "_posts" / "2026-07-29-抖音数据看板.md"


class DashboardSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = POST.read_text(encoding="utf-8")

    def test_untrusted_work_text_is_escaped(self):
        self.assertIn("w.desc_full | default: w.title | escape", self.source)
        self.assertIn("w.title | truncate: 28 | escape", self.source)
        self.assertIn("tag | escape", self.source)

    def test_mobile_table_scrolls_instead_of_clipping(self):
        self.assertIn("overflow-x: auto", self.source)
        self.assertIn("min-width: 720px", self.source)

    def test_single_day_is_not_rendered_as_a_trend_chart(self):
        self.assertIn("trend.size >= 2", self.source)

    def test_labels_match_the_data_scope(self):
        self.assertIn("最高播放作品", self.source)
        self.assertIn("播放量前 10 个作品", self.source)

    def test_displayed_schedule_is_1020(self):
        self.assertIn("每日 10:20", self.source)


if __name__ == "__main__":
    unittest.main()
