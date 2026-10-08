#!/usr/bin/env python3
"""Render a built page at 1440 CSS px wide, DSF 3 by default, in 1000px tiles and stitch to one PNG.
usage: shot.py index.html out.png page_height_px [device_scale_factor]
"""
import sys, subprocess, pathlib, re, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
site = pathlib.Path(__file__).resolve().parent.parent
page, out, H = sys.argv[1], sys.argv[2], int(sys.argv[3])
DSF = int(sys.argv[4]) if len(sys.argv) > 4 else 3
src = (site / page).read_text().replace('loading="lazy"', '').replace('<script src="js/main.js" defer></script>', '')
TILE = 1000
tiles = []
y = 0
while y < H:
    h = min(TILE, H - y)
    css = f"<style>html{{transform:translateY(-{y}px);}} body{{height:{H}px}} video{{visibility:hidden}} .skip-link{{display:none}}</style>"
    tmp = site / "_shot_tmp.html"
    tmp.write_text(src.replace("</head>", css + "</head>"))
    png = site / "_shot_tmp.png"
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--force-device-scale-factor={DSF}",
                    f"--window-size=1440,{h}", "--virtual-time-budget=4000", f"--screenshot={png}", f"file://{tmp}"],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    im = Image.open(png).convert("RGB")
    tiles.append(np.array(im)[: h * DSF])
    y += TILE
full = np.concatenate(tiles, axis=0)
Image.fromarray(full).save(out)
(site / "_shot_tmp.html").unlink(missing_ok=True); (site / "_shot_tmp.png").unlink(missing_ok=True)
print("saved", out, full.shape)
