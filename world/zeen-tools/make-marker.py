#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成 AR 图案标记：黑色叉叉 + 黑色粗边框（AR.js pattern marker 标准要求高对比边框）
同时输出可用于打印的 A4 友好尺寸版本。
"""
import os
from PIL import Image, ImageDraw

OUT = r'E:/学委/作业/大三下/虚拟现实/大作业/site-dev/world/public/markers'
os.makedirs(OUT, exist_ok=True)

# AR.js pattern marker 标准：黑色边框 + 内部图案，高对比
# 做成 500x500，边框占 25%（marker 检测需要充足边框）
SIZE = 500

def make_cross(size=SIZE):
    img = Image.new('RGB', (size, size), 'white')
    d = ImageDraw.Draw(img)
    # 黑色粗边框（marker 必需，约 8% 宽度）
    bw = int(size * 0.08)
    d.rectangle([0, 0, size-1, size-1], outline='black', width=bw)
    # 内部黑色叉叉
    margin = int(size * 0.25)
    cw = int(size * 0.08)  # 叉叉线宽
    d.line([margin, margin, size-margin, size-margin], fill='black', width=cw)
    d.line([size-margin, margin, margin, size-margin], fill='black', width=cw)
    return img

def make_print_version():
    """A4 打印友好版（带说明文字和裁剪线）"""
    W, H = 1240, 1754  # A4 @150dpi
    img = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(img)
    # 标题
    try:
        from PIL import ImageFont
        font = ImageFont.truetype("arial.ttf", 40)
        fonts = ImageFont.truetype("arial.ttf", 28)
    except:
        font = fonts = None
    d.text((W//2, 80), "Desktop Mini World - AR Marker", fill='black', anchor='mt', font=font)
    d.text((W//2, 140), "(Desktop Mini World AR Marker)", fill='gray', anchor='mt', font=fonts)
    # 中央 marker（占 70% 宽度）
    msize = int(W * 0.6)
    marker = make_cross(msize)
    mx = (W - msize) // 2
    my = 220
    img.paste(marker, (mx, my))
    # 裁剪线
    d.rectangle([mx-4, my-4, mx+msize+4, my+msize+4], outline=(180,180,180), width=2)
    # 说明
    d.text((W//2, my+msize+60), "Print this, or display on another phone/screen.", fill='gray', anchor='mt', font=fonts)
    d.text((W//2, my+msize+100), "Point your camera at the marker to anchor the fairy-tale models.", fill='gray', anchor='mt', font=fonts)
    return img

# 1. 纯 marker（程序读取用）
make_cross().save(os.path.join(OUT, 'cross-pattern.png'))

# 2. 打印版
make_print_version().save(os.path.join(OUT, 'cross-pattern-print.png'))

# 3. 生成 AR.js .patt 文件（16x16 采样的颜色矩阵，AR.js 标准格式）
# patt 文件是文本，包含 marker 的降采样颜色采样
def make_patt():
    marker = make_cross(16)  # 16x16 采样
    lines = []
    for ch in range(3):  # AR.js patt 格式：3个通道分别采样
        lines.append('')  # 通道分隔空行
        for y in range(16):
            row = []
            for x in range(16):
                px = marker.getpixel((x, y))[ch]
                row.append(f'{px:3d}')
            lines.append(' '.join(row))
    return '\n'.join(lines)

with open(os.path.join(OUT, 'cross-pattern.patt'), 'w') as f:
    f.write(make_patt())

# 验证
import os
for fn in os.listdir(OUT):
    p = os.path.join(OUT, fn)
    print(f'{fn}\t{os.path.getsize(p)} bytes')
