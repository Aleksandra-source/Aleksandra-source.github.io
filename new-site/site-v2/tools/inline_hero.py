#!/usr/bin/env python3
"""Make the first screen of index.html / about.html appear in one round trip.

Run it on the PUBLISHED copy (Portfolio/new) after rsync from site-v2:
    python3 tools/inline_hero.py ../../new
It puts the stylesheet and the video poster (the still frame of the portrait / desk video) straight into the HTML,
so the photo is painted together with the page - nothing has to be fetched before it can be shown.
"""
import re, sys, base64, pathlib
root = pathlib.Path(sys.argv[1]).resolve()
css = (root / "css" / "style.css").read_text().replace("url(../fonts/", "url(fonts/")
for page, poster in (("index.html", "img/avatar-poster.jpg"), ("about.html", "img/hero-desk-poster.jpg")):
    p = root / page
    html = p.read_text()
    html = re.sub(r'<link rel="stylesheet" href="css/style\.css[^"]*">', lambda m: "<style>" + css + "</style>", html, count=1)
    html = html.replace(f'  <link rel="preload" href="{poster}" as="image" fetchpriority="high">\n', "")
    data = "data:image/jpeg;base64," + base64.b64encode((root / poster).read_bytes()).decode()
    assert f'poster="{poster}"' in html, (page, "poster attribute not found")
    html = html.replace(f'poster="{poster}"', f'poster="{data}"')
    p.write_text(html)
    print(page, "->", len(html) // 1024, "KB")
