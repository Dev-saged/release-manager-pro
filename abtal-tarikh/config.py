"""«أبطال في التاريخ» — إعدادات خط الإنتاج؛ مصدر الحقيقة الوحيد لكل المراحل."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PYPKG = ROOT / '.pypackages'
if PYPKG.is_dir() and str(PYPKG) not in sys.path:
    sys.path.insert(0, str(PYPKG))

VERSION = '0.3.0'

SERIES = {
    'title': 'أبطال في التاريخ',
    'title_diacritized': 'أَبْطَالٌ فِي التَّارِيخِ',
    'episodes': 10,
    # الإطار الثابت: فارس وجدّه في مكتبة قديمة؛ لا يتكلّم أيّ شخص تاريخي
    'cast': {'faris': 'فَارِسٌ — الْحَفِيدُ', 'grandpa': 'الْجَدُّ'},
    # بنية كل حلقة: سؤال خطّاف → إطار → قصة → درس واحد → سؤال ختامي للتعليقات
    'parts': ('hook', 'frame', 'story', 'lesson', 'closing'),
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
    'wps_estimate': 2.3,
    'scene_gap_s': 1.2,
    'words': (300, 380),
    'hook_max_words': 9,
}

# مفردات الإشارات المسموحة في النصوص؛ مرحلتا المؤثرات والمشاهد تنفّذانها
CUES = {
    'shots': ('hook', 'library', 'popup', 'map', 'silhouette', 'object', 'lesson', 'closing'),
    'sfx': (
        'stinger_hook', 'book_open', 'book_close', 'page_turn', 'paper_unfold', 'whoosh_page',
        'candle_flicker', 'quill_scratch', 'chime_soft', 'chime_lesson', 'footsteps',
        'wind_soft', 'desert_wind', 'waves', 'seagulls', 'river_flow', 'birds_morning', 'night_crickets',
        'sail_flap', 'ship_creak', 'rope_pull', 'drums_distant', 'hoofbeats', 'camel_bells',
        'market_bustle', 'crowd_murmur', 'gate_open', 'stone_blocks', 'hammer_anvil',
        'metal_tools', 'glass_clink', 'mortar_pestle', 'fire_crackle',
    ),
    'layers': (
        'library_shelves', 'library_window', 'lamp', 'desk', 'open_book', 'popup_frame',
        'sky_dawn', 'sky_day', 'sky_dusk', 'sky_night', 'stars', 'sun',
        'sea', 'strait_cliffs', 'ships', 'rails', 'hills', 'mountains', 'green_mountains', 'dunes', 'palms',
        'river', 'lake', 'olive_trees', 'walls', 'fortress', 'gate', 'caravan', 'riders', 'army_silhouettes',
        'city_baghdad', 'city_cordoba', 'city_basra', 'city_cairo', 'city_bukhara', 'city_damascus',
        'city_jerusalem', 'city_constantinople', 'city_tangier', 'city_fes',
        'scholar_silhouette', 'scribe_silhouette', 'boy_silhouette', 'instruments', 'eye_diagram',
        'light_ray', 'number_tiles', 'map_parchment', 'route_line', 'isnad_chain', 'manuscript_page',
    ),
}

# الحدود الشرعية للمشاهد: المعارك ظلالٌ رمزية فقط، لا دماء، لا نساء، لا سحر
RULES = {
    'banned_visual': ('blood', 'wound', 'kill', 'corpse', 'dead body', 'woman', 'women', 'girl', 'wife',
                      'mother', 'sister', 'queen', 'princess', 'magic', 'spell', 'wizard', 'witch',
                      'sorcer', 'enchant', 'genie', 'glowing rune'),
    'battle_terms': ('army', 'armies', 'battle', 'siege', 'combat', 'troops', 'cannon', 'war '),
    'battle_shot': 'silhouette',
    'min_sources': 2,
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
    'voice': ROOT / 'voice',
    'tts_cache': ROOT / 'cache' / 'tts',
    'piper': ROOT / 'assets' / 'voices',
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

# الأصوات: edge-tts أولاً؛ «hero» محجوز (الشخصيات التاريخية لا تتكلّم في النصوص) ويُختار أوّل صوت متاح
VOICES = {
    'narrator': {'voice': 'ar-SA-HamedNeural', 'rate': '+0%', 'pitch': '+0Hz', 'piper_scale': 1.0},
    'grandpa': {'voice': 'ar-EG-ShakirNeural', 'rate': '-8%', 'pitch': '-6Hz', 'piper_scale': 1.1},
    'faris': {'voice': 'ar-AE-HamdanNeural', 'rate': '+8%', 'pitch': '+12Hz', 'piper_scale': 0.92},
    'hero': {'voice': ('ar-KW-FahedNeural', 'ar-QA-MoazNeural'), 'rate': '+0%', 'pitch': '+0Hz', 'piper_scale': 1.0},
}

# بديل دون اتصال: Piper بصوت ar_JO-kareem وتوقيتات تقديرية
PIPER = {
    'model': 'ar_JO-kareem-medium',
    'url': 'https://huggingface.co/rhasspy/piper-voices/resolve/main/ar/ar_JO/kareem/medium',
}

TTS = {
    'engine_env': 'ABTAL_TTS',
    'retries': 5,
    'backoff_s': 1.0,
    'concurrency': 4,
    'integrity_attempts': 4,
    's_per_letter': (0.028, 0.32),
}

# المعالجة: قصّ الصمت، نَفَس 180ms بين الأسطر، ضغط، توحيد المستوى
VOICE_POST = {
    'lead_pad_s': 0.04,
    'tail_pad_s': 0.12,
    'max_pause_s': 0.30,
    'breath_s': 0.18,
    'breath_dbfs': -44,
    'scene_gap_s': 0.65,
    'line_rms_dbfs': -20,
    'peak_dbfs': -1.0,
    'lufs': -16.0,
    # ميزانية الصوت داخل مدة الحلقة؛ عند تجاوزها يُضبط الإيقاع بـ atempo (دون تغيير النبرة) والأنفاس ثابتة
    'budget_s': VIDEO['max_s'] - 8,
    'max_tempo': 1.15,
    'filters': 'highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2',
}

DEPS = {
    'python': ('edge_tts', 'numpy'),
    'pip': ('edge-tts', 'numpy', 'imageio-ffmpeg', 'piper-tts'),
    'node_playwright_hints': (Path('/opt/node22/lib/node_modules/playwright'),),
    'ffmpeg_encoders': ('libx264', 'aac'),
    'ffmpeg_filters': ('loudnorm', 'sidechaincompress', 'amix', 'adelay'),
}
