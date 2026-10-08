"""BSPB main prototype: home -> settings sheet -> hide-balance toggles -> save -> swipe an account left -> tap the eye."""
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from proto import *
SRC = "/Users/aleksandraevseenkova/Desktop/для нового сайта/БСПБ для прототипа/"
CLEAN = "/private/tmp/claude-501/-Users-aleksandraevseenkova-Desktop-Portfolio/d30cfdbf-31b9-4f29-baaa-4effd1af4e13/scratchpad/clean/"
OUT = sys.argv[1]
FPS = 25
X0, Y0, W, H = 54, 37, 623, 1350
ph = Phone(CLEAN + "bs-prototype_median.npy", X0, Y0, W, H)
sc = W / 1125.0
def Rs(x, y, w, h): return (x * sc, y * sc, w * sc, h * sc)

def rd(name):
    im = cv2.imread(SRC + name, cv2.IMREAD_UNCHANGED)
    if im.shape[2] == 4:
        a = im[:, :, 3:4].astype(np.float32) / 255
        im = im[:, :, :3].astype(np.float32) * a + 255 * (1 - a)
    return cv2.cvtColor(im.astype(np.uint8), cv2.COLOR_BGR2RGB).astype(np.float32)
S1src, S2src, S3src = rd("Экран 1.png"), rd("экран 2.png"), rd("экран 3.png")
def down(img, h=None):
    return cv2.resize(img, (W, h or int(round(img.shape[0] * W / img.shape[1]))), interpolation=cv2.INTER_AREA)
S1, S2 = down(S1src), down(S2src, H)
st_h, nav_y = int(round(140 * sc)), int(round(3660 * sc))
STATUS, CONTENT, NAV = S1[:st_h], S1[st_h:nav_y], S1[nav_y:]
view_h = H - st_h - NAV.shape[0]
MAXOFF = CONTENT.shape[0] - view_h
ky = S1.shape[0] / S1src.shape[0]
print("scroll range", MAXOFF, "view", view_h)

# ---------------- home with the swipeable account row (screens "глазик" / "глазик (открытый)") ----------------
ROW_Y0, ROW_Y1 = 1560, 1735
S4a, S4b = rd("экран 4 - глазик.png"), rd("экран 4 - глазик (открытый).png")
SHIFT = 184.0                                              # how far the design swipes the row to the left
CX, CY, CR = 1005, 1641, 51                                # eye button circle in the swiped screens
def circle_crop(src):
    ss = 4
    m = np.zeros((2 * CR * ss + 8 * ss, 2 * CR * ss + 8 * ss), np.float32)
    c = (CR + 4) * ss
    cv2.circle(m, (c, c), CR * ss, 1.0, -1, cv2.LINE_AA)
    m = cv2.resize(m, (2 * CR + 8, 2 * CR + 8), interpolation=cv2.INTER_AREA)[..., None]
    patch = src[CY - CR - 4:CY + CR + 4, CX - CR - 4:CX + CR + 4].copy()
    return patch, m
BTN_CLOSED = circle_crop(S4a)                              # eye with a slash: "hide"
BTN_OPEN = circle_crop(S4b)                                # open eye: "show"
# the amount "160 000,20 ₽" of the swiped design, completed on the left (the design clips its first digit)
glyph1 = S3src[250:300, 205:219]                           # the digit 1 (same type size as the account amounts)
amt_b = S4a[1585:1650, 4:288].copy()
AMT_X = 188
def amount_ratio_patch():
    return np.clip(amt_b / np.array([253.0, 253.0, 253.0]), 0, 1)
RATIO = amount_ratio_patch(); G1 = np.clip(glyph1 / 253.0, 0, 1)
def row_base(rev):
    strip = S1src[ROW_Y0:ROW_Y1].copy()
    if rev > 0:
        vis = strip.copy()
        vis[10:110, 140:470] = 254.0
        ay = 1585 - ROW_Y0
        h_, w_ = RATIO.shape[:2]
        vis[ay:ay + h_, AMT_X:AMT_X + w_] = vis[ay:ay + h_, AMT_X:AMT_X + w_] * RATIO
        gy = 1594 - ROW_Y0 - 5
        gh, gw = G1.shape[:2]
        vis[gy:gy + gh, 178:178 + gw] = vis[gy:gy + gh, 178:178 + gw] * G1
        strip = strip * (1 - rev) + vis * rev
    return strip
def row_strip(d, rev, eye_p, icon):
    """d: 0..SHIFT swipe distance, rev: amount shown (0..1), icon: 0 = open eye, 1 = slashed eye"""
    strip = row_base(rev)
    if d > 0.5:
        M = np.float32([[1, 0, -d], [0, 1, 0]])
        strip = cv2.warpAffine(strip, M, (strip.shape[1], strip.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
        # eye button slides in with the row
        bx = CX + (SHIFT - d)
        for (patch, m), wgt in ((BTN_OPEN, 1 - icon), (BTN_CLOSED, icon)):
            if wgt <= 0: continue
            ph_, pw_ = m.shape[:2]
            x0, y0 = int(round(bx - pw_ / 2)), int(round(CY - ROW_Y0 - ph_ / 2))
            if x0 + pw_ > strip.shape[1] or y0 < 0 or y0 + ph_ > strip.shape[0]: 
                continue
            pp = patch
            if eye_p > 0:
                pp = patch + (255.0 - patch) * (0.22 * eye_p)
            strip[y0:y0 + ph_, x0:x0 + pw_] = strip[y0:y0 + ph_, x0:x0 + pw_] * (1 - m * wgt) + pp * m * wgt
    return strip

def home(off, d=0.0, rev=0.0, eye_p=0.0, icon=0.0):
    off = max(0, min(MAXOFF, off))
    content = CONTENT
    if d > 0 or rev > 0:
        content = CONTENT.copy()
        strip = row_strip(d, rev, eye_p, icon)
        sh = int(round(strip.shape[0] * ky)); sy = int(round(ROW_Y0 * ky)) - st_h
        content[sy:sy + sh] = cv2.resize(strip, (W, sh), interpolation=cv2.INTER_AREA)
    M = np.float32([[1, 0, 0], [0, 1, -off]])
    win = cv2.warpAffine(content, M, (W, view_h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return np.concatenate([STATUS, win, NAV], axis=0)[:H]

ACC_OFF = (1650 * ky - st_h) - view_h * 0.40
print("account scroll offset", ACC_OFF)

# ---------------- settings sheet opening ----------------
def scene_sheet(t):
    T_dur = 0.4
    e = ease_out(t / T_dur) if t < T_dur else 1.0
    dim = 1 - (1 - 212 / 255.0) * min(1.0, t / (T_dur * 0.8))
    bg = home(MAXOFF) * dim
    Ttop = 868 * H // 1350; R = int(48 * H / 1350)
    sheet = S2[Ttop:H]
    y = int(round(Ttop + (1 - e) * (H - Ttop)))
    m = np.ones((H - Ttop, W), np.float32)
    yy, xx = np.mgrid[0:R, 0:W]
    for cx in (R, W - 1 - R):
        dd = np.hypot(xx - cx, yy - R)
        sel = (xx < R) if cx == R else (xx > W - 1 - R)
        m[:R][sel & (dd > R)] = 0
    m = cv2.GaussianBlur(m, (0, 0), 0.8)[..., None]
    out = bg.copy(); hh = min(H - y, sheet.shape[0])
    if hh > 0: out[y:y + hh] = bg[y:y + hh] * (1 - m[:hh]) + sheet[:hh] * m[:hh]
    if t >= T_dur * 0.75: out = blend(out, S2, ease((t - T_dur * 0.75) / (T_dur * 0.25 + 1e-6)))
    return out

# ---------------- toggles screen ----------------
NAVY = np.array([11.0, 43.0, 60.0], np.float32)
PANEL = np.array([249.0, 249.0, 249.0], np.float32)
OFFC, ONC = np.array([239.0, 239.0, 242.0]), NAVY
noise = {  # hidden-amount texture, taken from the already hidden "Зарплатный счет" row
    "src_y": 1385, "h": 70, "x0": 125, "x1": 445}
NZ = S3src[noise["src_y"]:noise["src_y"] + noise["h"], noise["x0"]:noise["x1"]].copy()
ROWS = {"cur": 0, "sav": 408}                     # y shift relative to the "Текущий счет" row
def draw_toggle(img, cy, p):
    ss = 4
    x0, x1, y0, y1 = 905, 1085, int(cy - 55), int(cy + 55)
    reg = img[y0:y1, x0:x1]
    reg[:] = PANEL
    h_, w_ = reg.shape[:2]
    big = np.zeros((h_ * ss, w_ * ss), np.float32)
    # track
    def pill(mask, cx, cyy, hw, hh_):
        cv2.rectangle(mask, (int((cx - hw + hh_) * ss), int((cyy - hh_) * ss)), (int((cx + hw - hh_) * ss), int((cyy + hh_) * ss)), 1, -1)
        cv2.circle(mask, (int((cx - hw + hh_) * ss), int(cyy * ss)), int(hh_ * ss), 1, -1, cv2.LINE_AA)
        cv2.circle(mask, (int((cx + hw - hh_) * ss), int(cyy * ss)), int(hh_ * ss), 1, -1, cv2.LINE_AA)
    pill(big, 1047 - 60 - x0, cy - y0, 60, 36)
    tm = cv2.resize(big, (w_, h_), interpolation=cv2.INTER_AREA)[..., None]
    col = OFFC * (1 - p) + ONC * p
    reg[:] = reg * (1 - tm) + col * tm
    kx = 963 + 48 * ease(p) - x0
    # soft knob shadow (fades out in the ON state)
    sh = np.zeros((h_, w_), np.float32); cv2.circle(sh, (int(kx), int(cy - y0 + 4)), 31, 1.0, -1, cv2.LINE_AA)
    sh = cv2.GaussianBlur(sh, (0, 0), 6) * 0.16 * (1 - p)
    reg[:] = reg * (1 - sh[..., None] * tm)
    kb = np.zeros((h_ * ss, w_ * ss), np.float32); cv2.circle(kb, (int(kx * ss), int((cy - y0) * ss)), 30 * ss, 1.0, -1, cv2.LINE_AA)
    km = cv2.resize(kb, (w_, h_), interpolation=cv2.INTER_AREA)[..., None]
    reg[:] = reg * (1 - km) + 255.0 * km
def s3_state(p_cur, p_sav):
    img = S3src.copy()
    for key, p in (("cur", p_cur), ("sav", p_sav)):
        dy = ROWS[key]
        y_amt = noise["src_y"] - 205 + dy
        if p > 0:
            reg = img[y_amt:y_amt + noise["h"], noise["x0"]:noise["x1"]]
            img[y_amt:y_amt + noise["h"], noise["x0"]:noise["x1"]] = reg * (1 - ease(p)) + NZ * ease(p)
        if p > 0 or key == "sav":
            draw_toggle(img, 1185 + dy, ease(p))
    return down(img, H)

TAP = 0.22           # how long a toggle takes to flip
T_SAV_HIDE, T_SAV_SHOW, T_CUR_HIDE, T_SAVE = 0.55, 1.65, 2.75, 4.15
def scene_s3(t):
    if t >= T_SAV_SHOW: p_sav = 1 - min(1.0, (t - T_SAV_SHOW) / TAP)
    else: p_sav = min(1.0, max(0.0, (t - T_SAV_HIDE) / TAP))
    p_cur = min(1.0, max(0.0, (t - T_CUR_HIDE) / TAP))
    img = s3_state(p_cur, p_sav)
    for t_tap, (cx, cy) in ((T_SAV_HIDE, (987, 1593)), (T_SAV_SHOW, (987, 1593)), (T_CUR_HIDE, (987, 1185))):
        pa = press_amount(t, t_tap, lead=0.12, ramp=0.07, release=0.08)
        if pa > 0: img = press(img, Rs(cx - 60, cy - 36, 120, 72), 36 * sc, pa * 0.8, "light", False)
    return press(img, Rs(48, 1998, 1029, 162), 80 * sc, press_amount(t, T_SAVE + 0.3, lead=0.3, ramp=0.12, release=0.1), "dark", True)

# ---------------- timeline (tempo close to the first version of the video) ----------------
T_SHEET, T_S3 = 2.3, 3.8
S3_LEN = 4.9
T_HOME2 = T_S3 + S3_LEN
# home segment 2 (local times)
t_scroll, t_hold1, t_swipe, t_hold2 = 0.95, 0.20, 0.40, 0.45
T_SWIPE = t_scroll + t_hold1
T_TAP = T_SWIPE + t_swipe + t_hold2                # the eye is pressed during [T_TAP-0.3, T_TAP]
T_SHOW = T_TAP + 0.02                              # amount appears, icon turns to the slashed eye
t_show, t_hold3, t_back, t_hold4, t_up, t_end = 0.30, 1.05, 0.40, 0.25, 0.95, 0.25
T_BACK = T_SHOW + t_show + t_hold3
T_UP = T_BACK + t_back + t_hold4
T_TOTAL = T_UP + t_up + t_end
def scene_home2(t):
    off = MAXOFF + (ACC_OFF - MAXOFF) * ease(t / t_scroll)
    d, rev, eyep, icon = 0.0, 0.0, 0.0, 0.0
    if t >= T_SWIPE: d = SHIFT * ease_out((t - T_SWIPE) / t_swipe)
    if T_TAP - 0.3 <= t < T_SHOW: eyep = press_amount(t, T_TAP, lead=0.3, ramp=0.12, release=0.1)
    if t >= T_SHOW:
        k = ease((t - T_SHOW) / t_show); rev = k; icon = k
    if t >= T_BACK:
        d = SHIFT * (1 - ease((t - T_BACK) / t_back)); rev = 1.0; icon = 1.0
    if t >= T_UP:
        u = ease((t - T_UP) / t_up); off = ACC_OFF * (1 - u); d = 0.0; rev = 1.0
    return home(off, d, rev, eyep, icon)
def scene_home_start(t):
    k = ease((t - 0.6) / 1.4)
    img = home(k * MAXOFF)
    return press(img, Rs(612, 3215, 464, 402)[:1] + (Rs(612, 3215, 464, 402)[1] - MAXOFF,) + Rs(612, 3215, 464, 402)[2:], 70 * sc, press_amount(t, T_SHEET, lead=0.3), "light", True)
def scene_sheet_t(t):
    img = scene_sheet(t)
    return press(img, Rs(48, 1770, 1028, 156), 40 * sc, press_amount(t + T_SHEET, T_S3, lead=0.3), "light", True) if t > 0.8 else img

scenes = [
    (0.0, scene_home_start, 0),
    (T_SHEET, scene_sheet_t, 0),
    (T_S3, scene_s3, 0.3),
    (T_HOME2, scene_home2, 0.3),
]
def frame_at(t):
    i = max(k for k, s in enumerate(scenes) if s[0] <= t + 1e-9)
    img = scenes[i][1](t - scenes[i][0])
    if i > 0 and scenes[i][2] > 0 and t < scenes[i][0] + scenes[i][2]:
        k = ease((t - scenes[i][0]) / scenes[i][2])
        img = blend(scenes[i - 1][1](t - scenes[i - 1][0]), img, k)
    return img
total = T_HOME2 + T_TOTAL
n = int(round(total * FPS))
print("duration", total)
if len(sys.argv) > 2 and sys.argv[2] == "probe":
    for tt in [float(x) for x in sys.argv[3:]]:
        cv2.imwrite(f"/tmp/probe_{tt}.png", np.clip(ph.frame(frame_at(tt)), 0, 255).astype(np.uint8)[:, :, ::-1]); print("probe", tt)
    sys.exit()
w = Writer(OUT, ph.med.shape[1], ph.med.shape[0], FPS)
for f in range(n):
    w.write(ph.frame(frame_at(f / FPS)))
w.close(); print("frames", n)
