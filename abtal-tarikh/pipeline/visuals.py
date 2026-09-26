"""مرحلة المشاهد: خطة لقطات من الإشارات البصرية وخطّ زمن المزج، ثم رسم حتمي في Chromium (ساعة افتراضية، إطاراً إطاراً)
يُمرَّر إلى ffmpeg بعمّال متوازين. المخرجات: out/epNN/video/{plan.json, page.html, visuals.mp4, visuals.json}."""
import hashlib
import json
import math
import re
import subprocess
import numpy as np
from config import AUDIO, PATHS, SERIES, STAGE, VIDEO, VISUALS
from pipeline import deps, design, scripts
from pipeline.sfx import program
from visuals import beats

ROOT = PATHS['pipeline'].parent / 'visuals'
JS = ('core.js', 'rig.js', 'world.js', 'props.js', 'maps.js', 'fx.js', 'shots.js', 'page.js')
LIBRARYISH, STORY = ('hook', 'library', 'closing'), ('popup', 'map', 'object', 'silhouette', 'lesson')
SEATED = ('sit_back', 'sit_up', 'sit_edge', 'cross_legged', 'hug_knees')
BOOK_AT = (480, 1150)


def voice_track(timing, vdir, tl, n):
    # سعة الصوت وشكل الفم لكل إطار، ومن يتكلّم
    prog = program(timing, vdir)[0]
    hop = AUDIO['rate'] // VIDEO['fps']
    x = np.zeros(n * hop, np.float32)
    x[:min(len(prog), n * hop)] = prog[:n * hop]
    fr = x.reshape(n, hop)
    lo, hi = VISUALS['mouth_db']
    db = 10 * np.log10(np.mean(fr ** 2, 1) + 1e-12)
    level = np.clip((db - lo) / (hi - lo), 0, 1)
    spec = np.abs(np.fft.rfft(fr * np.hanning(hop), axis=1))
    f = np.fft.rfftfreq(hop, 1 / AUDIO['rate'])
    cen = (spec * f).sum(1) / (spec.sum(1) + 1e-9)
    shape = np.where(cen > 2600, 'e', np.where(cen < 1100, 'o', 'a'))
    who = np.full(n, '-')
    spans = [(ln['start'], ln['end'], ln['speaker'][0]) for ln in tl['lines']] + [(tl['ident']['start'], tl['ident']['end'], 'n')]
    for a, b, c in spans:
        who[int(a * VIDEO['fps']):int(math.ceil(b * VIDEO['fps']))] = c
    return {'level': ''.join(str(int(round(v * 9))) for v in level), 'shape': ''.join(shape), 'who': ''.join(who)}


def shots(ep, tl, ep_id):
    lead = VISUALS['lead_s']
    items = {it['id']: it for it in scripts.lines(ep)}
    layers = {s['id']: s['layers'] for s in ep['scenes']}
    seg = {s['id']: s for s in tl['segments']}
    out, first = [], set()
    for ln in tl['lines']:
        it = items[ln['id']]
        d = beats.parse(it['visual_beat'], layers[ln['scene']], ln['speaker'], ep_id)
        start = seg[ln['scene']]['start'] if ln['scene'] not in first else ln['start'] - lead
        first.add(ln['scene'])
        out.append({'id': ln['id'], 'scene': ln['scene'], 'part': ln['part'], 'type': d['shot'], 'start': start, 'speaker': ln['speaker'], 'd': d})
    out.append({'id': 'ident', 'scene': 'ident', 'part': 'ident', 'type': 'ident', 'start': tl['ident']['start'], 'speaker': 'narrator', 'd': {'shot': 'ident', 'actors': {}, 'state': {}, 'fx': []}})
    out.sort(key=lambda s: s['start'])
    for a, b in zip(out, out[1:]):
        a['end'] = b['start']
    out[-1]['end'] = tl['duration']
    state = {'book': 'closed', 'lamp': 'on', 'map': 'off', 'curtain': None}
    sticky, scene, last_story, last_map, first_popup = {}, None, None, {}, set()
    T = VISUALS['transitions']
    for i, s in enumerate(out):
        d = s['d']
        if s['scene'] != scene:
            sticky, scene, last_story = {}, s['scene'], None
        s['state'] = dict(state)
        state.update(d.get('state', {}))
        s['next'] = dict(state)
        s['actors'] = {k: dict(v) for k, v in d.get('actors', {}).items()}
        f = s['actors'].setdefault('faris', {})
        if f.get('pose') in SEATED:
            sticky['pose'] = f['pose']
        elif f.get('pose') or f.get('walk'):
            sticky.pop('pose', None)
        elif 'pose' in sticky and s['type'] == 'library':
            f['pose'] = sticky['pose']
        s['subject'], s['fx'] = d.get('subject'), d.get('fx', [])
        s['mini'] = last_story if s['type'] == 'library' else None
        if s['type'] in STORY and s['type'] != 'lesson':
            last_story = i
        s['rise'] = s['type'] == 'popup' and (s['scene'] not in first_popup or 'rise' in d.get('tags', []))
        if s['type'] == 'popup':
            first_popup.add(s['scene'])
        if s['type'] == 'map':
            if 'curl' in d.get('tags', []) and s['scene'] in last_map:
                s['prior'] = last_map[s['scene']]
            if len(d.get('places', [])) > 1:
                last_map[s['scene']] = d['places']
        prev = out[i - 1] if i else None
        s['prevLib'] = i - 1 if prev and prev['type'] in ('library', 'closing') and s['type'] in ('library', 'closing') else None
        if not prev:
            kind = 'cut'
        elif s['type'] == 'ident':
            kind = 'medallion'
        elif prev['type'] == 'ident':
            kind = 'turn' if s['type'] in LIBRARYISH else 'unfold'
        elif prev['type'] in LIBRARYISH and s['type'] in STORY:
            kind = 'unfold'
        elif prev['type'] in STORY and s['type'] in LIBRARYISH:
            kind = 'fold'
        elif prev['type'] in STORY:
            kind = 'turn'
        else:
            kind = 'cut' if prev['scene'] == s['scene'] else 'turn'
        dur = min(T.get(kind, 0), .8 * (s['end'] - s['start'])) if kind != 'cut' else 0
        s['tr'] = {'kind': kind, 'dur': round(dur, 3), 'ax': BOOK_AT[0], 'ay': BOOK_AT[1]}
    return out


def plan(ep, ctx):
    tag = ctx['tag']
    tl = json.loads((ctx['out'] / 'audio' / 'timeline.json').read_text(encoding='utf-8'))
    vdir = ctx.get('voice_dir') or PATHS['voice'] / tag
    timing = json.loads((vdir / 'timing.json').read_text(encoding='utf-8'))
    n = math.ceil(tl['duration'] * VIDEO['fps'] - 1e-6)
    W, H = VIDEO['width'], VIDEO['height']
    return {
        'episode': tag, 'fps': VIDEO['fps'], 'w': W, 'h': H, 'duration': tl['duration'], 'frames': n,
        'palette': design.HEX, 'focus': list(VISUALS['focus']), 'parallax': list(VISUALS['parallax']),
        'safe': {'x1': design.SAFE_BOX[2], 'y1': design.SAFE_BOX[3]}, 'stage': {k: [round(x * W), round(y * H)] for k, (x, y) in STAGE.items()},
        'places': beats.PLACES, 'era': VISUALS['eras'].get(tag, 'andalus'), 'title': ep['title'], 'series_title': SERIES['title'],
        'voice': voice_track(timing, vdir, tl, n), 'shots': shots(ep, tl, tag),
    }


def page_html(pl):
    src = ''.join(f'<script src="{(ROOT / f).as_uri()}"></script>' for f in JS)
    return f'''<!doctype html><html lang="ar"><head><meta charset="utf-8"><style>
{design.fontface_css()}
html,body{{margin:0;width:{pl['w']}px;height:{pl['h']}px;overflow:hidden;background:{pl['palette']['lapis_deep']}}}
#s{{position:absolute;inset:0}}#grain{{position:absolute;inset:0;width:{pl['w']}px;height:{pl['h']}px;pointer-events:none}}
</style></head><body><svg id="defs" width="0" height="0" style="position:absolute"></svg>
<svg id="s" width="{pl['w']}" height="{pl['h']}" viewBox="0 0 {pl['w']} {pl['h']}"></svg><canvas id="grain" width="{pl['w'] // 2}" height="{pl['h'] // 2}"></canvas>
<script>window.PLAN={json.dumps(pl, ensure_ascii=False)};</script>{src}</body></html>'''


def job(page, **kw):
    pw = deps.node_playwright()
    if not pw:
        raise RuntimeError('node playwright not found')
    return {'playwright': str(pw), 'page': str(page), 'w': VIDEO['width'], 'h': VIDEO['height'], 'fps': VIDEO['fps'], 'ffmpeg': deps.ffmpeg_bin(),
            'chromium_args': list(VISUALS['chromium_args']), 'capture': VISUALS['capture'], **VISUALS['mezzanine'], **kw}


def node(jobs, cache):
    # عمّال متوازون، لكلٍّ متصفّحه ومقطعه
    procs = []
    for k, j in enumerate(jobs):
        p = cache / f'job{k}.json'
        p.write_text(json.dumps(j), encoding='utf-8')
        procs.append(subprocess.Popen(['node', str(ROOT / 'render.js'), str(p)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True))
    results = []
    for pr in procs:
        so, se = pr.communicate()
        last = next((json.loads(x) for x in reversed(so.strip().splitlines()) if x.startswith('{"done"')), None)
        if pr.returncode or not last:
            raise RuntimeError(f'render worker failed ({pr.returncode}): {(se or so)[-600:]}')
        results.append(last)
    return results


def digest(pl):
    h = hashlib.sha256(json.dumps(pl, sort_keys=True, ensure_ascii=False).encode())
    for f in JS + ('render.js',):
        h.update((ROOT / f).read_bytes())
    h.update(json.dumps(VISUALS, sort_keys=True, default=str).encode())
    return h.hexdigest()[:20]


def count_frames(path):
    err = subprocess.run([deps.ffmpeg_bin(), '-hide_banner', '-i', str(path), '-map', '0:v', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return int(re.findall(r'frame=\s*(\d+)', err)[-1])


def render(pl, vdir, workers=None, frames=None):
    vdir.mkdir(parents=True, exist_ok=True)
    cache = vdir / 'parts'
    cache.mkdir(exist_ok=True)
    page = vdir / 'page.html'
    page.write_text(page_html(pl), encoding='utf-8')
    a, b = frames or (0, pl['frames'])
    w = max(1, min(workers or VISUALS['workers'], (b - a) // 30 or 1))
    cuts = [a + (b - a) * k // w for k in range(w + 1)]
    res = node([job(page, **{'from': cuts[k], 'to': cuts[k + 1], 'video': str(cache / f'part{k}.mp4')}) for k in range(w)], cache)
    lst = cache / 'list.txt'
    lst.write_text(''.join(f"file '{cache / f'part{k}.mp4'}'\n" for k in range(w)), encoding='utf-8')
    out = vdir / 'visuals.mp4'
    subprocess.run([deps.ffmpeg_bin(), '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', '-movflags', '+faststart', str(out)], check=True)
    for k in range(w):
        (cache / f'part{k}.mp4').unlink()
    got = count_frames(out)
    if got != b - a:
        raise RuntimeError(f'{out.name}: {got} frames, expected {b - a}')
    return out, res


def rig_hash(pl, vdir):
    vdir.mkdir(parents=True, exist_ok=True)
    page = vdir / 'rig.html'
    page.write_text(page_html(pl), encoding='utf-8')
    return node([job(page, **{'list': [], 'video': None, 'rig': True})], vdir)[0]['rig']


def stills(pl, vdir, times, audit=True):
    # لقطات ثابتة وفحص الألوان ومناطق الأمان
    vdir.mkdir(parents=True, exist_ok=True)
    page = vdir / 'page.html'
    page.write_text(page_html(pl), encoding='utf-8')
    frames = sorted({min(pl['frames'] - 1, int(t * pl['fps'])) for t in times})
    r = node([job(page, **{'list': frames, 'video': None, 'capture': 'png', 'stills': str(vdir / 'still_%f.png'), 'audit': [f / pl['fps'] for f in frames] if audit else None})], vdir)[0]
    return [{'frame': f, 'png': png, 'audit': a} for f, png, a in zip(frames, r['stills'], r['audit'] or [None] * len(frames))]


def run(ep, ctx):
    vdir = ctx['out'] / 'video'
    pl = plan(ep, ctx)
    dg = digest(pl)
    meta_p = vdir / 'visuals.json'
    if meta_p.is_file() and (vdir / 'visuals.mp4').is_file() and json.loads(meta_p.read_text(encoding='utf-8')).get('digest') == dg:
        meta = json.loads(meta_p.read_text(encoding='utf-8'))
        print(f'    current · {meta["frames"]} frames · {len(pl["shots"])} shots')
        return meta
    vdir.mkdir(parents=True, exist_ok=True)
    (vdir / 'plan.json').write_text(json.dumps(pl, ensure_ascii=False, indent=1), encoding='utf-8')
    out, res = render(pl, vdir)
    kinds = {}
    for s in pl['shots']:
        kinds[s['type']] = kinds.get(s['type'], 0) + 1
    meta = {'episode': ctx['tag'], 'digest': dg, 'frames': pl['frames'], 'fps': pl['fps'], 'duration': pl['duration'], 'file': out.name,
            'shots': len(pl['shots']), 'kinds': kinds, 'era': pl['era'], 'render_s': round(max(r['seconds'] for r in res), 1)}
    meta_p.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'    {pl["frames"]} frames · {len(pl["shots"])} shots · era {pl["era"]} · {meta["render_s"]:.0f}s render')
    return meta
