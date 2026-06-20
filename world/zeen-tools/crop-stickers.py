#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
裁剪微信表情包为 webp，按情绪分类。
去白边/近白边/纯色背景，缩放至 128x128，质量 80。
"""
import os, glob, sys
from PIL import Image, ImageChops

SRC_BASE = r'E:/星星布丁/微信表情包'
DST = r'E:/学委/作业/大三下/虚拟现实/大作业/site-dev/world/public/stickers'

# 情绪关键词 → 分类（NPC 情绪映射用）
MOOD_MAP = {
    '哭': '哭', '呜呜': '哭', '呜哇': '哭',
    '哼': '生气', '无语': '无语', '哦哟': '无语',
    '亲亲': '亲亲', '亲手': '亲亲', '贴贴': '亲亲',
    '好的': '开心', '嗯嗯': '开心',
    '吃饭': '吃饭', '我吗': '疑惑', '随便': '随意',
    '不要': '拒绝', '错惹': '拒绝',
}

def trim_white_border(im):
    """去近白背景边框"""
    if im.mode != 'RGBA':
        im = im.convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 0))
    # 用 alpha 做裁剪基准（透明背景的表情包）
    bbox_alpha = im.split()[3].getbbox()
    if bbox_alpha:
        # 扩展一点边距
        l, t, r, b = bbox_alpha
        pad = 6
        l = max(0, l - pad); t = max(0, t - pad)
        r = min(im.width, r + pad); b = min(im.height, b + pad)
        im = im.crop((l, t, r, b))
    return im

def process_file(src, out_name):
    try:
        im = Image.open(src)
        # GIF 取第一帧
        if getattr(im, 'is_animated', False):
            im.seek(0)
        im = im.convert('RGBA')
        im = trim_white_border(im)
        # 居中放到 128x128 透明画布，保持比例
        target = 128
        ratio = min(target / im.width, target / im.height) * 0.9
        new_w, new_h = int(im.width * ratio), int(im.height * ratio)
        im = im.resize((new_w, new_h), Image.LANCZOS)
        canvas = Image.new('RGBA', (target, target), (255, 255, 255, 0))
        canvas.paste(im, ((target - new_w) // 2, (target - new_h) // 2), im)
        out_path = os.path.join(DST, out_name)
        canvas.save(out_path, 'webp', quality=80, method=4)
        return out_path
    except Exception as e:
        print(f'  SKIP {src}: {e}', file=sys.stderr)
        return None

def main():
    os.makedirs(DST, exist_ok=True)
    # 收集所有表情包目录（带中文情绪文件名的）
    dirs = [
        '星星布丁第三弹',
        '星星布丁第五弹',
        '星星布丁第二弹',
        '周三涵做表情1',
    ]
    results = []  # (filename, mood_label, orig_name)
    idx = 0
    for d in dirs:
        full = os.path.join(SRC_BASE, d)
        if not os.path.isdir(full):
            continue
        for f in sorted(os.listdir(full)):
            if not f.lower().endswith(('.png', '.gif', '.jpg')):
                continue
            stem = os.path.splitext(f)[0]
            # 匹配情绪
            mood = '其他'
            for kw, m in MOOD_MAP.items():
                if kw in stem:
                    mood = m
                    break
            out_name = f'sticker_{idx:02d}.webp'
            path = process_file(os.path.join(full, f), out_name)
            if path:
                results.append((out_name, mood, stem))
                idx += 1
            if idx >= 28:
                break
        if idx >= 28:
            break

    # 输出映射 JSON
    import json
    mapping = []
    for fn, mood, orig in results:
        mapping.append({'file': fn, 'mood': mood, 'orig': orig})
    json_path = os.path.join(DST, '..', '..', 'src', 'data', 'stickers_index.json')
    os.makedirs(os.path.dirname(json_path), exist_ok=True)
    with open(json_path, 'w', encoding='utf-8') as fp:
        json.dump(mapping, fp, ensure_ascii=False, indent=2)

    # 体积统计
    total = sum(os.path.getsize(os.path.join(DST, r[0])) for r in results)
    print(f'OK: {len(results)} stickers, total {total/1024:.1f} KB')
    print(f'JSON: {json_path}')
    for fn, mood, orig in results:
        print(f'  {fn}\t{mood}\t{orig}')

if __name__ == '__main__':
    main()
