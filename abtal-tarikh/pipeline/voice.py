"""مرحلة الصوت: edge-tts بتوقيت الكلمات، تخزين بالبصمة، إعادة محاولة بتراجع، بديل Piper دون اتصال، وفحص سلامة النطق."""
import asyncio
import difflib
import hashlib
import json
import os
import re
import ssl
import subprocess
import wave
import numpy as np
from config import PATHS, VOICES, PIPER, TTS, VOICE_POST, SERIES
from pipeline import deps, scripts, schema

SR = 48000
ARABIC = re.compile(r'[ء-يٱ]')
HARAKAT = re.compile('[\u064B-\u0652]+$')


class Offline(Exception):
    pass


def tokens(text):
    return [t for t in text.split() if ARABIC.search(t)]


def key(word):
    return schema.norm(re.sub(r'[^ء-ْٰٱ]', '', word))


def digest(*parts):
    return hashlib.sha256('\x1f'.join(map(str, parts)).encode()).hexdigest()[:24]


def waqf(text):
    # الوقف على آخر كلمة: تسكين الحركة الأخيرة وحذف التنوين
    head, _, last = text.rstrip('.!؟،: ').rpartition(' ')
    tail = HARAKAT.search(last)
    core = last[:tail.start()] if tail else last
    if core[-1:] not in 'اىو':
        core += ('\u0651' if tail and '\u0651' in tail.group() else '') + '\u0652'
    return f'{head} {core}'.strip()


def _edge():
    # edge-tts يثق بـ certifi وحده؛ نضيف شهادات البيئة (وكيل HTTPS مثلاً) إلى سياقاته
    import edge_tts
    from edge_tts import communicate, voices
    for var in ('SSL_CERT_FILE', 'REQUESTS_CA_BUNDLE'):
        path = os.environ.get(var)
        if path and os.path.isfile(path):
            for mod in (communicate, voices):
                if isinstance(getattr(mod, '_SSL_CTX', None), ssl.SSLContext):
                    mod._SSL_CTX.load_verify_locations(path)
    return edge_tts


async def available_voices():
    cache = PATHS['cache'] / 'voices.json'
    try:
        names = sorted(v['ShortName'] for v in await asyncio.wait_for(_edge().list_voices(), 20))
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(names))
        return set(names), True
    except Exception:
        return (set(json.loads(cache.read_text())) if cache.is_file() else set()), False


def resolve(role, override, names):
    cfg = {**VOICES[role], **{k: v for k, v in (override or {}).items() if k in ('voice', 'rate', 'pitch')}}
    cands = cfg['voice'] if isinstance(cfg['voice'], (tuple, list)) else (cfg['voice'],)
    pick = next((v for v in cands if v in names), None) if names else cands[0]
    if not pick:
        raise RuntimeError(f'no available voice for {role}: {cands}')
    return {**cfg, 'voice': pick}


async def edge(text, v, sem):
    cache = PATHS['tts_cache']
    h = digest('edge', v['voice'], v['rate'], v['pitch'], text)
    mp3, meta_p = cache / f'{h}.mp3', cache / f'{h}.json'
    if meta_p.is_file():
        return {**json.loads(meta_p.read_text(encoding='utf-8')), 'audio': str(mp3)}
    edge_tts = _edge()
    delay, last = TTS['backoff_s'], None
    for _ in range(TTS['retries']):
        try:
            async with sem:
                words, buf = [], bytearray()
                com = edge_tts.Communicate(text, v['voice'], rate=v['rate'], pitch=v['pitch'], boundary='WordBoundary')
                async for ch in com.stream():
                    if ch['type'] == 'audio':
                        buf += ch['data']
                    elif ch['type'] == 'WordBoundary':
                        words.append([ch['text'], ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7])
            if not buf or not words:
                raise RuntimeError('empty synthesis')
            cache.mkdir(parents=True, exist_ok=True)
            mp3.write_bytes(buf)
            meta = {'engine': 'edge', 'voice': v['voice'], 'text': text, 'words': words}
            meta_p.write_text(json.dumps(meta, ensure_ascii=False), encoding='utf-8')
            return {**meta, 'audio': str(mp3)}
        except Exception as e:
            last = e
            await asyncio.sleep(delay)
            delay *= 2
    raise Offline(repr(last))


def decode(path, af=None):
    cmd = [deps.ffmpeg_bin(), '-v', 'error', '-i', str(path)] + (['-af', af] if af else []) + ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).copy()


def speech_span(x, floor_db=-40):
    fr = SR // 100
    rms = np.sqrt(np.mean(x[:len(x) // fr * fr].reshape(-1, fr) ** 2, axis=1) + 1e-12)
    on = np.nonzero(rms > rms.max() * 10 ** (floor_db / 20))[0]
    return (float(on[0] * fr / SR), float((on[-1] + 1) * fr / SR)) if len(on) else (0.0, len(x) / SR)


def estimate_words(text, audio):
    # توقيت تقديري لـ Piper: يُوزَّع زمن الكلام على الكلمات بحسب عدد الحروف، مع وقفات عند علامات الترقيم
    a, b = speech_span(decode(audio))
    toks = tokens(text)
    weights = [len(ARABIC.findall(t)) + 1 + (3 if t[-1] in '.،؟!:' else 0) for t in toks]
    unit, t, out = (b - a) / sum(weights), a, []
    for tok, w in zip(toks, weights):
        speak = (len(ARABIC.findall(tok)) + 1) * unit
        out.append([tok, round(t, 3), round(t + speak, 3)])
        t += w * unit
    return out


_piper = None


def piper(text, v):
    global _piper
    cache = PATHS['tts_cache']
    h = digest('piper', PIPER['model'], v['piper_scale'], text)
    wav_p, meta_p = cache / f'{h}.wav', cache / f'{h}.json'
    if meta_p.is_file():
        return {**json.loads(meta_p.read_text(encoding='utf-8')), 'audio': str(wav_p)}
    from piper import PiperVoice
    from piper.config import SynthesisConfig
    if _piper is None:
        _piper = PiperVoice.load(str(PATHS['piper'] / f'{PIPER["model"]}.onnx'))
        _piper.use_tashkeel = False
    cache.mkdir(parents=True, exist_ok=True)
    with wave.open(str(wav_p), 'wb') as w:
        _piper.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=v['piper_scale']))
    meta = {'engine': 'piper', 'voice': PIPER['model'], 'text': text, 'words': estimate_words(text, wav_p)}
    meta_p.write_text(json.dumps(meta, ensure_ascii=False), encoding='utf-8')
    return {**meta, 'audio': str(wav_p)}


def check(text, words, engine):
    toks = tokens(text)
    want, got = [key(t) for t in toks], [key(w[0]) for w in words]
    flags = [] if len(want) == len(got) else [{'type': 'count', 'tokens': len(want), 'boundaries': len(got)}]
    for op, i1, i2, _, _ in difflib.SequenceMatcher(a=want, b=got, autojunk=False).get_opcodes():
        if op in ('delete', 'replace'):
            flags += [{'type': 'skipped' if op == 'delete' else 'mismatch', 'word': toks[i]} for i in range(i1, i2)]
    if engine == 'edge':
        lo, hi = TTS['s_per_letter']
        for w, a, b in words:
            n = max(1, len(ARABIC.findall(w)))
            if not lo * n <= b - a <= hi * n + 0.25:
                flags.append({'type': 'duration', 'word': w, 's': round(b - a, 3)})
    return flags


def _shift(rate, d):
    return f'{int(rate[:-1]) + d:+d}%'


def variant(text, v, flags, attempt):
    # 0 كما هو · 1 أبطأ قليلاً · 2 الكلمة المُعلَّمة دون تشكيل · 3 الاثنان معاً
    bad = {key(f['word']) for f in flags if 'word' in f}
    if attempt >= 2 and bad:
        text = ' '.join(schema.norm(t) if key(t) in bad else t for t in text.split())
    return text, ({**v, 'rate': _shift(v['rate'], -3)} if attempt in (1, 3) else v)


async def synth(text, v, engine, sem):
    if engine['name'] == 'edge':
        best, flags = None, []
        for attempt in range(TTS['integrity_attempts']):
            t2, v2 = variant(text, v, flags, attempt)
            try:
                meta = await edge(t2, v2, sem)
            except Offline:
                engine['name'] = 'piper'
                break
            flags = check(text, meta['words'], 'edge')
            cand = {**meta, 'flags': flags, 'attempts': attempt + 1}
            if best is None or len(flags) < len(best['flags']):
                best = cand
            if not flags:
                break
        if engine['name'] == 'edge':
            return best
    return {**piper(text, v), 'flags': [], 'attempts': 1}


def process(meta):
    words = meta['words']
    s = max(0.0, words[0][1] - VOICE_POST['lead_pad_s'])
    e = words[-1][2] + VOICE_POST['tail_pad_s']
    x = decode(meta['audio'], f'atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS,{VOICE_POST["filters"]}')
    x, words = squeeze(x, [[w, a - s, b - s] for w, a, b in words])
    fr = SR // 50
    rms = np.sqrt(np.mean(x[:len(x) // fr * fr].reshape(-1, fr) ** 2, axis=1) + 1e-12)
    active = rms[rms > rms.max() * 10 ** (-30 / 20)]
    x *= 10 ** ((VOICE_POST['line_rms_dbfs'] - 20 * np.log10(np.sqrt(np.mean(active ** 2)))) / 20)
    x *= min(1.0, 10 ** (VOICE_POST['peak_dbfs'] / 20) / (np.abs(x).max() + 1e-9))
    fi, fo = int(0.01 * SR), int(0.06 * SR)
    x[:fi] *= np.linspace(0, 1, fi)
    x[-fo:] *= np.linspace(1, 0, fo)
    return x, [[w, round(a, 3), round(b, 3)] for w, a, b in words]


def squeeze(x, words):
    # قصّ الصمت الداخلي: كل وقفة بين كلمتين تُختصر إلى max_pause_s، والتوقيتات تُزاح بدقّة
    keep, cuts, pos, ramp = [], [], 0, int(0.005 * SR)
    m = VOICE_POST['max_pause_s']
    for (_, _, end), (_, start, _) in zip(words, words[1:]):
        if start - end > m:
            a, b = int((end + m / 2) * SR), int((start - m / 2) * SR)
            seg = x[pos:a].copy()
            seg[-ramp:] *= np.linspace(1, 0, ramp)
            keep.append(seg)
            cuts.append((end + m / 2, (b - a) / SR))
            pos = b
    tail = x[pos:].copy()
    if cuts:
        tail[:ramp] *= np.linspace(0, 1, ramp)
    keep.append(tail)
    shift = lambda t: t - sum(d for at, d in cuts if at < t)
    return np.concatenate(keep), [[w, shift(a), shift(b)] for w, a, b in words]


def tempo(x, words, factor):
    if factor <= 1.0:
        return x, words
    y = subprocess.run([deps.ffmpeg_bin(), '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-af', f'atempo={factor:.4f}', '-f', 'f32le', '-'], input=x.tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(y, np.float32).copy(), [[w, round(a / factor, 3), round(b / factor, 3)] for w, a, b in words]


def breath(n, seed):
    # نَفَس خافت: ضجيج مرشَّح بغلاف شهيق قصير
    r = np.random.default_rng(seed).standard_normal(n).astype(np.float32)
    r = np.convolve(r, np.ones(8) / 8, mode='same') - np.convolve(r, np.ones(64) / 64, mode='same')
    env = np.sin(np.linspace(0, np.pi, n)) ** 2
    r *= env
    return r * 10 ** (VOICE_POST['breath_dbfs'] / 20) / (np.sqrt(np.mean(r ** 2)) + 1e-9)


def write_wav(path, x):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


def lufs(path):
    out = subprocess.run([deps.ffmpeg_bin(), '-hide_banner', '-nostats', '-i', str(path), '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    a = out.rindex('{')
    return float(json.loads(out[a:out.index('}', a) + 1])['input_i'])


async def _run(ep, ctx):
    names, online = await available_voices()
    forced = os.environ.get(TTS['engine_env'])
    engine = {'name': forced or ('edge' if online else 'piper')}
    roles = {sp: resolve(sp, ep['cast'][sp], names) for sp in ep['cast']}
    roles['narrator'] = resolve('narrator', None, names)
    items = list(scripts.lines(ep))
    ident = waqf(f'{SERIES["title_diacritized"]}: {ep["title"]}')
    sem = asyncio.Semaphore(TTS['concurrency'])
    res = await asyncio.gather(*[synth(it['text_diacritized'], roles[it['speaker']], engine, sem) for it in items],
                               synth(ident, roles['narrator'], engine, sem))
    out_dir = ctx.get('voice_dir') or PATHS['voice'] / ctx['tag']
    processed = [process(r) for r in res[:-1]]
    gaps = sum(VOICE_POST['breath_s'] if a['scene'] == b['scene'] else VOICE_POST['scene_gap_s'] for a, b in zip(items, items[1:]))
    speech = sum(len(x) for x, _ in processed) / SR
    factor = min(VOICE_POST['max_tempo'], max(1.0, speech / (VOICE_POST['budget_s'] - gaps)))
    seg, t, lines, clips = [], 0.0, [], []
    for i, (it, r) in enumerate(zip(items, res)):
        x, words = tempo(*processed[i], factor)
        clips.append((it['id'], x))
        if i:
            same = items[i - 1]['scene'] == it['scene']
            gap = int((VOICE_POST['breath_s'] if same else VOICE_POST['scene_gap_s']) * SR)
            b = int(VOICE_POST['breath_s'] * SR)
            pad = np.zeros(gap, np.float32)
            pad[-b:] += breath(b, i)
            seg.append(pad)
            t += gap / SR
        seg.append(x)
        lines.append({'id': it['id'], 'scene': it['scene'], 'part': it['part'], 'speaker': it['speaker'],
                      'voice': r['voice'], 'engine': r['engine'], 'text': it['text_diacritized'], 'file': f'lines/{it["id"]}.wav',
                      'start': round(t, 3), 'end': round(t + len(x) / SR, 3),
                      'words': [{'w': w, 'start': round(t + a, 3), 'end': round(t + b, 3)} for w, a, b in words],
                      'attempts': r['attempts'], 'flags': r['flags']})
        t += len(x) / SR
    track = np.concatenate(seg)
    raw = out_dir / 'voice.raw.wav'
    write_wav(raw, track)
    gain = 10 ** ((VOICE_POST['lufs'] - lufs(raw)) / 20)
    gain /= max(1.0, np.abs(track).max() * gain / 10 ** (VOICE_POST['peak_dbfs'] / 20))
    raw.unlink()
    write_wav(out_dir / 'voice.wav', track * gain)
    for line_id, x in clips:
        write_wav(out_dir / 'lines' / f'{line_id}.wav', x * gain)
    ix, iw = tempo(*process(res[-1]), factor)
    write_wav(out_dir / 'ident.wav', ix * gain)
    flagged = [{'line': ln['id'], **f} for ln in lines for f in ln['flags']] + [{'line': 'ident', **f} for f in res[-1]['flags']]
    engines = sorted({ln['engine'] for ln in lines} | {res[-1]['engine']})
    timing = {
        'episode': ctx['tag'], 'title': ep['title'], 'engine': engines[0] if len(engines) == 1 else 'mixed',
        'timings': 'word_boundary' if engines == ['edge'] else 'estimated', 'sample_rate': SR,
        'duration': round(len(track) / SR, 3), 'lufs': VOICE_POST['lufs'], 'tempo': round(factor, 4),
        'voices': {sp: {k: v[k] for k in ('voice', 'rate', 'pitch')} for sp, v in roles.items()},
        'ident': {'text': ident, 'voice': res[-1]['voice'], 'file': 'ident.wav', 'duration': round(len(ix) / SR, 3),
                  'words': [{'w': w, 'start': a, 'end': b} for w, a, b in iw]},
        'lines': lines,
        'integrity': {'lines': len(lines), 'tokens': sum(len(tokens(ln['text'])) for ln in lines),
                      'boundaries': sum(len(ln['words']) for ln in lines),
                      'regenerated': sum(ln['attempts'] > 1 for ln in lines), 'flagged': flagged},
    }
    (out_dir / 'timing.json').write_text(json.dumps(timing, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'    {len(lines)} lines · {timing["duration"]:.1f}s voice · tempo ×{factor:.3f} · {timing["engine"]} · '
          f'{timing["integrity"]["regenerated"]} regenerated · {len(flagged)} flagged')
    return timing


def run(ep, ctx):
    return asyncio.run(_run(ep, ctx))
