import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from proto import *
SRC = "/Users/aleksandraevseenkova/Desktop/для нового сайта/Вкусвилл для видео прототипа/"
MED = "/private/tmp/claude-501/-Users-aleksandraevseenkova-Desktop-Portfolio/d30cfdbf-31b9-4f29-baaa-4effd1af4e13/scratchpad/clean/vv-prototype_median.npy"
OUT = sys.argv[1]
FPS = 30; X0, Y0, W, H = 50, 50, 786, 1704
ph = Phone(MED, X0, Y0, W, H)
names = ["экран 1", "экран 2", "экран 3", "экран 4", "экран 5", "экран 6", "экран 7", "экран 8", "экрна 9", "экран 10", "экран 11", "экран 12", "экран 13"]
S = [load_screen(SRC + n + ".png", W, H) for n in names]
holds = [1.0, 1.5, 1.6, 2.2, 0.95, 1.3, 1.4, 1.2, 1.5, 1.3, 1.4, 1.5, 1.7]
D = 0.32
starts = np.cumsum([0] + holds)[:-1]
seq = list(zip(starts, S)) + [(starts[-1] + holds[-1], S[0])]       # back to screen 1 -> seamless loop
k = W / 1179.0
def R(x, y, w, h): return (x * k, y * k, w * k, h * k)
# what is tapped on each screen before the next one opens: (rect, radius, kind, scale)
TAPS = {
    0: (R(0, 2134, 1179, 191), 0, "green", False),          # cart bar
    1: (R(48, 1158, 1083, 138), 69 * k, "light", True),      # "Добавить продукты в корзину"
    2: (R(48, 480, 336, 110), 45 * k, "light", True),        # chip "Уже брали"
    3: (R(432, 1590, 312, 78), 39 * k, "green", True),       # "В корзину" under the tangerines
    4: (R(0, 2343, 1179, 213), 0, "green", False),
    5: (R(60, 1580, 470, 80), 22 * k, "light", True),        # "+ Добавить еще товары"
    6: (R(48, 1352, 226, 106), 40 * k, "light", True),       # chip "Яблоки"
    7: (R(60, 1428, 501, 96), 48 * k, "green", True),        # "В корзину" under the first apple
    8: (R(0, 2280, 1179, 276), 0, "green", False),
    9: (R(60, 1770, 470, 110), 24 * k, "light", True),
    11: (R(0, 2280, 1179, 276), 0, "green", False),
}
def scene(i, t):
    img = seq[i][1]
    if i in TAPS and i + 1 < len(seq):
        rect, r, kind, sc_ = TAPS[i]
        img = press(img, rect, r, press_amount(t, seq[i + 1][0], lead=0.3, ramp=0.11, release=0.1), kind, sc_)
    return img
total = seq[-1][0] + D
n = int(round(total * FPS))
w = Writer(OUT, ph.med.shape[1], ph.med.shape[0], FPS)
for f in range(n):
    t = f / FPS
    i = max(k for k, (s, _) in enumerate(seq) if s <= t + 1e-9)
    img = scene(i, t)
    if i > 0 and t < seq[i][0] + D:
        kk = ease((t - seq[i][0]) / D)
        img = blend(scene(i - 1, t), img, kk)
    w.write(ph.frame(img))
w.close()
print("frames", n, "dur", round(n / FPS, 2))
