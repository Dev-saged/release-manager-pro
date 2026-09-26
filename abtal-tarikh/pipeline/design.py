"""نظام التصميم: تحويل OKLCH، مناطق الأمان، ورموز CSS مشتقّة من config."""
import math
from config import DESIGN, SAFE, VIDEO, FONTS, PATHS


def oklch_to_srgb(l, c, h):
    a, b = c * math.cos(math.radians(h)), c * math.sin(math.radians(h))
    l_, m_, s_ = (l + 0.3963377774 * a + 0.2158037573 * b,
                  l - 0.1055613458 * a - 0.0638541728 * b,
                  l - 0.0894841775 * a - 1.2914855480 * b)
    L, M, S = l_ ** 3, m_ ** 3, s_ ** 3
    lin = (4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
           -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
           -0.0041960863 * L - 0.7034186147 * M + 1.7076147010 * S)
    enc = lambda x: 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
    return tuple(round(min(1, max(0, enc(min(1, max(0, v))))) * 255) for v in lin)


def _all_oklch():
    base = dict(DESIGN['oklch'])
    for name, (src, l, c) in DESIGN['derived'].items():
        base[name] = (l, c, DESIGN['oklch'][src][2])
    return base


OKLCH = _all_oklch()
RGB = {k: oklch_to_srgb(*v) for k, v in OKLCH.items()}
HEX = {k: '#%02x%02x%02x' % v for k, v in RGB.items()}


def luminance(rgb):
    ch = [v / 255 for v in rgb]
    ch = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in ch]
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]


def contrast(fg, bg):
    a, b = sorted((luminance(RGB[fg]), luminance(RGB[bg])), reverse=True)
    return (a + 0.05) / (b + 0.05)


# صندوق المحتوى المسموح: [x0, x1) × [y0, y1) بالبكسل
SAFE_BOX = (0, 0, math.floor(VIDEO['width'] * (1 - SAFE['right'])),
            math.floor(VIDEO['height'] * (1 - SAFE['bottom'])))


def in_safe(x, y, w, h):
    x0, y0, x1, y1 = SAFE_BOX
    return x >= x0 and y >= y0 and x + w <= x1 and y + h <= y1


def fontface_css():
    out = []
    for role, f in FONTS.items():
        lo, hi = f['wght']
        out.append(f"@font-face{{font-family:'{f['family']}';src:url('{(PATHS['fonts'] / f['file']).as_uri()}') format('truetype');"
                   f"font-weight:{lo} {hi};font-display:block}}")
    return '\n'.join(out)


def tokens_css():
    x0, y0, x1, y1 = SAFE_BOX
    colors = ''.join(f'--{k.replace("_", "-")}:oklch({l} {c} {h});' for k, (l, c, h) in OKLCH.items())
    return (f":root{{{colors}--w:{VIDEO['width']}px;--h:{VIDEO['height']}px;"
            f"--safe-x1:{x1}px;--safe-y1:{y1}px;"
            f"--f-title:'{FONTS['title']['family']}',serif;--f-sub:'{FONTS['subtitle']['family']}',sans-serif}}")
