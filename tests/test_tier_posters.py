"""Regression tests for real failures: lost decimals, omitted entries and overflowing text."""
import json
from pathlib import Path
import subprocess
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import generate_posters as g


class Scores(unittest.TestCase):
    def item(self, label, rating=5):
        return dict(name='test', tierLabel=label, rating=rating)

    def test_noodle_decimals_and_six_are_not_tier_indices(self):
        for number in ['5.8', '5.5', '6', '4']:
            self.assertEqual(g.exact_score(self.item(f'夯 · {number}❤️'), 'noodle'), (number, 'tierLabel'))

    def test_takeout_keeps_precision_and_trailing_zero(self):
        for number in ['3.83', '3.65', '4.90']:
            self.assertEqual(g.exact_score(self.item(f'顶级 · 店铺得分 {number}', 3.8), 'takeout')[0], number)

    def test_drink_anchors_keep_author_scores(self):
        rows = g.load_items('drink')
        anchors = {row['name']: row for row in rows if row.get('anchor')}
        self.assertEqual({name: (item['tier'], item['score']) for name, item in anchors.items()}, {
            '糖量减半的茉莉奶绿': ('顶级', '5'),
            '统一阿萨姆标准原味奶茶': ('人上人', '4'),
            '红牛': ('NPC', '3'),
        })
        self.assertEqual(len(rows), 7)

    def test_canteen_does_not_parse_year_as_score(self):
        self.assertEqual(g.exact_score(self.item('NPC · 2026-08 下调', 2), 'dine'), ('2', 'rating'))
        self.assertEqual(g.exact_score(self.item('人上人 · 3.9 星', 3), 'dine')[0], '3.9')

    def test_qualitative_score_is_not_invented(self):
        self.assertEqual(g.exact_score(self.item('拉完了 · 史', 1), 'noodle'), ('史', 'tierLabel'))
        with self.assertRaises(ValueError):
            g.exact_score(self.item('夯 · 待定'), 'noodle')

    def test_ambiguous_score_fails(self):
        with self.assertRaises(ValueError):
            g.exact_score(self.item('夯 · 5.8星 / 6星'), 'noodle')


class Layout(unittest.TestCase):
    def test_watermark_is_visible_repeated_and_deterministic(self):
        from PIL import Image, ImageChops
        original = Image.new('RGB', (g.WIDTH, 1600), 'white')
        marked, audit = g.add_watermark(original)
        again, repeated_audit = g.add_watermark(original)
        self.assertEqual(marked.size, original.size)
        self.assertEqual(audit['text'], '捞鱼的博客')
        self.assertGreater(audit['count'], 10)
        self.assertEqual(audit, repeated_audit)
        self.assertEqual(marked.tobytes(), again.tobytes())
        for top in [0, 500, 1100]:
            box = (100, top, 1200, top + 400)
            self.assertIsNotNone(ImageChops.difference(original.crop(box), marked.crop(box)).getbbox())
        # Attribution should remain subtle enough for the foreground text to read.
        self.assertGreater(min(marked.getchannel('R').getextrema()), 225)

    def test_long_cjk_latin_and_punctuation_fit_with_ellipsis(self):
        for text in ['简介很长，不能溢出；也不能丢失省略号。' * 30,
                     'ABCDEFGHIJKLMNOPQRSTUVWXYZ /（全角）& Mixed 内容 ' * 30]:
            lines, truncated = g.wrap_text(text, g.font(27), 270, 3)
            self.assertTrue(truncated)
            self.assertEqual(len(lines), 3)
            self.assertTrue(lines[-1].endswith('…'))
            self.assertTrue(all(g.text_width(line, g.font(27)) <= 270 for line in lines))

    def test_short_description_is_not_changed(self):
        text = '酸酸甜甜，4❤️守门员。'
        lines, truncated = g.wrap_text(text, g.font(27), 900, 3)
        self.assertFalse(truncated)
        self.assertEqual(''.join(lines), text.replace('\ufe0f', ''))

    def test_punctuation_and_decimal_units_do_not_split_badly(self):
        text = '价格约23.08元（正常在售），热量810kcal。很好吃！' * 5
        lines, _ = g.wrap_text(text, g.font(27), 270)
        self.assertEqual(''.join(lines), text)
        self.assertTrue(all(not line.startswith(('，', '。', '）', '！')) for line in lines))
        self.assertTrue(any('23.08' in line for line in lines))

    def test_long_names_expand_card_without_truncation(self):
        item = dict(name='【星光广场】' + '很长的完整店铺名称' * 12, description='原文评价。' * 100)
        layout = g.card_layout(item, 'dine')
        self.assertEqual(''.join(layout['names']), g.split_name(item['name'])[0])
        self.assertGreater(layout['height'], 500)
        self.assertGreaterEqual(layout['description_y'], layout['score_y'] + 40)
        self.assertGreaterEqual(layout['height'], layout['description_y'] + len(layout['intro']) * 39)

    def test_missing_glyph_fails_instead_of_tofu(self):
        with self.assertRaises(ValueError):
            g.display_text('不支持的字符\U0010ffff')

    def test_painter_rejects_text_outside_box(self):
        with self.assertRaises(ValueError):
            g.Painter(100).text((0, 0), '太长了', 32, width=10, height=40)


class SourceData(unittest.TestCase):
    def test_js_reader_handles_quotes_escapes_comments_nested_arrays(self):
        source = '''const noodles = [
          {name: "double quote", description: 'it\\'s ] good' + ' concat', pros: ['x', 'y']},
          // closing ] in comment
          {name: 'single quote', description: "second"}
        ];'''
        code = "const {arrayDeclaration}=require('./tools/export_tier_data.cjs');const vm=require('node:vm');" \
               "const fs=require('node:fs');console.log(JSON.stringify(vm.runInNewContext(arrayDeclaration(fs.readFileSync(0,'utf8'),'noodles'))));"
        result = subprocess.run(['node', '-e', code], input=source, cwd=g.ROOT,
                                capture_output=True, encoding='utf-8', check=True)
        rows = json.loads(result.stdout)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['description'], "it's ] good concat")

    def test_live_data_complete_and_assets_resolve(self):
        for kind in g.CONFIG:
            rows = g.load_items(kind)
            self.assertGreater(len(rows), 0)
            self.assertEqual(len(rows), len({r['sourceName'] for r in rows}))
            for item in rows:
                self.assertEqual(item['score'], g.exact_score(item, kind)[0])
                if kind == 'noodle':
                    self.assertTrue(g.image_path(item).is_file())
            if kind != 'noodle':
                for tier in g.TIERS:
                    values = [r['rating'] for r in rows if r['tier'] == tier]
                    self.assertEqual(values, sorted(values, reverse=True))


if __name__ == '__main__':
    unittest.main()
