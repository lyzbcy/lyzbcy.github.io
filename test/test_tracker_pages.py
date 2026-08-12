import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_post(name: str) -> str:
    source = (ROOT / "_posts" / name).read_text(encoding="utf-8")
    return re.sub(r"\A---\n.*?\n---\n", "", source, count=1, flags=re.S)


NUTRITION = read_post("2026-08-01-饮食营养追踪.md")
FITNESS = read_post("2026-07-12-健身训练追踪.md")


class TrackerPageStructureTest(unittest.TestCase):
    def test_wide_tables_scroll_inside_accessible_regions(self):
        self.assertRegex(NUTRITION, r"(?s)\.nb-table-wrap\s*\{.*?overflow-x:\s*auto")
        self.assertRegex(NUTRITION, r"(?s)\.nb-food-table\s*\{.*?min-width:\s*760px")
        self.assertRegex(FITNESS, r"(?s)\.fb-table-wrap\s*\{.*?overflow-x:\s*auto")
        self.assertRegex(FITNESS, r"(?s)\.fb-table\s*\{.*?min-width:\s*680px")
        self.assertGreaterEqual(NUTRITION.count('role="region" tabindex="0"'), 2)
        self.assertGreaterEqual(FITNESS.count('role="region" tabindex="0"'), 3)

    def test_secondary_nutrition_details_are_collapsed_by_default(self):
        self.assertIn('<details class="nb-disclosure" id="daily-history">', NUTRITION)
        self.assertIn('<details class="nb-disclosure" id="food-library">', NUTRITION)
        self.assertIn('<details class="nb-disclosure" id="health-history">', NUTRITION)
        self.assertNotRegex(
            NUTRITION,
            r'<details[^>]+(?:daily-history|food-library|health-history)[^>]+open',
        )

    def test_health_score_help_is_keyboard_accessible(self):
        self.assertRegex(
            NUTRITION,
            r'<button[^>]+class="nb-hh-help"[^>]+aria-expanded="false"[^>]+'
            r'aria-controls="health-score-help"',
        )
        self.assertRegex(NUTRITION, r'<div[^>]+id="health-score-help"[^>]+hidden')
        self.assertRegex(NUTRITION, r"event\.key === ['\"]Escape['\"]")

    def test_duplicate_score_cards_and_markdown_separators_are_removed(self):
        self.assertNotIn("今日健康得分细分", NUTRITION)
        self.assertNotRegex(NUTRITION, r"(?m)^---$")
        self.assertNotRegex(FITNESS, r"(?m)^---$")

    def test_invalid_health_history_entries_are_filtered(self):
        self.assertRegex(NUTRITION, r"{%\s*if h\.date != blank and h\.score > 0\s*%}")
        self.assertRegex(NUTRITION, r"{%\s*assign valid_health_days = 0\s*%}")

    def test_mobile_supporting_text_remains_readable(self):
        self.assertRegex(
            NUTRITION,
            r"(?s)@media \(max-width: 768px\).*?\.nb-trend[^}]*font-size:\s*12px",
        )
        self.assertRegex(
            FITNESS,
            r"(?s)@media \(max-width: 768px\).*?\.fb-trend[^}]*font-size:\s*12px",
        )
        nutrition_mobile = NUTRITION.split("/* 移动端适配：", 1)[1]
        fitness_mobile = FITNESS.split("/* 移动端适配 */", 1)[1]
        for selector in (
            ".nutrition-board .nb-label",
            ".nutrition-board .nb-hh-label",
            ".nutrition-board .nb-tip-note",
            ".nutrition-board .nb-food-brand",
            ".nutrition-board .nb-table th",
        ):
            self.assertRegex(
                nutrition_mobile,
                rf"(?s){re.escape(selector)}.*?font-size:\s*12px",
                selector,
            )
        for selector in (
            ".fitness-board .fb-label",
            ".fitness-board .fb-table th",
            ".fitness-board .fb-badge",
            ".fitness-board .fb-pr-item .fb-rank",
        ):
            self.assertRegex(
                fitness_mobile,
                rf"(?s){re.escape(selector)}.*?font-size:\s*12px",
                selector,
            )


if __name__ == "__main__":
    unittest.main()
