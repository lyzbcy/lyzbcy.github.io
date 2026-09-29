#!/usr/bin/env python3
"""三榜唯一一图流生成器。python tools/generate_posters.py --all；详见仓库 skill。"""
from __future__ import annotations

import argparse
from collections import Counter
from decimal import Decimal, InvalidOperation
from functools import lru_cache
import hashlib
import io
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from urllib.parse import unquote

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
RESOURCES = ROOT / 'assets/img/posters/resources'
FONT_PATH = RESOURCES / 'fonts/NotoSansSC[wght].ttf'
EMOJI_FONT_PATH = RESOURCES / 'fonts/NotoEmoji[wght].ttf'
WIDTH, PAD, GAP = 1440, 48, 24
CARD_WIDTH = (WIDTH - PAD * 2 - GAP) // 2
PAPER, INK, MUTED = '#F6F1E7', '#292A28', '#73736C'
TIERS = ['夯', '顶级', '人上人', 'NPC', '拉完了']
COLORS = ['#BD352C', '#C46628', '#537653', '#647880', '#746977']
WATERMARK_TEXT = '捞鱼的博客'
WATERMARK_OPACITY = 24
WATERMARK_ANGLE = 22
STICKERS = ['第12弹-开心.png', '第12弹-心动.png', '第12弹-期待.png',
            '第37弹-呃.png', '星第3弹-呜呜.png']
CONFIG = {
    'dine': dict(stem='canteen', title='五六食堂', subtitle='江南大学 · 大悦城 / 星光广场',
                 unit='家', keyword='江大美食', sticker='第35弹-吸溜.png'),
    'takeout': dict(stem='takeout', title='江南大学外卖', subtitle='一单一单吃出来的周边外卖榜',
                    unit='家', keyword='江大美食', sticker='第12弹-期待.png'),
    'noodle': dict(stem='noodle', title='方便面', subtitle='一碗一碗吃出来的口味榜',
                   unit='款', keyword='方便面', sticker='星第3弹-吃饭.png'),
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def exact_score(item: dict, kind: str) -> tuple[str, str]:
    """rating is a legacy tier index for noodles, NOT the author's score."""
    label = item.get('tierLabel', '')
    pattern = (r'(\d+(?:\.\d+)?)\s*(?:❤\ufe0f?|♥|星)' if kind == 'noodle'
               else r'(?:店铺得分|评分)\s*(\d+(?:\.\d+)?)' if kind == 'takeout'
               else r'(\d+(?:\.\d+)?)\s*星')
    matches = re.findall(pattern, label)
    if kind == 'noodle' and not matches and label.split('·')[-1].strip() == '史':
        return '史', 'tierLabel'
    if len(matches) > 1 or (kind == 'noodle' and len(matches) != 1):
        raise ValueError(f"{item['name']}: 无法唯一确定原始评分：{label!r}")
    score = matches[0] if matches else str(item['rating'])
    try:
        value = Decimal(score)
    except InvalidOperation as exc:
        raise ValueError(f"{item['name']}: 非法评分 {score}") from exc
    if not value.is_finite() or value < 0:
        raise ValueError(f"{item['name']}: 非法评分 {score}")
    return score, ('tierLabel' if matches else 'rating')


def load_items(kind: str, root: Path = ROOT) -> list[dict]:
    result = subprocess.run(['node', str(ROOT / 'tools/export_tier_data.cjs'), str(root), kind],
                            capture_output=True, encoding='utf-8', check=True)
    items = json.loads(result.stdout)
    if not items:
        raise ValueError(f'{kind}: 数据为空，停止生成')
    names = set()
    for item in items:
        if item['name'] in names or item['tier'] not in TIERS:
            raise ValueError(f"{kind}: 重名或未知档位：{item['name']}")
        names.add(item['name'])
        if not isinstance(item.get('description'), str) or not item['description'].strip():
            raise ValueError(f"{item['name']}: 缺少评价")
        item['score'], item['scoreSource'] = exact_score(item, kind)
        item['estimated'] = bool(re.search(r'[（(]估[）)]', item.get('tierLabel', '')))
    if kind != 'noodle':
        # Match populateTierList() in the website; stable ties retain source order.
        items.sort(key=lambda item: (TIERS.index(item['tier']), -Decimal(str(item['rating']))))
    return items


@lru_cache(maxsize=None)
def font(size: int, bold: bool = False):
    face = ImageFont.truetype(str(FONT_PATH), size)
    face.set_variation_by_axes([700 if bold else 400])
    return face


@lru_cache(maxsize=2)
def supported_characters(path=FONT_PATH):
    with TTFont(path, lazy=True) as face:
        return set(face.getBestCmap())


@lru_cache(maxsize=None)
def emoji_font(size):
    face = ImageFont.truetype(str(EMOJI_FONT_PATH), size)
    face.set_variation_by_axes([400])
    return face


def text_runs(text, face):
    chunks = []
    for char in text:
        chosen = face if ord(char) in supported_characters() else emoji_font(face.size)
        if chunks and chunks[-1][1] is chosen:
            chunks[-1] = (chunks[-1][0] + char, chosen)
        else:
            chunks.append((char, chosen))
    return chunks


def display_text(text: str) -> str:
    # Whitespace normalization only; keep punctuation, names and the author's wording.
    text = re.sub(r'\s+', ' ', text).strip()
    text = text.replace('\ufe0f', '').replace('\ufe0e', '')  # monochrome emoji presentation
    available = supported_characters() | supported_characters(EMOJI_FONT_PATH)
    missing = {c for c in text if ord(c) not in available}
    if missing:
        raise ValueError(f'字体缺字 {sorted(missing)!r}，请补字体/符号支持，不得静默输出方框')
    return text


MEASURE = ImageDraw.Draw(Image.new('RGB', (1, 1)))


def text_width(text, face):
    return sum(MEASURE.textlength(run, font=f) for run, f in text_runs(text, face))


def wrap_text(text: str, face, width: int, max_lines: int | None = None):
    """Pixel-based wrapping. An excerpt always reserves room for its ellipsis."""
    text = display_text(text)
    lines = []
    remaining = text
    no_start = set('，。！？；：、）》】」』…,.!?;:%）')
    no_end = set('（《【「『(')
    while remaining:
        end = 0
        while end < len(remaining) and text_width(remaining[:end + 1], face) <= width:
            end += 1
        if not end:
            raise ValueError('文本区域比单个字还窄')
        if end < len(remaining):
            original_end = end
            # Prefer keeping Latin words, decimals and units on the same line.
            if re.match(r'[A-Za-z0-9.]', remaining[end - 1]) and re.match(r'[A-Za-z0-9.]', remaining[end]):
                while end > 0 and re.match(r'[A-Za-z0-9.]', remaining[end - 1]):
                    end -= 1
                if end == 0:  # Very long unbroken token: hard wrapping is necessary.
                    end = original_end
            while end > 1 and (remaining[end] in no_start or remaining[end - 1] in no_end):
                end -= 1
        lines.append(remaining[:end])
        remaining = remaining[end:]
    truncated = max_lines is not None and len(lines) > max_lines
    if truncated:
        lines = lines[:max_lines]
        while lines[-1] and text_width(lines[-1] + '…', face) > width:
            lines[-1] = lines[-1][:-1]
        lines[-1] = lines[-1].rstrip('（《【「『(')
        lines[-1] += '…'
    return lines, truncated


def split_name(name):
    prefix = re.fullmatch(r'【([^】]+)】(.*)', name)
    suffix = re.fullmatch(r'(.*?)【([^】]+)】', name)
    if prefix:
        return prefix[2], prefix[1]
    if suffix:
        return suffix[1], suffix[2]
    return name, ''


def image_path(item):
    value = item.get('bgImage', '')
    match = re.fullmatch(r'url\([\s\'"]*(.*?)[\s\'"]*\)', value)
    if match:
        value = match[1]
    relative = unquote(value).lstrip('/')
    target = (ROOT / relative).resolve()
    if not relative or not target.is_relative_to(ROOT.resolve()) or not target.is_file():
        raise ValueError(f"{item['name']}: 缺少有效商品图片 {value!r}")
    return target


def card_layout(item, kind):
    title, meta = split_name(item['name'])
    title_width = CARD_WIDTH - 48 - (120 if kind == 'noodle' else 0)
    names, _ = wrap_text(title, font(32, True), title_width)
    metas, _ = wrap_text(meta, font(23), title_width)
    intro, truncated = wrap_text(item['description'], font(27), CARD_WIDTH - 48, 3)
    title_height = len(names) * 43 + (len(metas) * 31 + 7 if metas else 0)
    score_y = 24 + max(100 if kind == 'noodle' else 0, title_height) + 16
    description_y = score_y + 58
    height = description_y + len(intro) * 39 + 24
    return dict(names=names, metas=metas, intro=intro, truncated=truncated,
                title_width=title_width, score_y=score_y, description_y=description_y, height=height)


class Painter:
    def __init__(self, height):
        self.image = Image.new('RGB', (WIDTH, height), PAPER)
        self.draw = ImageDraw.Draw(self.image)
        self.text_regions = 0

    def text(self, xy, value, size, color=INK, bold=False, width=None, height=None):
        value = display_text(value)
        x, y = xy
        face = font(size, bold)
        cursor = x
        for run, run_font in text_runs(value, face):
            box = self.draw.textbbox((cursor, y), run, font=run_font, anchor='lt')
            if (box[0] < 0 or box[1] < 0 or box[2] > WIDTH or box[3] > self.image.height
                    or (width is not None and box[2] > x + width + 0.5)
                    or (height is not None and box[3] > y + height)):
                raise ValueError(f'文字溢出：{value!r} bbox={box} area={width}x{height}')
            self.draw.text((cursor, y), run, font=run_font, fill=color, anchor='lt')
            cursor += self.draw.textlength(run, font=run_font)
        self.text_regions += 1

    def lines(self, xy, lines, size, step, width, color=INK, bold=False):
        for i, line in enumerate(lines):
            self.text((xy[0], xy[1] + i * step), line, size, color, bold, width, step)

    def sticker(self, name, box):
        path = RESOURCES / 'stickers' / name
        with Image.open(path) as raw:
            stamp = ImageOps.contain(raw.convert('RGBA'), (box[2], box[3]), Image.Resampling.LANCZOS)
        self.image.paste(stamp, (box[0] + (box[2] - stamp.width) // 2,
                                box[1] + (box[3] - stamp.height) // 2), stamp)

    def star(self, x, y, color):
        points = []
        for i in range(10):
            a = -math.pi / 2 + i * math.pi / 5
            r = 15 if i % 2 == 0 else 7
            points.append((x + 16 + math.cos(a) * r, y + 17 + math.sin(a) * r))
        self.draw.polygon(points, fill=color)


def draw_cta(painter, y, keyword):
    d = painter.draw
    d.rounded_rectangle((PAD, y, WIDTH - PAD, y + 152), radius=24, fill=INK)
    painter.text((PAD + 28, y + 24), '完整榜单测评 · 详细评价 · 持续更新', 32, '#FFF9EA', True, 1080, 40)
    painter.text((PAD + 28, y + 80), f'微信搜公众号「捞鱼的博客」  回复「{keyword}」', 32, '#FFE1A8', width=1220, height=45)
    painter.text((WIDTH - PAD - 143, y + 28), '收藏再看', 25, '#FFE1A8', width=130, height=35)


def add_watermark(image):
    """Apply to the finished canvas, including cards, so a crop retains attribution."""
    face = font(42, True)
    stamp = Image.new('RGBA', (280, 92), (0, 0, 0, 0))
    ImageDraw.Draw(stamp).text((14, 22), WATERMARK_TEXT, font=face, anchor='lt',
                              fill=(80, 66, 54, WATERMARK_OPACITY))
    stamp = stamp.rotate(WATERMARK_ANGLE, resample=Image.Resampling.BICUBIC, expand=True)
    overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
    count = 0
    for row, y in enumerate(range(35, image.height, 260)):
        for x in range(-210 if row % 2 else 30, image.width, 480):
            overlay.alpha_composite(stamp, (x, y))
            count += 1
    result = Image.alpha_composite(image.convert('RGBA'), overlay).convert('RGB')
    return result, dict(text=WATERMARK_TEXT, opacity=WATERMARK_OPACITY,
                        angle=WATERMARK_ANGLE, count=count)


def build_poster(kind, items):
    config = CONFIG[kind]
    y = 666
    sections = []
    audit_items = []
    for tier, color, sticker in zip(TIERS, COLORS, STICKERS):
        group = [item for item in items if item['tier'] == tier]
        if not group:
            continue
        section = dict(tier=tier, color=color, sticker=sticker, y=y, count=len(group), cards=[])
        y += 110
        for i in range(0, len(group), 2):
            pair = [(item, card_layout(item, kind)) for item in group[i:i + 2]]
            row_height = max(layout['height'] for _, layout in pair)
            for col, (item, layout) in enumerate(pair):
                section['cards'].append((item, layout, PAD + col * (CARD_WIDTH + GAP), y, row_height))
            y += row_height + GAP
        y += 26
        sections.append(section)
    footer_y = y + 2
    height = footer_y + 374
    p = Painter(height)
    d = p.draw
    d.rectangle((0, 0, WIDTH, 12), fill=COLORS[0])
    p.text((PAD, 50), '捞鱼的博客 / 吃过才来排', 27, MUTED, width=850, height=40)
    p.text((PAD - 2, 121), config['title'], 98, INK, True, 1080, 118)
    p.text((PAD - 2, 253), '从夯到拉', 118, COLORS[0], True, 850, 142)
    p.sticker(config['sticker'], (1120, 115, 264, 280))
    p.text((PAD + 2, 420), config['subtitle'], 29, MUTED, width=920, height=42)
    p.text((WIDTH - PAD - 280, 428), f"亲测 {len(items)} {config['unit']} / 一图收藏", 25, MUTED, width=280, height=38)
    draw_cta(p, 484, config['keyword'])

    for section in sections:
        tier, color, sy = section['tier'], section['color'], section['y']
        d.rounded_rectangle((PAD, sy + 18, PAD + 9, sy + 73), radius=4, fill=color)
        p.text((PAD + 27, sy + 20), tier, 53, color, True, 350, 70)
        tag_x = PAD + 50 + math.ceil(text_width(tier, font(53, True)))
        p.text((tag_x, sy + 42), f"{section['count']} {config['unit']}", 26, MUTED, width=160, height=36)
        d.line((tag_x + 146, sy + 62, WIDTH - PAD - 140, sy + 62), fill='#DBD5C9', width=2)
        p.sticker(section['sticker'], (WIDTH - PAD - 105, sy, 94, 96))
        for item, layout, x, cy, h in section['cards']:
            fill = '#ECEBE6' if item['status'] == 'closed' else '#FFFFFF'
            d.rounded_rectangle((x, cy, x + CARD_WIDTH, cy + h), radius=22, fill=fill, outline='#E1DCD2', width=2)
            p.lines((x + 24, cy + 24), layout['names'], 32, 43, layout['title_width'], bold=True)
            my = cy + 24 + len(layout['names']) * 43 + 7
            p.lines((x + 24, my), layout['metas'], 23, 31, layout['title_width'], MUTED)
            if kind == 'noodle':
                with Image.open(image_path(item)) as raw:
                    thumb = ImageOps.contain(raw.convert('RGBA'), (100, 100), Image.Resampling.LANCZOS)
                p.image.paste(thumb, (x + CARD_WIDTH - 126 + (100 - thumb.width) // 2, cy + 24), thumb)
            ry = cy + layout['score_y']
            numeric = bool(re.fullmatch(r'\d+(?:\.\d+)?', item['score']))
            score_label = (f"{item['score']} 星" if numeric else f"原评：{item['score']}") + ('（估）' if item['estimated'] else '')
            pill_width = math.ceil(text_width(score_label, font(31, True))) + 69
            d.rounded_rectangle((x + 24, ry - 4, x + 24 + pill_width, ry + 42), radius=12, fill='#F6F1E7')
            if numeric:
                p.star(x + 35, ry + 1, color)
            p.text((x + 78, ry + 1), score_label, 31, color, True, pill_width - 59, 40)
            if item['status']:
                label = '已成回忆 / 已歇业' if item['status'] == 'closed' else '疑似歇业'
                sx = x + 24 + pill_width + 20
                p.text((sx, ry + 8), label, 22, MUTED, width=x + CARD_WIDTH - 24 - sx, height=30)
            p.lines((x + 24, cy + layout['description_y']), layout['intro'], 27, 39, CARD_WIDTH - 48, '#565850')
            audit_items.append(dict(name=item['name'], sourceName=item['sourceName'], tier=tier,
                                    score=item['score'], scoreSource=item['scoreSource'],
                                    estimated=item['estimated'], status=item['status'],
                                    description=item['description'], excerpt=''.join(layout['intro']),
                                    truncated=layout['truncated'], box=[x, cy, CARD_WIDTH, h]))
    draw_cta(p, footer_y, config['keyword'])
    p.text((PAD + 4, footer_y + 181), '回复「粉丝群」：交流美食，也分享 AI 工具与免费 skill', 27, INK, width=WIDTH - 2 * PAD, height=40)
    rule = ('保留原始评分，不取整。方便面有 6 星；不同榜单的评分体系不同。' if kind == 'noodle'
            else '保留原始评分，不取整。档位与星级均按作者原榜单，部分评分为估分。')
    p.text((PAD + 4, footer_y + 235), rule, 23, MUTED, width=WIDTH - 2 * PAD, height=34)
    p.text((PAD + 4, footer_y + 274), '简介为原文节选，省略处标「…」；完整评价、价格与讨论请看完整榜单。', 23, MUTED, width=WIDTH - 2 * PAD, height=34)
    d.line((PAD, footer_y + 326, WIDTH - PAD, footer_y + 326), fill='#D6D1C7', width=2)
    p.text((PAD, footer_y + 342), '捞鱼亲测 · 主观口味，仅供参考', 21, MUTED, width=800, height=30)
    p.text((WIDTH - PAD - 262, footer_y + 342), 'lyzbcy.github.io', 24, MUTED, width=262, height=32)
    p.image, watermark = add_watermark(p.image)
    stream = io.BytesIO()
    p.image.save(stream, format='PNG', optimize=True)
    return stream.getvalue(), dict(schema=1, kind=kind, size=[WIDTH, height], count=len(items),
                                  tierCounts=dict(Counter(item['tier'] for item in items)),
                                  checkedTextRegions=p.text_regions, overflowCount=0,
                                  stickerCount=1 + len(sections), ctaCount=2,
                                  watermark=watermark, items=audit_items)


def input_hashes(kind, items):
    stem = CONFIG[kind]['stem']
    files = [ROOT / 'tools/generate_posters.py', ROOT / 'tools/export_tier_data.cjs',
             ROOT / f'assets/lib-custom/{stem}-tier.js', ROOT / f'assets/lib-custom/{stem}-tier-extras.js', FONT_PATH, EMOJI_FONT_PATH]
    names = {CONFIG[kind]['sticker'], *STICKERS}
    files.extend(RESOURCES / 'stickers' / name for name in sorted(names))
    if kind == 'noodle':
        files.extend(image_path(item) for item in items)
    def content(path):
        raw = path.read_bytes()
        return raw.replace(b'\r\n', b'\n') if path.suffix in {'.py', '.cjs', '.js'} else raw
    return {path.relative_to(ROOT).as_posix(): digest(content(path)) for path in sorted(set(files))}


def check_outputs(kind, items, out_dir):
    manifest = json.loads((out_dir / f'poster-{kind}.audit.json').read_text(encoding='utf-8'))
    if manifest['inputs'] != input_hashes(kind, items):
        raise ValueError(f'{kind}: 输入已更新而海报未刷新，请运行 --all')
    png = out_dir / f'poster-{kind}.png'
    if digest(png.read_bytes()) != manifest['pngSha256']:
        raise ValueError(f'{kind}: 图片与验收记录不匹配')
    expected = [(i['sourceName'], i['score']) for t in TIERS for i in items if i['tier'] == t]
    actual = [(i['sourceName'], i['score']) for i in manifest['items']]
    if expected != actual or manifest['overflowCount'] or manifest['ctaCount'] != 2 or manifest['stickerCount'] < 2:
        raise ValueError(f'{kind}: 条目、评分、引流或布局验收失败')
    watermark = manifest.get('watermark', {})
    if (watermark.get('text') != WATERMARK_TEXT or watermark.get('opacity') != WATERMARK_OPACITY
            or watermark.get('angle') != WATERMARK_ANGLE or watermark.get('count', 0) <= 0):
        raise ValueError(f'{kind}: 缺少统一水印，请重新生成，不能用署名代替水印')
    with Image.open(png) as im:
        if list(im.size) != manifest['size']:
            raise ValueError(f'{kind}: 图片尺寸异常')
        im.verify()
    return manifest


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--all', action='store_true', help='生成三个榜单（默认）')
    group.add_argument('--kind', choices=CONFIG, help='只生成指定榜单')
    parser.add_argument('--check', action='store_true', help='检查图片、原始数据与验收记录一致，不写文件')
    parser.add_argument('--out-dir', type=Path, default=ROOT / 'assets/img/posters')
    args = parser.parse_args(argv)
    kinds = [args.kind] if args.kind else list(CONFIG)
    try:
        loaded = {kind: load_items(kind) for kind in kinds}
        if args.check:
            for kind, items in loaded.items():
                audit = check_outputs(kind, items, args.out_dir)
                print(f"OK {kind}: {audit['count']} items, exact scores, 2 CTAs, {audit['stickerCount']} stickers, {audit['watermark']['count']} watermarks, no overflow")
            return 0
        # Validate/render every requested output BEFORE replacing any existing poster.
        rendered = []
        for kind, items in loaded.items():
            hashes = input_hashes(kind, items)
            png, audit = build_poster(kind, items)
            audit.update(inputs=hashes, pngSha256=digest(png))
            rendered.append((kind, png, audit))
        args.out_dir.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=args.out_dir) as temp:
            pending = []
            for kind, png, audit in rendered:
                for name, data in [(f'poster-{kind}.png', png),
                                   (f'poster-{kind}.audit.json', (json.dumps(audit, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))]:
                    path = Path(temp) / name
                    path.write_bytes(data)
                    pending.append(path)
            for path in pending:
                path.replace(args.out_dir / path.name)
        for kind, _, audit in rendered:
            print(f"OK {kind}: {audit['count']} items, {audit['size']}, {audit['checkedTextRegions']} text regions, 0 overflow")
        return 0
    except (ValueError, OSError, KeyError, subprocess.SubprocessError) as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
