import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from proto import *
SRC = "/Users/aleksandraevseenkova/Desktop/для нового сайта/БСПБ для прототипа/"
CLEAN = "/private/tmp/claude-501/-Users-aleksandraevseenkova-Desktop-Portfolio/d30cfdbf-31b9-4f29-baaa-4effd1af4e13/scratchpad/clean/"
which, OUT = sys.argv[1], sys.argv[2]
FPS = 25
GEO = {"proto": ("bs-prototype", (54, 37, 623, 1350)), "shake": ("bs-shake", (59, 33, 812, 1758))}
name, (X0, Y0, W, H) = GEO[which]
ph = Phone(CLEAN + name + "_median.npy", X0, Y0, W, H)
sc = W / 1125.0
S1 = load_screen(SRC + "Экран 1.png", W)
S2 = load_screen(SRC + "экран 2.png", W, H)
S3 = load_screen(SRC + "экран 3.png", W, H)
S4 = load_screen(SRC + "экран 4.png", W, H)
st_h, nav_y = int(round(140 * sc)), int(round(3660 * sc))
STATUS, CONTENT, NAV = S1[:st_h], S1[st_h:nav_y], S1[nav_y:]
view_h = H - st_h - NAV.shape[0]
MAXOFF = CONTENT.shape[0] - view_h
print("home scroll range", MAXOFF, "view", view_h)

def home(off):
    off = max(0, min(MAXOFF, off))
    M = np.float32([[1, 0, 0], [0, 1, -off]])
    win = cv2.warpAffine(CONTENT, M, (W, view_h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return np.concatenate([STATUS, win, NAV], axis=0)[:H]

def seq_frames(scenes, total):
    """scenes: list of (t_start, fn(t_local)->img, xfade_in). returns frame fn."""
    def f(t):
        i = max(k for k, s in enumerate(scenes) if s[0] <= t + 1e-9)
        img = scenes[i][1](t - scenes[i][0])
        if i > 0 and scenes[i][2] > 0 and t < scenes[i][0] + scenes[i][2]:
            k = ease((t - scenes[i][0]) / scenes[i][2])
            prev = scenes[i - 1][1](t - scenes[i - 1][0])
            img = blend(prev, img, k)
        return img
    return f

def Rs(x, y, w, h): return (x * sc, y * sc, w * sc, h * sc)

if which == "proto":
    off_hold = 0.9; scroll = (0.9, 2.7); hold_open = 3.2
    def scene_home_down(t):
        k = ease((t - scroll[0]) / (scroll[1] - scroll[0]))
        return home(k * MAXOFF)
    T_open, T_dur = 3.2, 0.5
    def scene_sheet(t):                      # t from the moment the sheet starts to open
        e = ease_out(t / T_dur) if t < T_dur else 1.0
        dim = 1 - (1 - 212 / 255.0) * min(1.0, t / (T_dur * 0.8))
        bg = home(MAXOFF) * dim
        Ttop = 868 * H // 1350
        R = int(48 * H / 1350)
        sheet = S2[Ttop:H]
        y = int(round(Ttop + (1 - e) * (H - Ttop)))
        m = np.ones((H - Ttop, W), np.float32)
        yy, xx = np.mgrid[0:R, 0:W]
        for cx in (R, W - 1 - R):
            d = np.hypot(xx - cx, yy - R)
            sel = (xx < R) if cx == R else (xx > W - 1 - R)
            m[:R][sel & (d > R)] = 0
        m = cv2.GaussianBlur(m, (0, 0), 0.8)[..., None]
        out = bg.copy()
        hh = min(H - y, sheet.shape[0])
        if hh > 0:
            out[y:y + hh] = bg[y:y + hh] * (1 - m[:hh]) + sheet[:hh] * m[:hh]
        if t >= T_dur * 0.75:
            out = blend(out, S2, ease((t - T_dur * 0.75) / (T_dur * 0.25 + 1e-6)))
        return out
    def scene_s3(t): return S3
    def scene_home_back(t):
        k = ease((t - 0.35) / 1.9)
        return home(MAXOFF * (1 - k))
    scenes = [
        (0.0, lambda t: home(0), 0),
        (0.9, scene_home_down_local := (lambda t: press(home(ease(t / 1.8) * MAXOFF), Rs(612, 3215, 464, 402)[:1] + (Rs(612, 3215, 464, 402)[1] - MAXOFF,) + Rs(612, 3215, 464, 402)[2:], 70 * sc, press_amount(t + 0.9, 3.2), "light", True)), 0),
        (3.2, lambda t: press(scene_sheet(t), Rs(48, 1770, 1028, 156), 40 * sc, press_amount(t + 3.2, 5.3), "light", True) if t > 1.0 else scene_sheet(t), 0),
        (5.3, lambda t: press(scene_s3(t), Rs(48, 1998, 1029, 162), 80 * sc, press_amount(t + 5.3, 8.7), "dark", True), 0.4),
        (8.7, scene_home_back, 0.45),
    ]
    total = 12.3
    # make the last part end exactly on home(0) so the loop is seamless
    frame = seq_frames(scenes, total)
elif which == "shake":
    # PIN screen: clear the dots, draw them ourselves so they can fill one by one
    raw = cv2.imread(SRC + "экран 4.png", cv2.IMREAD_UNCHANGED)[:, :, :3]
    rawrgb = cv2.cvtColor(raw, cv2.COLOR_BGR2RGB).copy()
    EMPTY, FILL = (208, 232, 247), (11, 43, 60)
    xs = [365.5, 497.5, 629.5, 761.5]; ycen = 881.8
    base = rawrgb.copy()
    for x in xs: cv2.circle(base, (int(round(x)), int(round(ycen))), 27, EMPTY, -1, cv2.LINE_AA)
    BASE = cv2.resize(base, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
    def draw_dots(fills):     # fills: list of 0..1 progress
        img = BASE.copy()
        for x, p in zip(xs, fills):
            if p <= 0: continue
            r = 24 * sc * (1 + 0.25 * np.sin(np.pi * min(1, p)) if p < 1 else 1)
            col = tuple(float(a * (1 - ease(p)) + b * ease(p)) for a, b in zip(EMPTY, FILL))
            ov = np.zeros((H, W, 3), np.float32); mk = np.zeros((H, W), np.float32)
            sh = 4
            cv2.circle(mk, (int(round(x * sc * (1 << sh))), int(round(ycen * sc * (1 << sh)))), int(round(r * (1 << sh))), 1.0, -1, cv2.LINE_AA, sh)
            k = mk[..., None]
            img = img * (1 - k) + np.array(col, np.float32) * k
        return img
    keys = [(272, 1236), (562, 1236), (848, 1236), (272, 1488)]       # digits 1, 2, 3, 4
    times = [0.55, 0.95, 1.35, 1.75]
    def pin(t):
        img = draw_dots([min(1.0, max(0.0, (t - ti) / 0.18)) for ti in times])
        for (kx, ky), ti in zip(keys, times):
            pa = press_amount(t, ti + 0.1, lead=0.22, ramp=0.09, release=0.1)
            if pa > 0: img = press(img, Rs(kx - 105, ky - 105, 210, 210), 105 * sc, pa, "light", False)
        return img
    S4F = pin(10)
    # the dialog: cut from the earlier video (that frame has no cursor near the dialog)
    old = np.load(CLEAN + "bs-shake.npy", mmap_mode="r")[72]
    dx0, dy0, dx1, dy1 = 108, 1462, 822, 1626
    patch = np.ascontiguousarray(old[dy0:dy1, dx0:dx1]).astype(np.float32)
    pm = np.zeros((dy1 - dy0, dx1 - dx0), np.float32)
    cv2.rectangle(pm, (0, 0), (dx1 - dx0 - 1, dy1 - dy0 - 1), 1, -1)
    rr = 44
    pm = np.zeros_like(pm); cv2.rectangle(pm, (rr, 0), (pm.shape[1] - 1 - rr, pm.shape[0] - 1), 1, -1); cv2.rectangle(pm, (0, rr), (pm.shape[1] - 1, pm.shape[0] - 1 - rr), 1, -1)
    for (cx, cy) in [(rr, rr), (pm.shape[1] - 1 - rr, rr), (rr, pm.shape[0] - 1 - rr), (pm.shape[1] - 1 - rr, pm.shape[0] - 1 - rr)]: cv2.circle(pm, (cx, cy), rr, 1, -1)
    pm = cv2.GaussianBlur(pm, (0, 0), 1.0)[..., None]
    px0, py0 = dx0 - X0, dy0 - Y0       # patch position inside the screen
    def scene_dialog(t):
        e = ease_out(t / 0.3)
        dim = 1 - (1 - 212 / 255.0) * min(1.0, t / 0.28)
        out = S4F * dim
        off = int(round((1 - e) * 170))
        h2, w2 = patch.shape[:2]
        y = py0 + off
        hh = min(H - y, h2)
        if hh > 0:
            a = pm[:hh] * min(1.0, t / 0.2)
            out[y:y + hh, px0:px0 + w2] = out[y:y + hh, px0:px0 + w2] * (1 - a) + patch[:hh] * a
        return press(out, (581, 1479, 158, 66), 33, press_amount(t + 2.6, 4.6, lead=0.3), "dark", True) if t > 1.0 else out
    def scene_home(t): return home(0)
    scenes = [
        (0.0, pin, 0),
        (2.6, scene_dialog, 0),
        (4.6, scene_home, 0.35),
        (6.3, lambda t: pin(0), 0.4),
    ]
    total = 6.7
    frame = seq_frames(scenes, total)

n = int(round(total * FPS))
w = Writer(OUT, ph.med.shape[1], ph.med.shape[0], FPS)
if which == "shake":
    def jiggle(t):                      # decaying shake after the last PIN digit, before the dialog
        t0, d = 2.05, 0.45
        if t0 <= t < t0 + d:
            u = (t - t0) / d
            return 22 * np.sin(u * 5 * 2 * np.pi) * (1 - u) ** 1.2, 2.2 * np.sin(u * 5 * 2 * np.pi) * (1 - u)
        return 0.0, 0.0
for f in range(n):
    t = f / FPS
    img = ph.frame(frame(t))
    if which == "shake":
        dxx, ang = jiggle(t)
        if dxx or ang:
            h_, w_ = img.shape[:2]
            M = cv2.getRotationMatrix2D((w_ / 2, h_ / 2), ang, 1.0); M[0, 2] += dxx
            img = cv2.warpAffine(img, M, (w_, h_), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(246, 246, 246))
    w.write(img)
w.close()
print("frames", n, which)
