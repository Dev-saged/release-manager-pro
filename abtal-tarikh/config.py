"""«أبطال في التاريخ» — إعدادات خط الإنتاج؛ مصدر الحقيقة الوحيد لكل المراحل."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PYPKG = ROOT / '.pypackages'
if PYPKG.is_dir() and str(PYPKG) not in sys.path:
    sys.path.insert(0, str(PYPKG))

VERSION = '0.1.0'

SERIES = {
    'title': 'أبطال في التاريخ',
    'episodes': 10,
}

VIDEO = {
    'width': 1080,
    'height': 1920,
    'fps': 30,
    'min_s': 120,
    'max_s': 180,
    'vcodec': 'libx264',
    'crf': 18,
    'preset': 'slow',
    'pix_fmt': 'yuv420p',
}

# تقدير المدة قبل توليد الصوت، وحدّ التشكيل الأدنى لكل حرف
SPEECH = {
    'wps_estimate': 2.0,
    'scene_gap_s': 1.2,
    'min_diacritic_ratio': 0.5,
}

AUDIO = {
    'rate': 48000,
    'lufs': -14.0,
    'true_peak': -1.5,
    'lra': 11,
    'acodec': 'aac',
    'bitrate': '192k',
}

PATHS = {
    'episodes': ROOT / 'episodes',
    'schema': ROOT / 'episodes' / 'schema.json',
    'fixture': ROOT / 'episodes' / 'ep00_test.json',
    'fonts': ROOT / 'assets' / 'fonts',
    'pipeline': ROOT / 'pipeline',
    'out': ROOT / 'out',
    'cache': ROOT / 'cache',
}

GOOGLE_FONTS_RAW = 'https://raw.githubusercontent.com/google/fonts/main/ofl'

# titles: Reem Kufi · subtitles: Readex Pro
FONTS = {
    'title': {
        'family': 'Reem Kufi',
        'file': 'ReemKufi[wght].ttf',
        'url': f'{GOOGLE_FONTS_RAW}/reemkufi/ReemKufi%5Bwght%5D.ttf',
        'license': 'OFL-ReemKufi.txt',
        'wght': (400, 700),
    },
    'subtitle': {
        'family': 'Readex Pro',
        'file': 'ReadexPro[HEXP,wght].ttf',
        'url': f'{GOOGLE_FONTS_RAW}/readexpro/ReadexPro%5BHEXP%2Cwght%5D.ttf',
        'license': 'OFL-ReadexPro.txt',
        'wght': (160, 700),
    },
}

# نظام التصميم المقفل: مخطوطة مذهّبة × ورق مقصوص بطبقات بارالاكس
DESIGN = {
    'concept': 'illuminated manuscript × paper-cut parallax',
    'oklch': {
        'lapis': (0.35, 0.12, 260),
        'gold': (0.78, 0.14, 85),
        'emerald': (0.55, 0.13, 160),
        'ink': (0.18, 0.03, 260),
    },
    # درجات مشتقّة من ألوان النظام نفسها (لا ألوان جديدة): ورق = ذهب فاتح منزوع التشبّع
    'derived': {
        'parchment': ('gold', 0.94, 0.035),
        'paper_shadow': ('ink', 0.10, 0.02),
        'lapis_deep': ('lapis', 0.24, 0.09),
        'gold_dim': ('gold', 0.62, 0.11),
    },
}

# مناطق الأمان: لا شيء في أسفل 22% ولا في يمين 12% من الإطار
SAFE = {
    'bottom': 0.22,
    'right': 0.12,
}

DEPS = {
    'python': ('edge_tts', 'numpy'),
    'pip': ('edge-tts', 'numpy', 'imageio-ffmpeg'),
    'node_playwright_hints': (Path('/opt/node22/lib/node_modules/playwright'),),
    'ffmpeg_encoders': ('libx264', 'aac'),
    'ffmpeg_filters': ('loudnorm', 'sidechaincompress', 'amix', 'adelay'),
}
