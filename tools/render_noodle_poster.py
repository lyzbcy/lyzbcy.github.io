#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
render_noodle_poster.py — 方便面一图流渲染器 v2 (2026-08-18 ZCode 重写)

用法: python3 tools/render_noodle_poster.py
  数据源: assets/lib-custom/noodle-tier.js (用 node 导出)
  图片库: assets/image library/noodle-tier-images/
  顶部/底部区: 复用旧海报烘焙素材(卡通/标题胶囊/引流条), 保证风格不走样
  输出: assets/img/posters/poster-noodle.png

改排名/新增条目后重跑本脚本即可更新一图流 (git push 前跑)。
输出直接覆盖 poster-noodle.png; 渲染不满意 git checkout -- 该png 即可回滚。
"""
import json, math, os, re, subprocess, sys, tempfile

REPO = "/home/openclaw-shared/lyzbcy.github.io"
JS = os.path.join(REPO, "assets/lib-custom/noodle-tier.js")
OLD_PNG = os.path.join(REPO, "assets/img/posters/poster-noodle.png")   # 旧海报(素材源)
OUT = os.path.join(REPO, "assets/img/posters/poster-noodle.png")   # 直接覆盖; 搞坏了 git checkout 恢复
IMGDIR = os.path.join(REPO, "assets/image library/noodle-tier-images")
FONT_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_REG = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"

from PIL import Image, ImageDraw, ImageFont, ImageFilter

W = 1080
CREAM = (255, 249, 238)

TIER_ORDER = ["夯", "顶级", "人上人", "NPC", "拉完了"]
TIER_HEARTS = {"夯": 6, "顶级": 5, "人上人": 4, "NPC": 3, "拉完了": 2}
TIER_COLOR = {
    "夯": (5, 150, 105), "顶级": (16, 185, 129), "人上人": (245, 158, 11),
    "NPC": (249, 115, 22), "拉完了": (220, 38, 38),
}
HEART_RED = (239, 68, 68)
TEXT_DARK = (31, 41, 55)
TEXT_GRAY = (107, 114, 128)

# ── 1. 数据: node 解析 noodle-tier.js ──
node_code = (
    "const fs=require('fs');const s=fs.readFileSync(%r,'utf8');"
    "const m=s.match(/const noodles = \\[([\\s\\S]*?)\\n\\s*\\];/);"
    "if(!m){console.error('no noodles array');process.exit(1)};"
    "eval('var imageBasePath=\"\";var encodeURIComponent=function(s){return s};var noodles=['+m[1]+']');"
    "console.log(JSON.stringify(noodles.map(n=>({name:n.name,tier:n.tier,"
    "hearts:parseInt((n.tierLabel||'').match(/(\\d+)/)||[0]),desc:n.description,"
    "img:(n.bgImage||'').match(/'([^']+)'/)?((n.bgImage||'').match(/'([^']+)'/)[1]):null}))))"
) % JS
r = subprocess.run(["node", "-e", node_code], capture_output=True, text=True)
if r.returncode != 0:
    print("node 解析失败:", r.stderr[:300]); sys.exit(1)
noodles = json.loads(r.stdout.strip().splitlines()[-1])
print(f"解析 {len(noodles)} 款")

# ── 2. 字体 ──
def F(size, bold=True):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size, index=0)

# ── 3. 心形绘制 ──
def draw_heart(d, cx, cy, s, color=HEART_RED):
    """s=边长. 两圆+三角"""
    r = s * 0.25
    d.ellipse([cx-s/2, cy-s/2, cx-s/2+2*r, cy-s/2+2*r], fill=color)
    d.ellipse([cx-s/2+2*r, cy-s/2, cx+s/2, cy-s/2+2*r], fill=color)
    d.polygon([(cx-s/2+1, cy), (cx+s/2-1, cy), (cx, cy+s/2+r*0.9)], fill=color)

# ── 4. 圆角图片 ──
def round_img(im, rad):
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.size[0]-1, im.size[1]-1], rad, fill=255)
    im = im.convert("RGB")
    im.putalpha(mask)
    return im

# ── 5. 布局参数 ──
CARD_H, CARD_PAD_X, IMG_S, IMG_RAD = 148, 24, 116, 16
CARD_GAP = 14
BANNER_H, BANNER_GAP = 60, 18
TEXT_X = CARD_PAD_X + IMG_S + 22

# ── 6. 先算总高 ──
groups = {t: [n for n in noodles if n["tier"] == t] for t in TIER_ORDER}
total_h = 340 + 24  # 顶部 + 顶 margin
for t in TIER_ORDER:
    total_h += BANNER_H + BANNER_GAP + len(groups[t]) * (CARD_H + CARD_GAP)
total_h += 40  # 底部区前留白
old = Image.open(OLD_PNG).convert("RGB")
old.load()  # 先载入内存(输出会覆盖同一文件)
# 底部素材: 扫描旧图找引流胶囊起点 (y 3400-3722 中间大范围深色)
footer_y = None
for y in range(3400, old.height):
    row = old.crop((200, y, 880, y+1)).resize((1, 1))
    p = row.getpixel((0, 0))
    if 0.3*p[0]+0.6*p[1]+0.1*p[2] < 150:
        footer_y = y - 6  # 上方留 6px 呼吸
        break
if footer_y is None:
    footer_y = old.height - 160
footer_crop = old.crop((0, footer_y, W, old.height))
total_h += footer_crop.height
print(f"顶部340 底部素材 y={footer_y}~{old.height} (高{footer_crop.height}) 总高 {total_h}")

# ── 7. 画布 ──
canvas = Image.new("RGB", (W, total_h), CREAM)
draw = ImageDraw.Draw(canvas)

# 顶部复用 + 副标题改款数
canvas.paste(old.crop((0, 0, W, 340)), (0, 0))
bg = old.getpixel((140, 300))  # 采样副标题行背景
draw.rectangle([260, 280, 820, 330], fill=bg)
sub = "捞鱼亲测 · %d 款" % len(noodles)
f_sub = F(30, True)
tw = draw.textlength(sub, font=f_sub)
draw.text(((W-tw)/2, 288), sub, font=f_sub, fill=(5, 120, 87))

# ── 8. 档位区 ──
y = 364
for t in TIER_ORDER:
    items = groups[t]
    color = TIER_COLOR[t]
    # 横幅胶囊
    bx0, bx1 = 60, W-60
    draw.rounded_rectangle([bx0, y, bx1, y+BANNER_H], 30, fill=color)
    f_tier = F(32, True)
    label = t
    if t == "NPC":
        label = "NPC (还行)"
    draw.text((bx0+34, y+BANNER_H/2-22), label, font=f_tier, fill="white")
    # 右侧心形 ×N
    hearts = TIER_HEARTS[t]
    hs = 26
    for i in range(hearts):
        draw_heart(draw, bx1-30 - i*(hs+7) - hs/2, y+BANNER_H/2, hs)
    # 款数 (胶囊内 中部)
    cnt = "%d 款" % len(items)
    f_cnt = F(24, False)
    cw = draw.textlength(cnt, font=f_cnt)
    draw.text((bx1-30-hearts*(hs+7)-24-cw, y+BANNER_H/2-16), cnt, font=f_cnt, fill=(255,255,255,220))
    y += BANNER_H + BANNER_GAP
    # 卡片
    for n in items:
        draw.rounded_rectangle([36, y, W-36, y+CARD_H], 20, fill="white",
                               outline=(240, 236, 228), width=2)
        # 产品图
        img_path = os.path.join(IMGDIR, n["img"]) if n["img"] else None
        placed = False
        if img_path and os.path.exists(img_path):
            try:
                pim = Image.open(img_path).convert("RGB")
                # 方形居中裁剪
                side = min(pim.size)
                pim = pim.crop(((pim.width-side)//2, (pim.height-side)//2,
                                (pim.width+side)//2, (pim.height+side)//2))
                pim = pim.resize((IMG_S, IMG_S), Image.LANCZOS)
                canvas.paste(round_img(pim, IMG_RAD), (CARD_PAD_X, y+(CARD_H-IMG_S)//2), round_img(pim, IMG_RAD))
                placed = True
            except Exception as e:
                print("图失败", n["img"], e)
        if not placed:
            draw.rounded_rectangle([CARD_PAD_X, y+(CARD_H-IMG_S)//2,
                                    CARD_PAD_X+IMG_S, y+(CARD_H-IMG_S)//2+IMG_S], IMG_RAD,
                                   fill=(243, 244, 246))
        # 名称
        f_name = F(30, True)
        draw.text((TEXT_X, y+26), n["name"], font=f_name, fill=TEXT_DARK)
        # 名称右侧心形×hearts (tierLabel 里的心数)
        nh = n.get("hearts") or TIER_HEARTS[t]
        nhs = 20
        name_w = draw.textlength(n["name"], font=f_name)
        for i in range(nh):
            draw_heart(draw, TEXT_X + name_w + 18 + i*(nhs+6) + nhs/2, y+42, nhs)
        # 简评 (2行截断)
        desc = n["desc"] or ""
        f_desc = F(22, False)
        # 按宽度折行
        lines, cur = [], ""
        for ch in desc:
            if draw.textlength(cur + ch, font=f_desc) > W - TEXT_X - 60:
                lines.append(cur); cur = ch
                if len(lines) == 2: break
            else:
                cur += ch
        if len(lines) < 2 and cur:
            lines.append(cur)
        if len(lines) == 2 and (cur and draw.textlength(cur, font=f_desc) <= W-TEXT_X-60):
            pass
        elif len(lines) == 2 and desc and ("".join(lines)) < desc:
            lines[1] = lines[1][:-1] + "…"
        ty = y + 72
        for ln in lines:
            draw.text((TEXT_X, ty), ln, font=f_desc, fill=TEXT_GRAY)
            ty += 30
        y += CARD_H + CARD_GAP
    y += 8

# ── 9. 底部 ──
canvas.paste(footer_crop, (0, total_h - footer_crop.height))

canvas.save(OUT, "PNG", optimize=True)
print("已输出:", OUT, canvas.size, os.path.getsize(OUT), "bytes")
