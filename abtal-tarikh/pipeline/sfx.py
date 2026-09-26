"""مرحلة المؤثرات: خلفية لكل مكان ومؤثرات الإشارات (numpy)، توزيع ستيريو بحسب موضع الشاشة، خفض جانبي −12dB تحت الصوت،
محدِّد، ثم loudnorm بمرورين. تقرأ مخرجات مرحلة الصوت قراءةً فقط وتكتب out/epNN/audio/{mix.wav, timeline.json}."""
import hashlib
import json
import subprocess
import wave
import numpy as np
from config import AUDIO, MIX, PATHS, STAGE, VIDEO
from pipeline import deps, scripts
from sfx import synth as S
from sfx.cues import CUE

SR = S.SR


def seed(*parts):
    return int(hashlib.sha256('|'.join(map(str, parts)).encode()).hexdigest()[:8], 16) & 0x7FFFFFFF


def r3(t):
    return round(float(t), 3)


def read_wav(path):
    with wave.open(str(path), 'rb') as w:
        if (w.getnchannels(), w.getsampwidth(), w.getframerate()) != (1, 2, SR):
            raise ValueError(f'{path.name}: expected mono 16-bit {SR}Hz')
        return np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32767


def write_wav(path, x):
    x = np.atleast_2d(x)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(len(x))
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x.T, -1, 1) * 32767).astype('<i2').tobytes())


def bed_of(layers):
    for name, keys in MIX['beds']:
        if any(layer.startswith(k) for layer in layers for k in keys):
            return name
    return MIX['bed_default']


def pan_of(x):
    return r3(np.clip((x - 0.5) * 2 * MIX['pan_width'], -1, 1))


def level(y, db, rms):
    ref = np.sqrt(np.mean(y ** 2)) if rms else np.abs(y).max()
    return (y * (10 ** (db / 20) / (ref + 1e-9))).astype(np.float32)


def spatial(y, at, speaker):
    if at == 'wide':
        return (y if y.ndim == 2 else S.pan(y, 0)), 'wide'
    mono = y.mean(0) if y.ndim == 2 else y
    if isinstance(at, tuple):
        return S.pan_sweep(mono, *at), list(at)
    p = pan_of(STAGE.get(speaker if at == 'speaker' else at, STAGE['center'])[0])
    return S.pan(mono, p), p


def program(timing, vdir):
    # خطّ البرنامج: خطّاف ← شارة السلسلة ← بقية الحلقة ← ذيل؛ الأنفاس والفجوات كما هي في voice.wav
    v, ident = read_wav(vdir / 'voice.wav'), read_wav(vdir / timing['ident']['file'])
    hook = [ln for ln in timing['lines'] if ln['part'] == 'hook']
    h = S.n_of(hook[-1]['end']) if hook else 0
    g0, g1 = MIX['ident_gap_s']
    a1 = S.n_of(MIX['preroll_s'])
    ai = a1 + h + (S.n_of(g0) if hook else 0)
    a2 = ai + len(ident) + S.n_of(g1)
    n = a2 + len(v) - h + S.n_of(MIX['tail_s'])
    if n / SR > VIDEO['max_s']:
        raise ValueError(f'program {n / SR:.1f}s > {VIDEO["max_s"]}s')
    prog = np.zeros(n, np.float32)
    S.place(prog, v[:h], a1)
    S.place(prog, ident, ai)
    S.place(prog, v[h:], a2)
    return prog, {'hook': a1 / SR, 'rest': (a2 - h) / SR}, (ai / SR, (ai + len(ident)) / SR)


def segments(lines, ident, total):
    segs = []
    for ln in lines:
        if not segs or segs[-1]['id'] != ln['scene']:
            segs.append({'id': ln['scene'], 'part': ln['part'], 'bed': ln['bed'], 'start': ln['start'] - MIX['cut_lead_s']})
    segs.append({'id': 'ident', 'part': 'ident', 'start': ident[0]})
    segs.sort(key=lambda sg: sg['start'])
    segs[0]['start'] = 0.0
    for i, sg in enumerate(segs):
        sg['end'] = segs[i + 1]['start'] if i + 1 < len(segs) else total
        if sg['id'] == 'ident':
            sg['bed'] = segs[i - 1]['bed'] if i else MIX['bed_default']
    return segs


def beds(bus, segs, tag):
    runs = []
    for sg in segs:
        if runs and runs[-1]['bed'] == sg['bed']:
            runs[-1]['end'] = sg['end']
        else:
            runs.append({'bed': sg['bed'], 'start': sg['start'], 'end': sg['end']})
    fin, xf = MIX['bed_fade_s']
    total = bus.shape[-1] / SR
    for i, rn in enumerate(runs):
        last = i == len(runs) - 1
        a, b = max(0.0, rn['start'] - (xf / 2 if i else 0)), min(total, rn['end'] + (0 if last else xf / 2))
        y = level(S.bed(rn['bed'], b - a, seed(tag, 'bed', i, rn['bed'])), MIX['bed_db'][rn['bed']], True)
        k = S.n_of(xf if i else fin)
        y[:, :k] *= np.sin(np.linspace(0, np.pi / 2, k))
        if not last:
            k = S.n_of(xf)
            y[:, -k:] *= np.cos(np.linspace(0, np.pi / 2, k))
        S.place(bus, y, S.n_of(a))
    return runs


def risers(bus, segs, tag):
    events, d = [], MIX['riser']['dur_s']
    for prev, sg in zip(segs, segs[1:]):
        if prev['id'] == 'ident':
            continue
        y = level(S.riser(d, seed(tag, 'riser', sg['id'])), MIX['riser']['db'], False)
        S.place(bus, y, round((sg['start'] - d) * SR))
        events.append({'cue': 'transition_riser', 'kind': 'shot', 'line': None, 'segment': sg['id'],
                       'start': r3(sg['start'] - d), 'end': r3(sg['start']), 'hit': r3(sg['start']), 'pan': 'wide'})
    return events


def cues(bus, lines, tag):
    events, spans = [], []
    pa, pb = MIX['span_pad_s']
    for ln in lines:
        shots = 0
        for name in ln['sfx']:
            c = CUE[name]
            if c['kind'] == 'shot':
                hit = ln['start'] - MIX['cue_lead_s'] + shots * MIX['cue_stagger_s']
                shots += 1
                y, p = spatial(level(c['gen'](None, seed(tag, ln['id'], name), ln['bed']), c['db'], c['rms']), c['at'], ln['speaker'])
                S.place(bus, y, round((hit - c['lead']) * SR))
                events.append({'cue': name, 'kind': 'shot', 'line': ln['id'], 'start': r3(hit - c['lead']),
                               'end': r3(hit - c['lead'] + y.shape[-1] / SR), 'hit': r3(hit), 'pan': p})
                continue
            a, b = ln['start'] - pa, ln['end'] + pb
            last = next((sp for sp in reversed(spans) if sp['cue'] == name), None)
            if last and last['scene'] == ln['scene'] and a - last['end'] < MIX['span_merge_s']:
                last['end'] = b
                last['lines'].append(ln['id'])
            else:
                spans.append({'cue': name, 'scene': ln['scene'], 'start': a, 'end': b, 'lines': [ln['id']],
                              'speaker': ln['speaker'], 'bed': ln['bed']})
    fi, fo = MIX['span_fade_s']
    for sp in spans:
        c, d = CUE[sp['cue']], sp['end'] - sp['start']
        y = np.atleast_1d(c['gen'](d, seed(tag, sp['lines'][0], sp['cue']), sp['bed']))
        m = S.n_of(d)
        y = np.pad(y, [(0, 0)] * (y.ndim - 1) + [(0, max(0, m - y.shape[-1]))])[..., :m]
        y, p = spatial(level(S.fade(y, fi, fo), c['db'], c['rms']), c['at'], sp['speaker'])
        S.place(bus, y, round(sp['start'] * SR))
        events.append({'cue': sp['cue'], 'kind': 'span', 'line': sp['lines'][0], 'lines': sp['lines'],
                       'start': r3(sp['start']), 'end': r3(sp['end']), 'pan': p})
    return events


def duck(voice):
    # سلسلة جانبية: بوابة على طاقة الصوت كل 5ms، إمساك ونظرة أمامية، ثم منحدر هجوم/تحرير خطّي حتى −12dB بالضبط
    D = MIX['duck']
    hop = S.n_of(D['frame_s'])
    n = len(voice)
    m = -(-n // hop)
    v = np.zeros(m * hop, np.float32)
    v[:n] = voice
    act = 10 * np.log10(np.mean(v.reshape(m, hop) ** 2, 1) + 1e-12) > D['gate_db']
    act = np.convolve(act, np.ones(int(round(D['hold_s'] / D['frame_s'])) + 1))[:m] > 0
    ahead = int(round(D['lookahead_s'] / D['frame_s']))
    act = np.concatenate([act[ahead:], np.zeros(ahead, bool)])
    up, down = D['frame_s'] / D['attack_s'], D['frame_s'] / D['release_s']
    env, e = np.empty(m), 0.0
    for i, a in enumerate(act):
        e = min(e + up, 1.0) if a else max(e - down, 0.0)
        env[i] = e
    g_db = D['depth_db'] * env
    gain = 10 ** (np.interp(np.arange(n), np.arange(m) * hop + hop / 2, g_db) / 20)
    stats = {'depth_db': r3(g_db.min()), 'ducked_s': r3((env >= 1).sum() * D['frame_s']),
             'voice_s': r3(act.sum() * D['frame_s'])}
    return gain.astype(np.float32), stats


def limit(x, ceiling_db):
    # محدِّد استباقي على كتل 1ms: الكسب في كل كتلة ≤ المطلوب لذروتها، وتحرير خطّي بالديسيبل
    L = MIX['limiter']
    blk = SR // 1000
    n = x.shape[-1]
    m = -(-n // blk)
    pk = np.zeros(m * blk, np.float32)
    pk[:n] = np.abs(x).max(0)
    req = np.minimum(0.0, ceiling_db - 20 * np.log10(pk.reshape(m, blk).max(1) + 1e-12))
    A = L['lookahead_ms']
    h = req.copy()
    for i in range(1, A + 1):
        h[:-i] = np.minimum(h[:-i], req[i:])
    k = np.arange(m)
    rel = L['release_db_s'] / 1000
    r = rel * k + np.minimum.accumulate(h - rel * k)
    g = np.convolve(np.concatenate([np.full(A, r[0]), r]), np.full(A + 1, 1 / (A + 1)), 'valid')
    edge = np.minimum(np.concatenate([g[:1], g[:-1]]), g)
    gs = np.interp(np.arange(n), np.append(k * blk, m * blk), np.append(edge, g[-1]))
    return (x * 10 ** (gs / 20)).astype(np.float32), r3(-g.min())


def loudnorm(src, af, dst=None):
    cmd, data = [deps.ffmpeg_bin(), '-hide_banner', '-nostats'], None
    if isinstance(src, np.ndarray):
        cmd += ['-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', 'pipe:0']
        data = np.ascontiguousarray(src.T, '<f4').tobytes()
    else:
        cmd += ['-i', str(src)]
    cmd += ['-af', af] + (['-ar', str(AUDIO['rate']), '-c:a', 'pcm_s24le', '-y', str(dst)] if dst else ['-f', 'null', '-'])
    err = subprocess.run(cmd, input=data, capture_output=True, check=True).stderr.decode()
    a = err.rindex('{')
    return {k: (v if k == 'normalization_type' else float(v)) for k, v in json.loads(err[a:err.index('}', a) + 1]).items()}


def master(x, dst):
    # مرور 1 قياس؛ المحدِّد يضمن إمكان التطبيع الخطّي؛ مرور 2 loudnorm خطّي بالقيم المقيسة؛ ثم قياس الملف الناتج
    L, probe = MIX['limiter'], 'loudnorm=print_format=json'
    m0 = loudnorm(x, probe)
    margin = L['margin_db']
    for attempt in range(1, L['attempts'] + 1):
        y, reduction = limit(x, AUDIO['true_peak'] - margin - (AUDIO['lufs'] - m0['input_i']))
        m = loudnorm(y, probe)
        excess = m['input_tp'] + AUDIO['lufs'] - m['input_i'] - AUDIO['true_peak']
        if excess <= 0:
            break
        margin += excess + 0.1
    lra = min(50.0, max(AUDIO['lra'], float(np.ceil(m['input_lra'] + 1))))
    r = loudnorm(y, f'loudnorm=I={AUDIO["lufs"]}:TP={AUDIO["true_peak"]}:LRA={lra}:measured_I={m["input_i"]}:'
                    f'measured_TP={m["input_tp"]}:measured_LRA={m["input_lra"]}:measured_thresh={m["input_thresh"]}:'
                    f'offset={m["target_offset"]}:linear=true:print_format=json', dst)
    f = loudnorm(dst, probe)
    out = {'i': f['input_i'], 'tp': f['input_tp'], 'lra': f['input_lra'], 'mode': r['normalization_type'],
           'premix_i': m0['input_i'], 'limiter_db': reduction, 'attempts': attempt}
    if out['mode'] != 'linear' or abs(out['i'] - AUDIO['lufs']) > 0.5 or out['tp'] > AUDIO['true_peak']:
        raise ValueError(f'loudness {out}')
    return out


def library(dest=PATHS['sfx_library']):
    stats = {}
    for name, fn in S.SOUNDS.items():
        y = fn()
        write_wav(dest / f'{name}.wav', y)
        stats[name] = {'s': r3(y.shape[-1] / SR), 'finite': bool(np.isfinite(y).all()),
                       'peak_db': r3(20 * np.log10(np.abs(y).max() + 1e-12)), 'rms_db': r3(20 * np.log10(np.sqrt(np.mean(y ** 2)) + 1e-12))}
    return stats


def run(ep, ctx):
    tag = ctx['tag']
    vdir = ctx.get('voice_dir') or PATHS['voice'] / tag
    timing = json.loads((vdir / 'timing.json').read_text(encoding='utf-8'))
    items = list(scripts.lines(ep))
    if [(ln['id'], ln['text']) for ln in timing['lines']] != [(it['id'], it['text_diacritized']) for it in items]:
        raise ValueError(f'{vdir.name}: voice out of date — rebuild the voice stage')
    unknown = {c for it in items for c in it['sfx']} - set(CUE)
    if unknown:
        raise ValueError(f'unmapped sfx cues: {sorted(unknown)}')
    prog, off, ident = program(timing, vdir)
    n, total = len(prog), len(prog) / SR
    bed = {s['id']: bed_of(s['layers']) for s in ep['scenes']}
    sfx = {it['id']: it['sfx'] for it in items}
    lines = []
    for ln in timing['lines']:
        o = off['hook'] if ln['part'] == 'hook' else off['rest']
        lines.append({'id': ln['id'], 'scene': ln['scene'], 'part': ln['part'], 'speaker': ln['speaker'], 'bed': bed[ln['scene']],
                      'start': r3(ln['start'] + o), 'end': r3(ln['end'] + o), 'sfx': sfx[ln['id']],
                      'words': [{'w': w['w'], 'start': r3(w['start'] + o), 'end': r3(w['end'] + o)} for w in ln['words']]})
    segs = segments(lines, ident, total)
    bus = np.zeros((2, n), np.float32)
    runs = beds(bus, segs, tag)
    events = sorted(risers(bus, segs, tag) + cues(bus, lines, tag), key=lambda e: e['start'])
    k = S.n_of(MIX['tail_fade_s'])
    bus[:, -k:] *= np.cos(np.linspace(0, np.pi / 2, k))
    gain, ducked = duck(prog)
    adir = ctx['out'] / 'audio'
    adir.mkdir(parents=True, exist_ok=True)
    loud = master(np.stack([prog, prog]) + bus * gain, adir / 'mix.wav')
    tl = {
        'episode': tag, 'title': ep['title'], 'file': 'mix.wav', 'duration': r3(total), 'sample_rate': AUDIO['rate'],
        'loudness': loud, 'duck': ducked,
        'ident': {'start': r3(ident[0]), 'end': r3(ident[1]), 'text': timing['ident']['text'],
                  'words': [{'w': w['w'], 'start': r3(w['start'] + ident[0]), 'end': r3(w['end'] + ident[0])} for w in timing['ident']['words']]},
        'segments': [{**sg, 'start': r3(sg['start']), 'end': r3(sg['end'])} for sg in segs],
        'lines': lines,
        'cues': events,
    }
    (adir / 'timeline.json').write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'    {total:.1f}s · beds {"→".join(rn["bed"] for rn in runs)} · {len(events)} cues · duck {ducked["depth_db"]:+.1f}dB · '
          f'{loud["i"]:.1f} LUFS · TP {loud["tp"]:.1f} · {loud["mode"]}')
    return tl
