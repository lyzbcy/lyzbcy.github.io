"""外卖榜的店铺/菜品分层与详情卡片回归检查。"""
import json
from pathlib import Path
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'assets/lib-custom/takeout-tier.js'
POST = ROOT / '_posts/2026-08-15-江南大学外卖从夯到拉排名.md'
AUDIT = ROOT / 'assets/img/posters/poster-takeout.audit.json'


def load_stalls():
    result = subprocess.run(
        ['node', str(ROOT / 'tools/export_tier_data.cjs'), str(ROOT), 'takeout'],
        capture_output=True, encoding='utf-8', check=True,
    )
    return json.loads(result.stdout)


class TakeoutDetailSchema(unittest.TestCase):
    def test_migrated_records_are_stores_with_nested_dishes(self):
        expected = {
            '【外卖】和府捞面': ['番茄沙葱前腿肉面'],
            '【外卖】鑫花溪牛肉米粉': ['经典牛肉粉', '香辣牛杂粉', '招牌红煨牛腩', '贵州特色酸汤'],
            '【外卖】鑫震源·苏式大虾生煎（滨湖万科店）': ['大虾（小龙虾）生煎', '虾肉小馄饨 + 生煎双拼'],
            '【外卖】Black Burger 黑汉堡': ['黑汉堡'],
            '【外卖】塔斯汀中国汉堡': ['中国汉堡单人三件套'],
            '【外卖】张山野云南野生菌炒饭': ['虾仁鸡蛋肉丝炒饭'],
            '【外卖】螺判官螺蛳粉': ['小仙女专属苗酸螺蛳粉（不加炸蛋）', '小仙女专属苗酸螺蛳粉（加炸蛋）'],
            '【外卖】韩宫宴炭火烤肉': ['黑椒鸡腿肉拌饭'],
            '【外卖】厚府牛油拌饭（海岸城店）': ['点吧，不会后悔的牛油拌饭'],
            '【外卖】霸碗盖码饭': ['外婆菜炒鸡蛋拼剁椒土豆丝'],
            '【外卖】拌将麻辣烫': ['超值麻辣烫单人餐（经典骨汤）'],
            '【外卖】湘八爷·辣椒炒肉': ['西红柿炒鸡蛋盖码饭'],
            '【外卖】沙县小吃': ['鸡腿饭'],
            '【外卖】食拌焗·拌饭简餐便当': ['盐葱鸡排拌饭'],
            '【外卖】汀小二盖浇拌饭（k-park店）': ['招牌辣椒炒肉加番茄炒蛋盖码饭'],
            '【外卖】贵州侗娘（滨湖店）': ['牛肉蘸水菜晚餐套餐'],
            '【外卖】主厨轻食 CSALAD': ['杂粮饭版牛肉鸡肉双拼健康餐'],
            '【外卖】蔓味轻食': ['牛力满满经典牛柳意面', '鲜嫩鸡胸荞麦面'],
            '【外卖】如意馄饨': ['番茄浓汤馄饨面'],
            '【外卖】迷迭香牛肉粉': ['麻辣味原切前胸牛肉粉'],
            '【外卖】陈香贵兰州牛肉面': ['招牌牛骨清汤牛肉面加煎蛋', '现烤牛肉夹馍'],
        }
        stalls = {stall['name']: stall for stall in load_stalls()}
        for store_name, dish_names in expected.items():
            self.assertIn(store_name, stalls)
            dishes = stalls[store_name].get('dishes', [])
            actual = [dish['name'] for dish in dishes]
            for dish_name in dish_names:
                self.assertIn(dish_name, actual)
            self.assertNotEqual(store_name.removeprefix('【外卖】'), ' / '.join(dish_names))

    def test_each_dish_has_a_name_and_user_review(self):
        for stall in load_stalls():
            for dish in stall.get('dishes', []):
                self.assertIsInstance(dish.get('name'), str)
                self.assertTrue(dish['name'].strip())
                self.assertIsInstance(dish.get('review'), str)
                self.assertTrue(dish['review'].strip())
                if 'rating' in dish:
                    self.assertIsInstance(dish['rating'], (int, float))
                if dish.get('image'):
                    self.assertFalse(dish['image'].startswith(('http://', 'https://')))
                    image = ROOT / dish['image'].split('?', 1)[0].lstrip('/').replace('%20', ' ')
                    self.assertTrue(image.is_file(), f"菜品图不存在：{image}")

    def test_detail_page_contains_square_dish_cards_and_placeholder(self):
        source = DATA.read_text(encoding='utf-8')
        page = POST.read_text(encoding='utf-8')
        self.assertIn('generateDishCards(data.dishes)', source)
        self.assertIn('class="dish-card"', source)
        self.assertIn('暂无实拍图', source)
        self.assertIn('.dish-grid', page)
        self.assertIn('.dish-card {', page)
        self.assertIn('aspect-ratio: 1 / 1', page)

    def test_poster_contains_stores_and_excludes_nested_dish_names(self):
        audit = json.loads(AUDIT.read_text(encoding='utf-8'))
        poster_names = {item['sourceName'] for item in audit['items']}
        stalls = load_stalls()
        self.assertEqual(poster_names, {stall['sourceName'] for stall in stalls})
        for stall in stalls:
            for dish in stall.get('dishes', []):
                self.assertNotIn(dish['name'], poster_names)


if __name__ == '__main__':
    unittest.main()
