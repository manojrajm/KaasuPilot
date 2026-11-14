"""Builds KasuPilot app icons from KPLogo.png.

The source is a mockup (icon tile on a dark backdrop), so the KP mark is keyed out of
its navy tile by brightness, then re-composed onto proper full-bleed icon layers.
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

src_path, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)

src = np.asarray(Image.open(src_path).convert('RGB')).astype(np.float32)

# 1. Region that holds the mark only (inside the tile, clear of its border).
x0, y0, x1, y1 = 270, 285, 940, 920
crop = src[y0:y1, x0:x1]

# 2. Brightness key: navy tile max-channel <= ~85, mark/glow brighter.
mx = crop.max(axis=2)
alpha = np.clip((mx - 92.0) / (175.0 - 92.0), 0, 1)
# Fade to zero near the crop edges so no straight-edged box of glow survives.
h, w = alpha.shape
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
edge = np.minimum.reduce([xx, yy, w - 1 - xx, h - 1 - yy])
alpha = alpha * np.clip(edge / 80.0, 0, 1)
# Faint haze fades smoothly to exactly zero, so cropping can never leave a visible edge.
alpha = np.clip((alpha - 0.12) / 0.88, 0, 1)

# 3. Un-mix the navy background so edges have no dark fringe.
bg = np.array([16, 28, 56], np.float32)
a3 = np.maximum(alpha[..., None], 1e-3)
fg = np.clip((crop - (1 - a3) * bg) / a3, 0, 255)
mark = np.dstack([fg, alpha * 255]).astype(np.uint8)
mark_img = Image.fromarray(mark, 'RGBA')
bbox = mark_img.getchannel('A').point(lambda v: 255 if v > 0 else 0).getbbox()
pad = 8
bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(mark_img.width, bbox[2] + pad), min(mark_img.height, bbox[3] + pad))
mark_img = mark_img.crop(bbox)
print('mark bbox in crop:', bbox, 'size:', mark_img.size)

def fit(img, box):
    """Scale img to fit in a box x box square, centred on a transparent canvas of that size."""
    w, h = img.size
    s = box / max(w, h)
    return img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)

def centred(canvas_size, img, dx=0, dy=0):
    c = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    c.alpha_composite(img, ((canvas_size - img.width) // 2 + dx, (canvas_size - img.height) // 2 + dy))
    return c

def background(size):
    """Deep-navy radial gradient with a faint cyan lift behind the mark."""
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    cx, cy = size * 0.5, size * 0.44
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (size * 0.75)
    d = np.clip(d, 0, 1)
    inner = np.array([30, 52, 98], np.float32)    # #1E3462
    outer = np.array([7, 12, 28], np.float32)     # #070C1C
    t = d[..., None] ** 1.3
    rgb = inner * (1 - t) + outer * t
    # subtle diagonal sheen
    sheen = np.clip(1 - np.abs((xx + yy) / size - 0.55) * 3, 0, 1)[..., None] * 6
    rgb = np.clip(rgb + sheen, 0, 255)
    return Image.fromarray(np.dstack([rgb, np.full((size, size), 255, np.float32)]).astype(np.uint8), 'RGBA')

def glow(img, radius, strength, color=(0, 220, 200)):
    a = img.getchannel('A').filter(ImageFilter.GaussianBlur(radius))
    a = a.point(lambda v: int(min(255, v * strength)))
    g = Image.new('RGBA', img.size, color + (0,))
    g.putalpha(a)
    return g

def silhouette(img, size, box, threshold=110):
    """Solid white shape: threshold the mark at full resolution, close small gaps, then scale."""
    work = 1024
    m = fit(img, int(work * box / size))
    a = m.getchannel('A').point(lambda v: 255 if v >= threshold else 0)
    a = a.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))  # close gaps
    a = a.filter(ImageFilter.GaussianBlur(1.2))
    white = Image.new('RGBA', m.size, (255, 255, 255, 0))
    white.putalpha(a)
    full = centred(work, white)
    return full if size == work else full.resize((size, size), Image.LANCZOS)

S = 1024

# --- icon.png: full-bleed square, mark ~68% (OS applies its own mask/rounding) ---
m = fit(mark_img, int(S * 0.68))
layer = centred(S, m, dx=int(S * 0.01))
icon = background(S)
icon.alpha_composite(glow(layer, 28, 0.55))
icon.alpha_composite(layer)
icon.convert('RGB').save(os.path.join(out_dir, 'icon.png'))

# --- Android adaptive icon (108dp canvas; only the centre 66dp circle is always visible) ---
bg = background(S)
bg.convert('RGB').save(os.path.join(out_dir, 'android-icon-background.png'))
m = fit(mark_img, int(S * 0.50))
fg = centred(S, m, dx=-int(S * 0.012), dy=int(S * 0.012))
fg_with_glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
fg_with_glow.alpha_composite(glow(fg, 24, 0.5))
fg_with_glow.alpha_composite(fg)
fg_with_glow.save(os.path.join(out_dir, 'android-icon-foreground.png'))

# --- Monochrome (Android 13 themed icons): white shape on transparent ---
silhouette(mark_img, S, int(S * 0.50)).save(os.path.join(out_dir, 'android-icon-monochrome.png'))

# --- Notification icon: Android tints it, so it must be white on transparent ---
silhouette(mark_img, 96, 86, threshold=100).save(os.path.join(out_dir, 'notification-icon.png'))

# --- Favicon (web) and splash image ---
icon.convert('RGB').resize((196, 196), Image.LANCZOS).save(os.path.join(out_dir, 'favicon.png'))
splash = Image.new('RGBA', (S, S), (0, 0, 0, 0))
splash.alpha_composite(glow(centred(S, fit(mark_img, int(S * 0.8))), 30, 0.6))
splash.alpha_composite(centred(S, fit(mark_img, int(S * 0.8))))
splash.save(os.path.join(out_dir, 'splash-icon.png'))

# --- Preview sheet: full icon, circle + squircle masks, adaptive, monochrome, notification ---
P = 300
sheet = Image.new('RGB', (P * 4 + 50, P * 2 + 40), (235, 238, 243))
def masked(img, shape):
    im = img.resize((P - 20, P - 20), Image.LANCZOS).convert('RGBA')
    mask = Image.new('L', im.size, 0)
    d = ImageDraw.Draw(mask)
    if shape == 'circle':
        d.ellipse([0, 0, im.width - 1, im.height - 1], fill=255)
    else:
        d.rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=im.width // 4.5, fill=255)
    im.putalpha(mask)
    return im
adaptive = bg.copy(); adaptive.alpha_composite(fg_with_glow)
# adaptive icons show the centre 72/108 of the layers
crop_px = int(S * (18 / 108))
adaptive_view = adaptive.crop((crop_px, crop_px, S - crop_px, S - crop_px))
tiles = [
    masked(icon, 'squircle'), masked(icon, 'circle'),
    masked(adaptive_view, 'circle'), masked(adaptive_view, 'squircle'),
]
for i, t in enumerate(tiles):
    sheet.paste(t, (10 + i * (P + 10), 10), t)
dark = Image.new('RGB', (P - 20, P - 20), (40, 44, 52))
mono = Image.open(os.path.join(out_dir, 'android-icon-monochrome.png')).resize((P - 20, P - 20), Image.LANCZOS)
dark.paste(mono, (0, 0), mono)
sheet.paste(dark, (10, P + 20))
notif = Image.open(os.path.join(out_dir, 'notification-icon.png'))
nb = Image.new('RGB', (P - 20, P - 20), (40, 44, 52))
big = notif.resize((192, 192), Image.NEAREST)
nb.paste(big, ((P - 20 - 192) // 2, (P - 20 - 192) // 2), big)
sheet.paste(nb, (10 + (P + 10), P + 20))
small = Image.new('RGB', (P - 20, P - 20), (40, 44, 52))
for k, sz in enumerate([24, 48, 96]):
    s_ = notif.resize((sz, sz), Image.LANCZOS)
    small.paste(s_, (20 + k * 80, 120), s_)
sheet.paste(small, (10 + 2 * (P + 10), P + 20))
sp = splash.resize((P - 20, P - 20), Image.LANCZOS)
blk = Image.new('RGB', (P - 20, P - 20), (0, 0, 0)); blk.paste(sp, (0, 0), sp)
sheet.paste(blk, (10 + 3 * (P + 10), P + 20))
sheet.save(os.path.join(out_dir, '_preview.png'))
print('done')
