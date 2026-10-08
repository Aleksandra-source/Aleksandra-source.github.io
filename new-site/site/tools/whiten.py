#!/usr/bin/env python3
"""Pull the faint grey shadow/banding around the portrait to pure white (the page is #fff, so no 'seams' show).
usage: whiten.py in.mp4 out.mp4 [lo hi]"""
import sys, subprocess, json, numpy as np
src, dst = sys.argv[1], sys.argv[2]
lo, hi = (float(sys.argv[3]), float(sys.argv[4])) if len(sys.argv) > 4 else (232.0, 247.0)
p = json.loads(subprocess.run(["ffprobe","-v","error","-select_streams","v:0","-show_entries","stream=width,height,r_frame_rate","-of","json",src],capture_output=True,text=True).stdout)["streams"][0]
w, h = p["width"], p["height"]; fr = p["r_frame_rate"]
dec = subprocess.Popen(["ffmpeg","-v","error","-i",src,"-f","rawvideo","-pix_fmt","rgb24","-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{w}x{h}","-r",fr,"-i","-","-c:v","libx264","-preset","veryslow","-crf","20","-pix_fmt","yuv420p","-movflags","+faststart","-an",dst], stdin=subprocess.PIPE)
rng = np.random.default_rng(1); n = 0
while True:
    b = dec.stdout.read(w*h*3)
    if len(b) < w*h*3: break
    f = np.frombuffer(b, np.uint8).reshape(h, w, 3).astype(np.float32)
    m = f.min(2)
    t = np.clip((m - lo) / (hi - lo), 0, 1); t = t*t*(3-2*t)
    # neutral-ish only (skin is warm: its blue channel stays well below its red)
    sat = f.max(2) - f.min(2)
    t *= np.clip((14.0 - sat) / 8.0, 0, 1)
    out = f + (255.0 - f) * t[..., None]
    out += rng.uniform(-0.45, 0.45, out.shape).astype(np.float32) * (1 - t[..., None])
    enc.stdin.write(np.clip(out + 0.5, 0, 255).astype(np.uint8).tobytes()); n += 1
enc.stdin.close(); enc.wait(); print("frames", n)
