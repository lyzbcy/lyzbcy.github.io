# -*- coding: utf-8 -*-
"""从夯到拉排名 · 一图流生成器(原版代码,2026-08 归档入仓库)

从本仓库 assets/lib-custom/ 的 tier js(canteen/takeout/noodle-tier.js)解析数据,
用 PIL 渲染「手抄报」式一图流 PNG(1080 宽,高密度排版 + 星星布丁表情包 + 捞鱼水印),
输出到 assets/img/posters/。更新排名后重跑本脚本即可重新生成三张一图流。

用法: python3 tools/generate_posters.py
依赖: Pillow(pip3 install Pillow);中文字体(macOS 自动用系统字体,Linux 自动找 Noto Sans CJK)
可选环境变量:
  TIER_REPO   = 数据仓库根(默认: 本脚本所在仓库根)
  STICKER_DIR = 表情包目录(默认: 星星布丁表情包本地路径;缺失时自动降级为无表情,不影响出图)
"""
import re, os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.environ.get('TIER_REPO', os.path.abspath(os.path.join(ROOT, '..')))
STICKER_DIR = os.environ.get('STICKER_DIR', "/Users/zeen/Documents/共享/星星布丁/微信表情包/所有表情/精选")

def _font(cands):
    for p in cands:
        if os.path.exists(p):
            return p
    return cands[-1]  # 让 PIL 报错,提示装字体

F_BOLD = _font(["/System/Library/Fonts/Hiragino Sans GB.ttc",
                "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
                "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"])
F_MED  = _font(["/System/Library/Fonts/STHeiti Medium.ttc",
                "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
                "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"])
F_LIGHT= _font(["/System/Library/Fonts/STHeiti Light.ttc",
                "/usr/share/fonts/opentype/noto/NotoSansCJK-Light.ttc",
                F_MED])
OUT_DIR = os.path.join(REPO, 'assets', 'img', 'posters')
os.makedirs(OUT_DIR, exist_ok=True)


W = 1080
PAD = 44

TIER_STYLE = {
    '夯':   dict(main=(194,57,43),  grad=(231,76,60),  tag='SSS · 无脑冲'),
    '顶级': dict(main=(211,84,0),   grad=(243,156,18), tag='S · 值得专门去'),
    '人上人':dict(main=(183,149,11), grad=(241,196,15), tag='A · 日常可吃'),
    'NPC':  dict(main=(127,140,141), grad=(149,165,166),tag='B · 无功无过'),
    '拉完了': dict(main=(85,85,85),  grad=(120,120,120),tag='C · 避雷参考'),
}
TIER_STICKERS = {
    '夯':   ['星第3弹-吃饭.png', '第12弹-开心.png'],
    '顶级': ['第12弹-心动.png', '第18弹-偷笑.png'],
    '人上人': ['第12弹-期待.png', '星第4弹-开心.png'],
    'NPC':  ['星第3弹-无语.png', '第37弹-呃.png'],
    '拉完了': ['星第3弹-呜呜.png', '第29弹-啊啊啊.png'],
}
HEADER_STICKERS = {'dine': '第35弹-吸溜.png', 'takeout': '第12弹-期待.png', 'noodle': '星第3弹-吃饭.png'}

CLOSED = ['陈凤祥', '其根']            # 已成回忆
UNCERTAIN = ['杨铭宇', '李记重庆鸡公煲', '小姐姐', 'Black Burger', '摇滚炒鸡']

def parse_js(path):
    s = open(path, encoding='utf-8').read()
    objs = re.findall(
        r"\{\s*name:\s*'([^']+)',\s*tier:\s*'([^']+)',\s*tierLabel:\s*'([^']*)',\s*rating:\s*([\d.]+),\s*description:\s*((?:'[^']*'\s*)+)",
        s)
    out = []
    for name, tier, label, rating, desc in objs:
        desc = ''.join(re.findall(r"'([^']*)'", desc))
        out.append(dict(name=name.strip(), tier=tier.strip(), label=label.strip(),
                        rating=float(rating), desc=desc.strip()))
    return out

def split_name(name):
    m = re.match(r'【([^】]*)】(.*)', name)
    return (m.group(1), m.group(2)) if m else ('', name)

def oneliner(desc, n=42):
    d = re.split(r'[。；]', desc)[0]
    return (d[:n] + '…') if len(d) > n else d

def status_of(name):
    for k in CLOSED:
        if k in name: return 'closed'
    for k in UNCERTAIN:
        if k in name: return 'uncertain'
    return None

def stars(dr, xy, rating, size=22, color=(240,173,78)):
    x, y = xy
    full = int(rating); half = (rating - full) >= 0.5
    f = ImageFont.truetype(F_MED, size)
    dr.text((x, y), '★' * (full + (1 if half else 0)) + '☆' * (5 - full - (1 if half else 0)),
            font=f, fill=color)
    return dr.textlength('★' * 5, font=f)

def paste_round(img, box, radius, fill=None, outline=None, width=2):
    dr = ImageDraw.Draw(img)
    dr.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def load_sticker(name, size):
    p = os.path.join(STICKER_DIR, name)
    if not os.path.exists(p): return None
    im = Image.open(p).convert('RGBA')
    return im.resize((size, size), Image.LANCZOS)

def add_watermark(img):
    wm_txt = Image.new('RGBA', (300, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(wm_txt)
    d.text((30, 60), '捞鱼', font=ImageFont.truetype(F_BOLD, 52), fill=(60, 60, 60, 26))
    wm_txt = wm_txt.rotate(22, expand=True)
    tile = Image.new('RGBA', (img.width + wm_txt.width, img.height + wm_txt.height), (0,0,0,0))
    for yy in range(0, tile.height, 200):
        for xx in range(0, tile.width, 260):
            tile.alpha_composite(wm_txt, (xx + (yy // 200 % 2) * 130, yy))
    img.alpha_composite(tile.crop((0, 0, img.width, img.height)))

def round_text_card(canvas, item, x, y, w, h):
    """单个店铺卡片"""
    dr = ImageDraw.Draw(canvas)
    st = status_of(item['name'])
    main = TIER_STYLE[item['tier']]['grad']
    if st == 'closed':
        paste_round(canvas, (x, y, x + w, y + h), 16, fill=(238, 238, 238), outline=(215, 215, 215))
    elif st == 'uncertain':
        paste_round(canvas, (x, y, x + w, y + h), 16, fill=(250, 246, 232), outline=(214, 197, 150))
    else:
        paste_round(canvas, (x, y, x + w, y + h), 16, fill=(255, 255, 255), outline=(232, 220, 194))
        dr.rectangle([x, y + 14, x + 6, y + h - 14], fill=main)

    loc, short = split_name(item['name'])
    pad = 20
    name_f = ImageFont.truetype(F_BOLD, 30)
    dr.text((x + pad, y + 14), short, font=name_f, fill=(60, 50, 40) if st != 'closed' else (150, 150, 150))
    if st == 'closed':
        lw = dr.textlength(short, font=name_f)
        dr.line([x + pad, y + 32, x + pad + lw, y + 32], fill=(150, 150, 150), width=3)

    yy = y + 56
    if loc:
        dr.text((x + pad, yy), loc, font=ImageFont.truetype(F_LIGHT, 20), fill=(150, 140, 120))
        yy += 28
    sw = stars(dr, (x + pad, yy), item['rating'])
    score = f"{item['rating']:.2f}" if item['rating'] % 1 else f"{item['rating']:.0f}"
    dr.text((x + pad + sw + 12, yy), score, font=ImageFont.truetype(F_MED, 22), fill=(120, 110, 95))
    if st == 'closed':
        dr.rounded_rectangle([x + w - 96, y + 12, x + w - 12, y + 40], 6, fill=(120, 120, 120))
        dr.text((x + w - 100, y + 17), '已成回忆', font=ImageFont.truetype(F_MED, 17), fill=(255, 255, 255))
    elif st == 'uncertain':
        dr.rounded_rectangle([x + w - 96, y + 12, x + w - 12, y + 40], 6, fill=(184, 134, 11))
        dr.text((x + w - 88, y + 17), '疑似歇业?', font=ImageFont.truetype(F_MED, 17), fill=(255, 255, 255))
    dr.text((x + pad, y + h - 34), oneliner(item['desc']), font=ImageFont.truetype(F_LIGHT, 21),
            fill=(125, 115, 100))

def render(kind, items, title, subtitle, foot_rule, out_name, byline='捞鱼 · 走位器 联合出品', wechat_kw=None):
    tiers = ['夯', '顶级', '人上人', 'NPC', '拉完了']
    COLS = 2
    CARD_W = (W - PAD * 2 - 20) // COLS
    CARD_H = 148

    # 预计算高度
    head_h = 320
    secs = []
    for t in tiers:
        its = [i for i in items if i['tier'] == t]
        if not its: continue
        rows = math.ceil(len(its) / COLS)
        secs.append((t, its, 96 + rows * (CARD_H + 14) + 18))
    foot_h = 210
    H = head_h + sum(h for _, _, h in secs) + foot_h + 30

    img = Image.new('RGBA', (W, H), (255, 249, 238, 255))
    dr = ImageDraw.Draw(img)

    # ---- 头部 ----
    for i in range(head_h):
        c = (int(192 + (243 - 192) * i / head_h), int(57 + (156 - 57) * i / head_h),
             int(43 + (18 - 43) * i / head_h))
        dr.line([(0, i), (W, i)], fill=c)
    # 头部装饰圆
    dr.ellipse([W - 260, -120, W + 80, 120], fill=(255, 255, 255, 30))
    dr.ellipse([-100, head_h - 140, 160, head_h + 60], fill=(255, 255, 255, 25))

    dr.text((PAD + 6, 64), title, font=ImageFont.truetype(F_BOLD, 74), fill=(255, 255, 255),
            stroke_width=2, stroke_fill=(160, 40, 30))
    dr.text((PAD + 10, 168), subtitle, font=ImageFont.truetype(F_MED, 30), fill=(255, 238, 220))
    dr.rounded_rectangle([PAD + 10, 232, PAD + 10 + 300, 272], 20, fill=(255, 255, 255))
    dr.text((PAD + 26, 240), byline, font=ImageFont.truetype(F_MED, 24), fill=(192, 57, 43))
    dr.text((W - PAD - 320, 240), '数据截至 2026-08', font=ImageFont.truetype(F_MED, 24), fill=(255, 238, 220))

    st = load_sticker(HEADER_STICKERS[kind], 190)
    if st:
        st2 = st.copy()
        st2 = st2.rotate(-8, expand=True)
        img.alpha_composite(st2, (W - 250, 70))

    # ---- 档位区 ----
    y = head_h + 10
    for t, its, sec_h in secs:
        sty = TIER_STYLE[t]
        # 档位标题条
        dr.rounded_rectangle([PAD, y, PAD + 8, y + 60], 4, fill=sty['grad'])
        dr.text((PAD + 26, y - 6), t, font=ImageFont.truetype(F_BOLD, 52), fill=sty['main'])
        tag_f = ImageFont.truetype(F_MED, 24)
        tw = dr.textlength(sty['tag'], font=tag_f)
        dr.rounded_rectangle([PAD + 140, y + 14, PAD + 152 + tw, y + 50], 18, fill=sty['grad'])
        dr.text((PAD + 146, y + 20), sty['tag'], font=tag_f, fill=(255, 255, 255))
        cnt = f"{len(its)} 家" if kind != 'noodle' else f"{len(its)} 款"
        dr.text((W - PAD - 200, y + 18), cnt, font=ImageFont.truetype(F_MED, 26), fill=(170, 158, 138))
        # 反应表情
        sname = TIER_STICKERS[t][ord(t[0]) % 2]  # 确定性选择,重跑可复现(原 hash() 带随机盐)
        st = load_sticker(sname, 72)
        if st:
            img.alpha_composite(st, (W - PAD - 108, y - 4))
        y += 76
        # 卡片网格
        for idx, it in enumerate(its):
            r, c = divmod(idx, COLS)
            cx = PAD + c * (CARD_W + 20)
            cy = y + r * (CARD_H + 14)
            round_text_card(img, it, cx, cy, CARD_W, CARD_H)
        y += math.ceil(len(its) / COLS) * (CARD_H + 14) + 26

    # ---- 底部 ----
    box_h = foot_h + 60
    dr.rounded_rectangle([PAD, y, W - PAD, y + box_h - 40], 18, fill=(255, 255, 255),
                         outline=(232, 220, 194))
    dr.text((PAD + 24, y + 16), '图例 / 规则', font=ImageFont.truetype(F_BOLD, 24), fill=(120, 100, 70))
    dr.text((PAD + 24, y + 50), foot_rule, font=ImageFont.truetype(F_LIGHT, 21), fill=(130, 118, 100))
    dr.text((PAD + 24, y + 80), '灰色划线 = 已成回忆（已歇业）   虚线框 = 疑似歇业?   ★ = 复购指数 / 店铺得分',
            font=ImageFont.truetype(F_LIGHT, 21), fill=(130, 118, 100))
    # 引流区（纯文字，无二维码无链接）
    gx_y = y + 116
    dr.rounded_rectangle([PAD, gx_y, W - PAD, y + box_h - 44], 14,
                         fill=(252, 244, 228), outline=(214, 164, 65))
    if wechat_kw:
        dr.text((PAD + 24, gx_y + 14), '📖 完整测评榜单 · 网友讨论区 · 详细口味测评',
                font=ImageFont.truetype(F_BOLD, 25), fill=(150, 90, 20))
        kw_f = ImageFont.truetype(F_BOLD, 26)
        kw_box_w = dr.textlength(wechat_kw, font=kw_f) + 28
        dr.text((PAD + 24, gx_y + 52),
                '微信搜索公众号「捞鱼的博客」，回复', font=ImageFont.truetype(F_MED, 25), fill=(90, 70, 40))
        bx = PAD + 24 + dr.textlength('微信搜索公众号「捞鱼的博客」，回复', font=ImageFont.truetype(F_MED, 25)) + 10
        dr.rounded_rectangle([bx, gx_y + 46, bx + kw_box_w, gx_y + 86], 8,
                             fill=(192, 57, 43))
        dr.text((bx + 14, gx_y + 52), wechat_kw, font=kw_f, fill=(255, 255, 255))
        dr.text((PAD + 24, gx_y + 92),
                '🤖 回复「粉丝群」加群：更多 AI 小技巧、AI 工具，以及我在用的开源免费 AI skill 分享',
                font=ImageFont.truetype(F_LIGHT, 22), fill=(130, 100, 60))
    dr.text((W // 2 - 90, H - 28), '© 捞鱼 · 完整版见博客', font=ImageFont.truetype(F_MED, 22),
            fill=(170, 158, 138))

    add_watermark(img)
    out = os.path.join(OUT_DIR, out_name)
    img.convert('RGB').save(out, 'PNG')
    print('saved', out, img.size)

if __name__ == '__main__':
    canteen = parse_js(os.path.join(REPO, 'assets/lib-custom/canteen-tier.js'))
    takeout = parse_js(os.path.join(REPO, 'assets/lib-custom/takeout-tier.js'))
    noodle  = parse_js(os.path.join(REPO, 'assets/lib-custom/noodle-tier.js'))
    print('parsed:', len(canteen), len(takeout), len(noodle))

    render('dine', canteen,
           '五六食堂 · 从夯到拉', '江南大学 · 大悦城 × 星光广场 · 堂食全档位一览',
           '评分偏严格：NPC 多为连锁下调、其实很好吃；除拉完了外都值得一试',
           'poster-dine.png', wechat_kw='江大美食')
    render('takeout', takeout,
           '外卖 · 从夯到拉', '江南大学周边外卖 · 店铺得分 = 50%菜品均分 + 50%最高分',
           '店铺得分 = 50% × 菜品平均分 + 50% × 最高菜品分；肯德基/麦当劳早餐已移堂食篇',
           'poster-takeout.png', byline='捞鱼 · 一单一单吃出来的', wechat_kw='江大美食')
    render('noodle', noodle,
           '方便面 · 从夯到拉', '教育超市全口味测评 · 一碗一碗吃出来的排名',
           '档位：夯→顶级→人上人→NPC→拉完了；卡片含口味 / 复购指数 / 一句话点评',
           'poster-noodle.png', byline='捞鱼 · 一碗一碗吃出来的', wechat_kw='方便面')
