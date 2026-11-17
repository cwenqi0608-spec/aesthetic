"""Build the 瀑布 homepage assets from assets/art/home-falls.jpg.
Run: python3 tools/build_falls.py   (Pillow, numpy, fonttools)"""
from PIL import Image, ImageFilter, ImageDraw
import numpy as np, os, json
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
OUT = 'assets/img'; os.makedirs(OUT, exist_ok=True)

# ---- background: 2x Lanczos + gentle unsharp
src = Image.open('assets/art/home-falls.jpg').convert('RGB')          # 1280x720
W0, H0 = src.size
big = src.resize((W0 * 2, H0 * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2.2, percent=55, threshold=2))
for w in (2560, 1600, 1100):
    r = big if w == big.width else big.resize((w, round(big.height * w / big.width)), Image.LANCZOS)
    r.save(f'{OUT}/falls-{w}.webp', quality=86, method=6)
    r.save(f'{OUT}/falls-{w}.jpg', quality=86, optimize=True, progressive=True)

# ---- masks (R = falling water, G = pool surface, B = mist), 640x360 = half of painting px
MW, MH = 640, 360
k = MW / W0
lum = np.asarray(src.convert('L').resize((MW, MH), Image.LANCZOS)).astype(float)
def poly(points, blur):
    m = Image.new('L', (MW, MH), 0); ImageDraw.Draw(m).polygon([(x * k, y * k) for x, y in points], fill=255)
    return np.asarray(m.filter(ImageFilter.GaussianBlur(blur * k))).astype(float) / 255
falls = poly([(383, 22), (478, 18), (522, 58), (546, 190), (566, 320), (568, 395), (398, 398), (390, 250), (382, 120)], 7)
bright = np.clip((lum - 120) / 60, 0, 1)
bright = np.asarray(Image.fromarray((bright * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.5))).astype(float) / 255
R = falls * (0.25 + 0.75 * bright)
water = poly([(0, 528), (196, 526), (232, 470), (300, 442), (380, 430), (560, 422), (760, 408), (1000, 398), (1280, 396), (1280, 720), (0, 720)], 10)
dark = np.clip((lum - 70) / 50, 0, 1)                            # stones stay dry
dark = np.asarray(Image.fromarray((dark * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(2))).astype(float) / 255
G = water * dark
yy, xx = np.mgrid[0:MH, 0:MW] / k
mist = np.exp(-(((xx - 480) / 230) ** 2 + ((yy - 365) / 70) ** 2))
mist = np.maximum(mist, 0.55 * np.exp(-((yy - 410) / 40) ** 2) * np.clip((xx - 220) / 200, 0, 1))
B = np.clip(mist, 0, 1)
rgb = np.dstack([R, G, B]) * 255
Image.fromarray(rgb.astype('uint8')).save(f'{OUT}/falls-mask.png', optimize=True)

# ---- seal-script glyph outlines (敬峰中山王篆, OFL-1.1) as SVG path data
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
f = TTFont('tools/fonts-src/JFZSKSealScript_V3.5.ttf'); gs = f.getGlyphSet(); cmap = f.getBestCmap()
glyphs = {}
for ch in '书单摘色库':
    g = cmap[ord(ch)]; pen = SVGPathPen(gs); gs[g].draw(pen); bp = BoundsPen(gs); gs[g].draw(bp)
    glyphs[ch] = {'d': pen.getCommands(), 'bounds': bp.bounds, 'upm': f['head'].unitsPerEm}
json.dump({'glyphs': glyphs, 'font': 'JFZSKSealScript 3.5 (Jingfeng Liu), SIL OFL 1.1'}, open('js/seal-glyphs.json', 'w'), ensure_ascii=False, separators=(',', ':'))

# ---- header bands for the inner pages, cut from the same painting
for name, box in [('band-cliff', (200, 0, 1000, 470)), ('band-mountains', (820, 120, 1280, 420)), ('band-water', (560, 380, 1280, 720))]:
    c = big.crop(tuple(v * 2 for v in box)); c.thumbnail((1600, 1600), Image.LANCZOS)
    c.save(f'{OUT}/{name}.webp', quality=82); c.save(f'{OUT}/{name}.jpg', quality=82)
print('done')
