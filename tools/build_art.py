"""Build web-ready art from assets/art/*.  Run: python3 tools/build_art.py
Produces assets/img/* (backgrounds, seal, textures, brush strokes) and favicon."""
from PIL import Image, ImageFilter, ImageDraw
import numpy as np, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
OUT = 'assets/img'; os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
INK = (35, 36, 31)

def remove_drop(im, x0, y0, x1, y1):
    """Paint the static pendant drop out so the animated drop can form there."""
    a = np.asarray(im).astype(float).copy()
    L = a[y0:y1, x0 - 4:x0].mean(1); R = a[y0:y1, x1:x1 + 4].mean(1)
    for i, x in enumerate(range(x0, x1)):
        t = (i + .5) / (x1 - x0)
        a[y0:y1, x] = L * (1 - t) + R * t + rng.normal(0, 1.6, (y1 - y0, 1))
    out = np.asarray(im).astype(float).copy()
    yy, xx = np.mgrid[0:out.shape[0], 0:out.shape[1]]
    cx, cyy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 3, (y1 - y0) / 2 + 3
    dx = np.maximum(np.abs(xx - cx) - (x1 - x0) / 2, 0); dy = np.maximum(np.abs(yy - cyy) - (y1 - y0) / 2, 0)
    w = np.clip(1 - np.sqrt(dx ** 2 + dy ** 2) / 3, 0, 1)[..., None]
    a2 = np.asarray(im).astype(float).copy(); a2[y0:y1, x0:x1] = a[y0:y1, x0:x1]
    a2 = np.asarray(Image.fromarray(np.clip(a2, 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))).astype(float)
    a = out * (1 - w) + a2 * w
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'))

def upscale(src, box, sizes, name):
    im = Image.open(src).convert('RGB')
    im = remove_drop(im, *box)
    big = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    big = big.filter(ImageFilter.UnsharpMask(radius=2.2, percent=55, threshold=2))
    for w in sizes:
        h = round(big.height * w / big.width)
        r = big if w == big.width else big.resize((w, h), Image.LANCZOS)
        r.save(f'{OUT}/{name}-{w}.webp', quality=86, method=6)
        r.save(f'{OUT}/{name}-{w}.jpg', quality=86, optimize=True, progressive=True)

upscale('assets/art/home-wide.jpg', (369, 349, 387, 384), [2560, 1600], 'home-wide')
upscale('assets/art/home-tall.jpg', (243, 755, 258, 787), [1440, 960], 'home-tall')

# ---- seal: white -> transparent (multiply look), tight crop
s = np.asarray(Image.open('assets/art/seal-dishui-raw.jpg').convert('RGB')).astype(float)
red = np.array([201, 52, 40.])
alpha = np.clip((255 - s[..., 1]) / (255 - red[1]), 0, 1)
alpha = np.where(alpha < .06, 0, alpha)
col = 255 - (255 - s) / np.maximum(alpha[..., None], 1e-3)
col = np.clip(col, 0, 255)
rgba = np.dstack([col, alpha * 255]).astype('uint8')
seal = Image.fromarray(rgba, 'RGBA')
bb = Image.fromarray((alpha > .25).astype('uint8') * 255).getbbox()
m = 10
seal = seal.crop((bb[0] - m, bb[1] - m, bb[2] + m, bb[3] + m))
h = 320; seal = seal.resize((round(seal.width * h / seal.height), h), Image.LANCZOS)
seal.save(f'{OUT}/seal.png', optimize=True)
seal.save(f'{OUT}/seal.webp', quality=90, lossless=False)
for sz in (32, 64, 180):
    c = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
    t = seal.copy(); t.thumbnail((sz, sz), Image.LANCZOS)
    c.paste(t, ((sz - t.width) // 2, (sz - t.height) // 2), t)
    if sz == 180:
        bg = Image.new('RGBA', (sz, sz), (240, 234, 222, 255)); t2 = seal.copy(); t2.thumbnail((140, 140), Image.LANCZOS)
        bg.paste(t2, ((sz - t2.width) // 2, (sz - t2.height) // 2), t2); c = bg
    c.save(f'favicon-{sz}.png' if sz != 32 else 'favicon.png')
Image.open('favicon.png').save('favicon.ico', sizes=[(32, 32)])

# ---- rice paper tile (seamless via FFT-filtered noise)
N = 512
def fnoise(power):
    f = np.fft.fft2(rng.normal(size=(N, N)))
    ky = np.fft.fftfreq(N)[:, None]; kx = np.fft.fftfreq(N)[None, :]
    k = np.sqrt(kx ** 2 + ky ** 2); k[0, 0] = 1
    n = np.real(np.fft.ifft2(f / k ** power)); return (n - n.mean()) / n.std()
base = .55 * fnoise(1.6) + .25 * fnoise(.9) + .2 * fnoise(.2)
# fibres: short curved strands, wrap-around
fib = np.zeros((N, N))
for _ in range(900):
    x, y = rng.uniform(0, N, 2); ang = rng.uniform(0, np.pi); L = rng.uniform(6, 34)
    for t in np.linspace(0, 1, int(L)):
        ang += rng.normal(0, .06)
        fib[int(y) % N, int(x) % N] += 1
        x += np.cos(ang); y += np.sin(ang)
fib = np.asarray(Image.fromarray((np.clip(fib, 0, 1) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.6))) / 255.
paper = np.array([240, 234, 222.])
img = paper[None, None, :] + base[..., None] * np.array([3.2, 3.2, 3.6]) - fib[..., None] * np.array([10, 10, 12.]) * rng.choice([1, -0.7], size=(N, N))[..., None] * 0 - fib[..., None] * 2.2
Image.fromarray(np.clip(img, 0, 255).astype('uint8')).save(f'{OUT}/paper.jpg', quality=88)
# translucent grain overlay (for layering over colour)
g = np.clip(128 + base * 18 - fib * 40, 0, 255).astype('uint8')
Image.fromarray(g, 'L').save(f'{OUT}/grain.png', optimize=True)

# ---- dry-brush strokes (飞白), transparent ink
def stroke(W, H, seed, taper=(0.12, 0.35), dry=0.55, wav=0.12, nb=None):
    """Dry-brush stroke: bristles run out of ink at different points (飞白)."""
    r = np.random.default_rng(seed); nb = nb or int(H * .9)
    xs = np.arange(W) / W
    width = np.clip(np.minimum(xs / taper[0], (1 - xs) / taper[1]), 0, 1) ** .6 * (0.85 + 0.15 * np.sin(xs * 6 + seed))
    cy = H / 2 + np.cumsum(r.normal(0, wav, W)); cy -= np.linspace(cy[0], cy[-1], W) - H / 2
    alpha = np.zeros((H, W))
    def smooth(n, k):
        return np.convolve(n, np.ones(k) / k, mode='same')
    for b in range(nb):
        off = (b / (nb - 1) - .5)
        load = r.uniform(.8, 1.25) - abs(off) * r.uniform(.3, 1.6)
        ink = load - xs * r.uniform(dry * .6, dry * 1.6) + smooth(r.normal(0, .9, W), 25) * .35
        tooth = r.random(W)
        dep = np.clip(ink * 1.8, 0, 1) * (tooth < np.clip(ink * 1.5 - .05, 0, 1))
        dep = smooth(dep, 3)
        y = cy + off * width * H * .86 + smooth(r.normal(0, .6, W), 15)
        i = np.floor(y).astype(int); f = y - i
        ok = (i >= 0) & (i < H - 1) & (width > .03)
        X = np.arange(W)[ok]
        np.add.at(alpha, (i[ok], X), dep[ok] * (1 - f[ok]))
        np.add.at(alpha, (i[ok] + 1, X), dep[ok] * f[ok])
    alpha = np.asarray(Image.fromarray(np.clip(alpha * 255, 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.55))) / 255.
    alpha = np.clip(alpha * .95, 0, 1)
    rgba = np.zeros((H, W, 4), 'uint8'); rgba[..., :3] = INK; rgba[..., 3] = (alpha * 240).astype('uint8')
    return Image.fromarray(rgba, 'RGBA')
stroke(1400, 46, 3, dry=.9).save(f'{OUT}/brush-line.png', optimize=True)
stroke(900, 70, 11, taper=(.05, .5), dry=1.0, wav=.2).save(f'{OUT}/brush-wide.png', optimize=True)
stroke(500, 34, 5, taper=(.2, .3), dry=1.1).save(f'{OUT}/brush-short.png', optimize=True)

# ---- ink-wash edge mask for panels (white centre, feathered irregular edge)
W, H = 800, 600
yy, xx = np.mgrid[0:H, 0:W] / np.array([H, W])[:, None, None]
d = np.minimum.reduce([xx[0] * 0 + yy[0], 1 - yy[0], xx[1], 1 - xx[1]]) if False else None
ny = np.mgrid[0:H, 0:W][0] / H; nx = np.mgrid[0:H, 0:W][1] / W
edge = np.minimum.reduce([nx * W, (1 - nx) * W, ny * H, (1 - ny) * H])
n = np.asarray(Image.fromarray(((fnoise(1.05)[:N, :N] * 40 + 128).clip(0, 255)).astype('uint8')).resize((W, H), Image.BICUBIC)).astype(float) - 128
fine = rng.normal(0, 1, (H, W)); fine = np.asarray(Image.fromarray(((fine * 30 + 128).clip(0, 255)).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))).astype(float) - 128
m = np.clip((edge + n * .35 + fine * .5 - 14) / 12, 0, 1)
a8 = (m * 255).astype('uint8'); Image.merge('LA', (Image.new('L', (W, H), 255), Image.fromarray(a8, 'L'))).save(f'{OUT}/wash-mask.png', optimize=True)

# ---- banner crops from the painting (misty mountains / cliff stream / rippled water)
wide = Image.open(f'{OUT}/home-wide-2560.jpg'); tall = Image.open(f'{OUT}/home-tall-1440.jpg')
for name, src, box in [('band-mountains', tall, (380, 860, 1440, 1380)), ('band-cliff', wide, (0, 0, 1100, 760)), ('band-water', wide, (1450, 260, 2560, 860))]:
    c = src.crop(box); c.thumbnail((1600, 1600), Image.LANCZOS); c.save(f'{OUT}/{name}.webp', quality=82); c.save(f'{OUT}/{name}.jpg', quality=82)
print('done')

# ---- pigment dab mask (swatches): irregular blot, denser rim like dried watercolour
S2 = 240
yy, xx = np.mgrid[0:S2, 0:S2] / S2 - .5
ang = np.arctan2(yy, xx); rad = np.hypot(xx, yy)
edge_n = sum(rng.uniform(.004, .014) * np.sin(k * ang + rng.uniform(0, 6.3)) for k in range(2, 7))
R0 = .40 + edge_n
grain = np.asarray(Image.fromarray((rng.random((S2, S2)) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.1))).astype(float) / 255
inside = np.clip((R0 - rad) / .012, 0, 1)
rim = np.exp(-((R0 - rad) / .03) ** 2) * .25
body = .86 + (grain - .5) * .16 + rim
m = np.clip(inside * body, 0, 1)
a8 = (m * 255).astype('uint8'); Image.merge('LA', (Image.new('L', (S2, S2), 255), Image.fromarray(a8, 'L'))).save(f'{OUT}/dab.png', optimize=True)
print('dab done')
