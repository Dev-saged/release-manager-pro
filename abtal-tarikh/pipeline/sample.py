"""بطاقة العيّنة: إثبات نظام التصميم بمقاس الإطار، مع إظهار مناطق الأمان."""
import json
import subprocess
from config import VIDEO, SERIES, PATHS
from pipeline import design, deps

STAR = 'M0,-1 L.24,-.58 .71,-.71 .58,-.24 1,0 .58,.24 .71,.71 .24,.58 0,1 -.24,.58 -.71,.71 -.58,.24 -1,0 -.58,-.24 -.71,-.71 -.24,-.58Z'


def html(show_safe=True):
    W, H = VIDEO['width'], VIDEO['height']
    x0, y0, x1, y1 = design.SAFE_BOX
    fx0, fy0, fx1, fy1 = 56, 140, x1 - 40, y1 - 40
    stars = ''.join(f'<use href="#st" transform="translate({x},{y}) scale({s})" opacity="{o}"/>'
                    for x, y, s, o in ((180, 330, 9, .9), (760, 260, 6, .7), (420, 210, 4, .6), (860, 470, 5, .5), (120, 560, 4, .5), (640, 420, 3, .6)))
    corners = ''.join(f'<use href="#rose" transform="translate({x},{y})"/>' for x, y in ((fx0, fy0), (fx1, fy0), (fx0, fy1), (fx1, fy1)))
    hatch = f'''<g class="safe"><rect x="0" y="{y1}" width="{W}" height="{H - y1}"/><rect x="{x1}" y="0" width="{W - x1}" height="{y1}"/>
      <text x="{W / 2}" y="{y1 + (H - y1) / 2}">منطقة واجهة المنصّة · ٢٢٪</text></g>''' if show_safe else ''
    swatches = ''.join(f'<div><i style="background:var(--{k})"></i><span>{n}</span></div>'
                       for k, n in (('lapis', 'لازورد'), ('gold', 'ذهب'), ('emerald', 'زمرّد'), ('ink', 'حبر')))
    return f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
{design.fontface_css()}
{design.tokens_css()}
*{{margin:0;box-sizing:border-box}}
body{{width:var(--w);height:var(--h);overflow:hidden;background:var(--lapis-deep)}}
svg.scene{{position:absolute;inset:0}}
.paper{{filter:drop-shadow(0 10px 14px oklch(0.10 0.02 260 / .55))}}
h1{{position:absolute;inset-inline:{W - x1 + 60}px 96px;top:430px;text-align:center;font:700 124px/1.25 var(--f-title);color:var(--gold);
   text-shadow:0 4px 0 var(--gold-dim),0 10px 26px oklch(0.10 0.02 260 / .7)}}
.ep{{position:absolute;inset-inline:{W - x1 + 60}px 96px;top:370px;text-align:center;font:500 34px/1 var(--f-sub);color:var(--parchment);letter-spacing:.02em}}
.sub{{position:absolute;inset-inline:{W - x1 + 70}px 110px;top:{y1 - 250}px;padding:22px 30px;border-radius:18px;background:oklch(0.18 0.03 260 / .82);
   font:500 46px/1.6 var(--f-sub);color:var(--parchment);text-align:center}}
.sw{{position:absolute;inset-inline:{W - x1 + 90}px 130px;top:{y1 - 420}px;display:flex;justify-content:space-between}}
.sw div{{display:grid;justify-items:center;gap:8px;font:500 26px var(--f-sub);color:var(--parchment)}}
.sw i{{width:84px;height:84px;border-radius:50%;border:4px solid var(--gold)}}
.safe rect{{fill:url(#hatch)}}
.safe text{{font:600 40px var(--f-sub);fill:var(--parchment);text-anchor:middle;dominant-baseline:middle}}
</style></head><body>
<svg class="scene" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
 <defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--lapis-deep)"/><stop offset=".55" stop-color="var(--lapis)"/><stop offset="1" stop-color="var(--gold-dim)"/></linearGradient>
  <path id="st" d="{STAR}" fill="var(--gold)"/>
  <g id="rose"><circle r="30" fill="var(--lapis-deep)" stroke="var(--gold)" stroke-width="4"/><path d="{STAR}" transform="scale(24)" fill="var(--gold)"/><circle r="7" fill="var(--emerald)"/></g>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .08 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <pattern id="hatch" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="22" height="22" fill="oklch(0.18 0.03 260 / .55)"/><rect width="8" height="22" fill="oklch(0.78 0.14 85 / .35)"/></pattern>
 </defs>
 <rect width="{W}" height="{H}" fill="url(#sky)"/>
 <circle cx="700" cy="930" r="210" fill="var(--gold)" opacity=".92"/>
 {stars}
 <g class="paper"><path d="M0 1080 C180 980 300 1010 460 950 S760 1000 1080 900 V{H} H0Z" fill="var(--lapis)"/></g>
 <g class="paper"><path d="M0 1180 C220 1100 380 1150 560 1080 S880 1120 1080 1060 V{H} H0Z" fill="var(--emerald)"/></g>
 <g class="paper"><path d="M0 1310 C160 1240 420 1290 600 1230 S900 1250 1080 1200 V{H} H0Z" fill="oklch(0.42 0.11 160)"/></g>
 <g class="paper"><path d="M0 1460 C240 1390 520 1450 740 1380 S980 1400 1080 1360 V{H} H0Z" fill="var(--ink)"/></g>
 <rect width="{W}" height="{H}" filter="url(#grain)" fill="var(--parchment)"/>
 <rect x="{fx0}" y="{fy0}" width="{fx1 - fx0}" height="{fy1 - fy0}" rx="6" fill="none" stroke="var(--gold)" stroke-width="6"/>
 <rect x="{fx0 + 16}" y="{fy0 + 16}" width="{fx1 - fx0 - 32}" height="{fy1 - fy0 - 32}" rx="4" fill="none" stroke="var(--gold)" stroke-width="2" opacity=".8"/>
 {corners}
 {hatch}
</svg>
<p class="ep">عيّنة نظام التصميم</p>
<h1>{SERIES['title']}</h1>
<div class="sw">{swatches}</div>
<p class="sub">فِي قَدِيمِ الزَّمَانِ، عَاشَ بَطَلٌ شُجَاعٌ.</p>
</body></html>'''


def render(out_png, show_safe=True):
    out_png.parent.mkdir(parents=True, exist_ok=True)
    page = out_png.with_suffix('.html')
    page.write_text(html(show_safe), encoding='utf-8')
    r = subprocess.run(['node', str(PATHS['pipeline'] / 'snap.js'), str(deps.node_playwright()), str(page), str(out_png),
                        str(VIDEO['width']), str(VIDEO['height'])], capture_output=True, text=True, timeout=120)
    if r.returncode:
        raise RuntimeError(r.stderr.strip())
    return json.loads(r.stdout)
