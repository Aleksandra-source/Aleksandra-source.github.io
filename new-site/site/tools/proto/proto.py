"""Tiny renderer for the case prototype videos: clean app screens inside the phone mock-up, no cursor.
The phone frame (bezel, island, shadow, background) is taken from the earlier videos' median frame."""
import numpy as np, cv2, subprocess, math

def ease(t):            # smooth in-out
    t = min(1.0, max(0.0, t)); return t * t * (3 - 2 * t)
def ease_out(t):
    t = min(1.0, max(0.0, t)); return 1 - (1 - t) ** 3

class Phone:
    def __init__(self, median_path, x0, y0, W, H):
        self.med = np.load(median_path).astype(np.float32)
        self.x0, self.y0, self.W, self.H = x0, y0, W, H
        g = cv2.cvtColor(self.med.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
        h, w = g.shape
        # 1) corner radius of the screen: where the median is black outside / bright inside
        best = None
        for r in range(int(0.08 * W), int(0.22 * W), 2):
            m = self._rrect(h, w, x0, y0, W, H, r)
            win = np.zeros((h, w), bool)
            for (cx, cy) in [(x0, y0), (x0 + W - r - 14, y0), (x0, y0 + H - r - 14), (x0 + W - r - 14, y0 + H - r - 14)]:
                win[cy:cy + r + 14, cx:cx + r + 14] = True
            inner = cv2.erode(m, np.ones((5, 5), np.uint8)).astype(bool)
            rect = np.zeros((h, w), bool); rect[y0:y0 + H, x0:x0 + W] = True
            outer = rect & ~cv2.dilate(m, np.ones((7, 7), np.uint8)).astype(bool)
            err = int((win & inner & (g < 40)).sum() + (win & outer & (g > 140)).sum())
            if best is None or err < best[0]: best = (err, r)
        self.r = best[1]
        m = self._rrect(h, w, x0, y0, W, H, self.r).astype(np.float32)
        a = cv2.GaussianBlur(m, (0, 0), 0.9)
        # 2) the dynamic island: black blob at the top centre of the median
        mid = x0 + W // 2
        zone = np.zeros((h, w), np.uint8); zone[y0:y0 + int(0.12 * H), mid - int(0.17 * W):mid + int(0.17 * W)] = 1
        isl = ((g < 45) & (zone > 0)).astype(np.uint8)
        isl = cv2.morphologyEx(isl, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        nc, lab, st, _ = cv2.connectedComponentsWithStats(isl)
        island = np.zeros((h, w), np.float32)
        if nc > 1:
            i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); island = (lab == i).astype(np.float32)
            island = cv2.dilate(island, np.ones((3, 3), np.uint8))
        a = a * (1 - cv2.GaussianBlur(island, (0, 0), 0.8))
        self.alpha = a[..., None]

    @staticmethod
    def _rrect(h, w, x0, y0, W, H, r):
        m = np.zeros((h, w), np.uint8)
        cv2.rectangle(m, (x0 + r, y0), (x0 + W - 1 - r, y0 + H - 1), 1, -1)
        cv2.rectangle(m, (x0, y0 + r), (x0 + W - 1, y0 + H - 1 - r), 1, -1)
        for (cx, cy) in [(x0 + r, y0 + r), (x0 + W - 1 - r, y0 + r), (x0 + r, y0 + H - 1 - r), (x0 + W - 1 - r, y0 + H - 1 - r)]:
            cv2.circle(m, (cx, cy), r, 1, -1)
        return m

    def frame(self, screen):                       # screen: (H, W, 3) float32 RGB
        out = self.med.copy()
        reg = out[self.y0:self.y0 + self.H, self.x0:self.x0 + self.W]
        al = self.alpha[self.y0:self.y0 + self.H, self.x0:self.x0 + self.W]
        out[self.y0:self.y0 + self.H, self.x0:self.x0 + self.W] = screen * al + reg * (1 - al)
        return out

def load_screen(path, W, H=None):
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if im.shape[2] == 4:
        a = im[:, :, 3:4].astype(np.float32) / 255
        im = (im[:, :, :3].astype(np.float32) * a + 255 * (1 - a))
    im = cv2.cvtColor(im.astype(np.uint8), cv2.COLOR_BGR2RGB)
    s = W / im.shape[1]
    h = int(round(im.shape[0] * s)) if H is None else H
    return cv2.resize(im, (W, h), interpolation=cv2.INTER_AREA).astype(np.float32)

def blend(a, b, k):
    return a * (1 - k) + b * k

class Writer:
    def __init__(self, path, w, h, fps):
        self.w, self.h = w, h
        self.p = subprocess.Popen([
            "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
            "-vf", "scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p",
            "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-movflags", "+faststart",
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", path],
            stdin=subprocess.PIPE)
    def write(self, img):
        self.p.stdin.write(np.clip(img + 0.5, 0, 255).astype(np.uint8).tobytes())
    def close(self):
        self.p.stdin.close(); self.p.wait()

def press_amount(t, t_next, lead=0.40, ramp=0.14, release=0.14):
    """0..1: how far a control is pressed at time t, for a screen change that starts at t_next."""
    up = ease((t - (t_next - lead)) / ramp)
    down = ease((t - (t_next + 0.02)) / release)
    return max(0.0, up * (1 - down))

def _rrect_mask(h, w, x, y, rw, rh, r):
    m = np.zeros((h, w), np.float32)
    r = int(max(1, min(r, rw / 2, rh / 2)))
    cv2.rectangle(m, (int(x + r), int(y)), (int(x + rw - r), int(y + rh)), 1, -1)
    cv2.rectangle(m, (int(x), int(y + r)), (int(x + rw), int(y + rh - r)), 1, -1)
    for cx, cy in [(x + r, y + r), (x + rw - r, y + r), (x + r, y + rh - r), (x + rw - r, y + rh - r)]:
        cv2.circle(m, (int(cx), int(cy)), r, 1, -1, cv2.LINE_AA)
    return cv2.GaussianBlur(m, (0, 0), 0.9)

def press(img, rect, radius, p, kind="light", scale=True):
    """Pressed state: the control sinks a little (scales down) and gets darker, like a hover/active state.
    rect = (x, y, w, h) in screen pixels. kind: light | green | dark (dark controls get lighter)."""
    if p <= 0.003: return img
    H, W = img.shape[:2]
    x, y, w, h = [float(v) for v in rect]
    m = 10
    x0, y0 = int(max(0, x - m)), int(max(0, y - m)); x1, y1 = int(min(W, x + w + m)), int(min(H, y + h + m))
    reg = img[y0:y1, x0:x1].copy()
    rh, rw_ = reg.shape[:2]
    cx, cy = x + w / 2 - x0, y + h / 2 - y0
    s = 1 - 0.035 * p if scale else 1.0
    if scale:
        M = np.float32([[s, 0, cx - s * cx], [0, s, cy - s * cy]])
        reg = cv2.warpAffine(reg, M, (rw_, rh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    mk = _rrect_mask(rh, rw_, cx - w * s / 2, cy - h * s / 2, w * s, h * s, radius * s)[..., None]
    if kind == "dark":
        reg = reg + (255 - reg) * 0.20 * p * mk
    else:
        k = (0.20 if kind == "green" else 0.085) * p
        reg = reg * (1 - k * mk)
    out = img.copy(); out[y0:y1, x0:x1] = reg
    return out
