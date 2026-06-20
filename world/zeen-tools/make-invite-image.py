#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""程序生成「捞鱼世界邀请函」图。NFT 友好：高对比、满版纹理、非对称、无大面积纯色。"""
from PIL import Image, ImageDraw, ImageFont
import math, random
random.seed(42)

W, H = 1024, 1024
img = Image.new('RGB', (W, H), '#1a1040')
d = ImageDraw.Draw(img)

# 1. 渐变背景
for y in range(H):
    t = y / H
    r = int(26 + t*60); g = int(16 + t*20); b = int(64 - t*20)
    d.line([(0,y),(W,y)], fill=(r,g,b))

# 2. 满版星空（NFT 特征点）
for _ in range(400):
    x = random.randint(0,W); y = random.randint(0,H)
    s = random.choice([1,1,1,2,2,3])
    c = random.choice([(255,235,170),(255,255,255),(255,200,150),(200,200,255)])
    d.rectangle([x,y,x+s,y+s], fill=c)

# 3. 星云团
for _ in range(8):
    cx = random.randint(100,W-100); cy = random.randint(100,H-100)
    col = random.choice([(140,90,200),(90,140,210),(200,120,150)])
    for r in range(120,0,-10):
        alpha = int(40 * (1-r/120))
        overlay = Image.new('RGBA',(W,H),(0,0,0,0))
        od = ImageDraw.Draw(overlay)
        od.ellipse([cx-r,cy-r,cx+r,cy+r], fill=(*col,alpha))
        img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
        d = ImageDraw.Draw(img)

# 4. 中央星球
px, py, pr = W//2, H//2-40, 200
for r in range(pr, 0, -2):
    t = 1 - r/pr
    col = (int(90+t*80), int(150+t*60), int(180+t*40))
    d.ellipse([px-r,py-r,px+r,py+r], fill=col)
for _ in range(25):
    a = random.random()*math.pi*2
    rr = random.random()*pr*0.85
    x = px+math.cos(a)*rr; y = py+math.sin(a)*rr
    sz = random.randint(15,40)
    d.ellipse([x-sz,y-sz*0.7,x+sz,y+sz*0.7], fill=(100,150,60))
d.ellipse([px-pr*0.5,py-pr*0.5,px-pr*0.1,py-pr*0.1], fill=(220,240,255))

# 5. 光环
for i, thick in enumerate([10,6,3]):
    d.ellipse([px-pr-20-i*15, py-pr*0.2-i*10, px+pr+20+i*15, py+pr*0.2+i*10],
              outline=(255,210,100), width=thick)

# 6. 四角装饰（非对称）
corners = [(80,80),(W-80,80),(80,H-80),(W-80,H-80)]
for i,(cx,cy) in enumerate(corners):
    sz = 60 + i*15
    col = [(255,180,80),(120,200,255),(255,120,150),(180,255,180)][i]
    d.polygon([(cx,cy-sz),(cx+sz,cy),(cx,cy+sz),(cx-sz,cy)], fill=col, outline=(255,255,255))

# 7. 标题文字
try:
    font_big = ImageFont.truetype("C:/Windows/Fonts/georgia.ttf", 72)
    font_sm = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 40)
except:
    font_big = ImageFont.load_default(); font_sm = font_big
d.text((W//2, H-220), 'LAOYU WORLD', fill=(255,223,140), font=font_big, anchor='mm')
d.text((W//2, H-140), '捞鱼世界 邀请函', fill=(255,255,255), font=font_sm, anchor='mm')
d.text((W//2, H-70), 'scan to enter · 扫码进入', fill=(200,200,220), font=font_sm, anchor='mm')

# 8. 边框
d.rectangle([0,0,W-1,H-1], outline=(255,223,140), width=8)
d.rectangle([12,12,W-13,H-13], outline=(255,255,255), width=2)

out = r'E:/学委/作业/大三下/虚拟现实/大作业/site-dev/ar/invite-image.png'
img.save(out, 'PNG', optimize=True)
import os
print(f'生成: {out} ({os.path.getsize(out)//1024}KB, {img.size})')
