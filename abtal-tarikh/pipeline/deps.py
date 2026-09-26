"""فحص الاعتماديات: ffmpeg، edge-tts، playwright، numpy — وتثبيت حزم بايثون في ‎.pypackages."""
import importlib
import json
import shutil
import subprocess
import sys
from pathlib import Path
from config import DEPS, PYPKG, PATHS, PIPER


def _run(cmd, timeout=60):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def ffmpeg_bin():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def check_ffmpeg():
    exe = ffmpeg_bin()
    if not exe:
        return False, 'not found'
    enc, flt = _run([exe, '-hide_banner', '-encoders']).stdout, _run([exe, '-hide_banner', '-filters']).stdout
    miss = [e for e in DEPS['ffmpeg_encoders'] if f' {e} ' not in enc] + [f for f in DEPS['ffmpeg_filters'] if f' {f} ' not in flt]
    ver = _run([exe, '-version']).stdout.split()[2]
    return not miss, f'{ver}' + (f' · missing {", ".join(miss)}' if miss else '')


def check_module(name):
    try:
        mod = importlib.import_module(name)
        return True, str(getattr(mod, '__version__', 'ok'))
    except Exception as e:
        return False, type(e).__name__


def node_playwright():
    cands = []
    if shutil.which('npm'):
        try:
            cands.append(Path(_run(['npm', 'root', '-g']).stdout.strip()) / 'playwright')
        except Exception:
            pass
    cands += list(DEPS['node_playwright_hints'])
    return next((p for p in cands if (p / 'package.json').is_file()), None)


def chromium_path():
    pw = node_playwright()
    if not (pw and shutil.which('node')):
        return None
    r = _run(['node', '-e', f'console.log(require({json.dumps(str(pw))}).chromium.executablePath())'])
    exe = Path(r.stdout.strip()) if r.returncode == 0 else None
    return exe if exe and exe.is_file() else None


def check_playwright():
    pw = node_playwright()
    if not pw:
        return False, 'node playwright not found'
    ver = json.loads((pw / 'package.json').read_text())['version']
    return (True, f'{ver} · chromium ok') if chromium_path() else (False, f'{ver} · chromium missing')


def piper_model():
    return PATHS['piper'] / f'{PIPER["model"]}.onnx'


def check_piper():
    ok, detail = check_module('piper')
    has = piper_model().is_file() and piper_model().with_suffix('.onnx.json').is_file()
    return ok and has, f'{detail} · {PIPER["model"]} ' + ('ok' if has else 'missing')


CHECKS = (
    ('ffmpeg', check_ffmpeg),
    ('edge-tts', lambda: check_module('edge_tts')),
    ('playwright', check_playwright),
    ('numpy', lambda: check_module('numpy')),
)


def report():
    ok_all = True
    for name, fn in CHECKS:
        ok, detail = fn()
        ok_all &= ok
        print(f'  {"✓" if ok else "✗"} {name:<11} {detail}')
    ok, detail = check_piper()
    print(f'  {"✓" if ok else "○"} {"piper":<11} {detail} (offline fallback)')
    if not ok_all:
        print('  → python build.py --setup')
    return ok_all


def setup():
    PYPKG.mkdir(exist_ok=True)
    r = subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '--upgrade', '--target', str(PYPKG), *DEPS['pip']])
    if str(PYPKG) not in sys.path:
        sys.path.insert(0, str(PYPKG))
    importlib.invalidate_caches()
    import urllib.request
    PATHS['piper'].mkdir(parents=True, exist_ok=True)
    for f in (piper_model(), piper_model().with_suffix('.onnx.json')):
        if not f.is_file():
            urllib.request.urlretrieve(f'{PIPER["url"]}/{f.name}', f)
    return r.returncode == 0
