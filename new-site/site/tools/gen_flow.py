#!/usr/bin/env python3
"""Generates src/inc/flow-anim.html: the animated user-flow diagram of the VkusVill case.
All geometry is in SVG user units on a 1905x645 canvas (so build.py's px->rem never touches it)."""
import pathlib
OUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "inc" / "flow-anim.html"
G, GRAY, W = "#62d27a", "#9a9a9a", 3

def head(x, y, d):  # chevron arrow head with its tip at (x, y); d = direction r/l/u/d
    pts = {"r": [(-11, -8), (0, 0), (-11, 8)], "u": [(-8, 11), (0, 0), (8, 11)], "d": [(-8, -11), (0, 0), (8, -11)]}[d]
    return "M" + " L".join(f"{x+px} {y+py}" for px, py in pts)

def arrow(path, hd, delay, stage=1, cls="", color=None):
    c = f' style="--d:{delay}s;{"stroke:"+color if color else ""}"'
    out = f'<g class="ar {cls}" data-s="{stage}"{c}>'
    out += f'<path class="a" pathLength="1" d="{path}"/>'
    if hd: out += f'<path class="h" d="{head(*hd)}"/>'
    return out + "</g>"

def box(x, y, w, h, lines, delay, kind="gray", stage=1, rx=4, cls=""):
    cy = y + h / 2
    n = len(lines); lh = 19
    ty = cy - (n - 1) * lh / 2 + 5
    tsp = "".join(f'<tspan x="{x+w/2}" y="{ty+i*lh}">{l}</tspan>' for i, l in enumerate(lines))
    return (f'<g class="n {cls}" data-s="{stage}" style="--d:{delay}s"><rect class="bx {kind}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}"/>'
            f'<text class="tx {kind}" text-anchor="middle" font-size="14">{tsp}</text></g>')

parts = []
a = parts.append
# ---- base flow (stage 1) -----------------------------------------------------------------------
a(box(74, 346, 228, 91, ["Оформление заказа продуктов", "в приложении ВкусВилл"], 0, "pill", rx=45, cls="out"))
a(arrow("M302 391 H356", None, .35, cls="out"))
a(arrow("M356 391 V321 Q356 300 377 300 H414", (414, 300, "r"), .7, cls="out"))
a(arrow("M356 391 H414", (414, 391, "r"), .8, cls="out"))
a(arrow("M356 391 V461 Q356 482 377 482 H414", (414, 482, "r"), .9, cls="out"))
a(box(414, 266, 228, 69, ["Набор продуктов", "из каталога"], 1.0, "green", cls="out"))
a(box(414, 357, 228, 69, ["Оформление через", "повторный заказ"], 1.1, "green", cls="out"))
a(box(414, 448, 228, 69, ["Набор продуктов", "из «Корзины»"], 1.2, "green", cls="out"))
a(arrow("M642 300 H700 Q722 300 722 322 V391 H754", (754, 391, "r"), 1.5, cls="out"))
a(arrow("M642 391 H754", None, 1.6, cls="out"))
a(arrow("M642 482 H700 Q722 482 722 460 V391", None, 1.55, cls="out"))
a(box(754, 357, 228, 69, ["Проверка продуктов", "в корзине"], 1.9, "gray", cls="out"))
a(arrow("M982 391 H1037", (1037, 391, "r"), 2.25, cls="out"))
a(arrow("M1514 391 H1570", (1570, 391, "r"), 3.5, cls="out"))
a(box(1570, 346, 227, 91, ["Заказ оформлен"], 3.7, "pill", rx=45, cls="out"))
# white spotlight card (appears in stage 3), sits under the highlighted elements
a('<rect class="hl" x="1001" y="96" width="528" height="391"/>')
# ---- the part that matters (stage 1 base, stage 2 new) -----------------------------------------
a('<g class="n dia" data-s="1" style="--d:2.6s"><path class="bx dpath" d="M1128 309 L1219 391 L1128 473 L1037 391 Z"/>'
  '<text class="tx dtx" text-anchor="middle" font-size="14"><tspan x="1128" y="386">Все продукты</tspan><tspan x="1128" y="405">добавлены?</tspan></text></g>')
a(arrow("M1219 391 H1286", (1286, 391, "r"), 3.0))
a('<text class="lb n" data-s="1" style="--d:3.1s" x="1248" y="371" text-anchor="middle" font-size="22">Да</text>')
a(box(1286, 357, 228, 69, ["Заполнение данных", "по доставке"], 3.2, "gray", cls="delivery"))
a(box(1014, 130, 228, 69, ["Функция быстрого поиска", "в корзине"], .4, "new", stage=2, cls="fn"))
a(arrow("M1128 309 V199", (1128, 199, "u"), 0, stage=2, color=G))
a('<text class="lb n" data-s="2" style="--d:.5s" x="1096" y="262" text-anchor="middle" font-size="22">Нет</text>')
a(arrow("M1242 164.5 H1286", (1286, 164.5, "r"), 1.0, stage=2, color=G))
a(box(1286, 130, 228, 69, ["Найден необходимый товар", "и добавлен в корзину"], 1.3, "new", stage=2))
a(arrow("M1400 199 V232 Q1400 254 1378 254 H1150 Q1128 254 1128 276 V300", (1128, 300, "d"), 1.7, stage=2, color=G))

svg = ('<svg viewBox="0 0 1905 645" role="presentation" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'
       '<g class="stage">' + "".join(parts) + '</g></svg>')
html = ('<figure class="s-fig s-fig--wide s-flow s-r s-r--scale" data-flowanim role="img" '
        'aria-label="Схема user flow: после проверки продуктов в корзине добавлена логика быстрого поиска — если не все продукты добавлены, пользователь ищет товар прямо в корзине и возвращается к проверке">\n'
        + svg +
        '\n<span class="s-flow__chip">Добавленная логика</span>\n'
        '<button class="s-flow__replay" type="button" aria-label="Показать анимацию ещё раз">Ещё раз</button>\n</figure>\n')
OUT.write_text(html)
print("wrote", OUT, len(html))
