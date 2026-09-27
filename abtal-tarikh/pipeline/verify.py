"""المرحلة 7: تحقّق شامل لكل حلقة من مخرجاتها النهائية، ثم ملخّص السلسلة وورقة لقطات.
الاختبارات: المدة، الجهارة، انحراف تزامن الكلمات، كل كلمة مشكولة منطوقة ومعروضة، حضور التوقيع من البداية إلى النهاية،
تباين الترجمة، مناطق الأمان، خلوّ الصوت من النغمات الشبيهة بالآلات، وسلامة خصائص المراحل 1–6."""
import json
import math
import re
import shutil
import subprocess
import numpy as np
from config import AUDIO, COMPOSE, FONTS, MIX, PATHS, SERIES, VIDEO, VERIFY, VISUALS
from pipeline import composer, deps, design, schema, scripts, sfx, visuals
from pipeline.voice import tokens
from sfx.cues import CUE

SR, FPS = AUDIO['rate'], VIDEO['fps']
PUNCT = re.compile(r'[^ء-ْٰٱ]')


def skel(word):
    return schema.norm(PUNCT.sub('', word))


def decode_mono(path):
    raw = subprocess.run([deps.ffmpeg_bin(), '-hide_banner', '-loglevel', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def env_db(x, hop=240):
    n = len(x) // hop
    return 10 * np.log10(np.mean(x[:n * hop].reshape(n, hop) ** 2, 1) + 1e-12), hop / SR


def sec(v):
    return sum(float(x) * m for x, m in zip(v.split(':'), (3600, 60, 1)))


def karaoke_events(ass):
    # أحداث التذهيب بالترتيب: (بداية، نهاية، الكلمة الذهبية، نص البطاقة)
    gold = composer.ass_color('gold')
    out = []
    for m in re.finditer(r'^Dialogue: \d+,([\d:.]+),([\d:.]+),Karaoke,,0,0,0,karaoke,(.*)$', ass, re.M):
        w = re.search(r'\{\\c' + re.escape(gold) + r'\}(.*?)\{', m[3])
        out.append({'start': sec(m[1]), 'end': sec(m[2]), 'w': w[1], 'text': re.sub(r'\{[^}]*\}', '', m[3]).replace('\\N', ' ')})
    return out


def check_duration(pr, fixture):
    lo, hi = VERIFY['duration_s']
    d = pr['duration']
    return {'ok': fixture or lo <= d <= hi + .05, 'seconds': round(d, 3), 'range': [lo, hi]}


def check_loudness(final):
    m = composer.final_loudness(final)
    return {'ok': abs(m['i'] - AUDIO['lufs']) <= VERIFY['lufs_tol'] and m['tp'] <= AUDIO['true_peak'], **m, 'target': AUDIO['lufs']}


def check_sync(words, events, prog, audio):
    ons = composer.acoustic_onsets(words, prog)
    # 1) إزاحة الصوت في الملف النهائي عن خطّ الكلام (ترابط متقاطع في نوافذ موزّعة)
    offs = []
    span, pad = int(1.5 * SR), 9600
    starts = np.array([w['start'] for w in words])
    for c in starts[np.linspace(0, len(starts) - 1, min(8, len(starts))).astype(int)]:
        i = int(c * SR)
        if i - span - pad < 0 or i + span + pad > min(len(prog), len(audio)):
            continue
        a, p = audio[i - span:i + span], prog[i - span - pad:i + span + pad]
        n = 1 << int(math.ceil(math.log2(len(a) + len(p))))
        xc = np.fft.irfft(np.fft.rfft(p, n) * np.conj(np.fft.rfft(a, n)), n)
        lags = np.arange(0, 2 * pad + 1)
        offs.append((pad - lags[np.argmax(xc[lags])]) / SR)
    mux = max((abs(o) for o in offs), default=0.0)
    # 2) المرجع الصوتي لكل كلمة: بدايتها المسموعة بعد وقفة، وإلا حدّها من المُركِّب
    ref = [t if t is not None else w['start'] for w, t in zip(words, ons)]
    late = [t - w['start'] for w, t in zip(words, ons) if t is not None]
    # 3) ظهور الذهب على الشاشة: أول إطار عند بداية الحدث أو بعدها، مقابل المرجع، مع إزاحة الصوت في الملف
    drift = [abs(math.ceil(ev['start'] * FPS - 1e-6) / FPS - r) + mux for r, ev in zip(ref, events)]
    worst = max(drift) if drift else 0.0
    return {'ok': bool(len(words) == len(events) and worst < VERIFY['sync_max_s']), 'max_ms': round(worst * 1000, 1), 'mean_ms': round(float(np.mean(drift)) * 1000, 1),
            'mux_offset_ms': round(mux * 1000, 1), 'onsets_measured': len(late), 'boundary_lead_p50_ms': round(float(np.median(late)) * 1000, 1) if late else 0.0,
            'boundary_lead_max_ms': round(max(late, default=0) * 1000, 1), 'words': len(words), 'highlights': len(events)}


def check_words(ep, timing, words, events, prog, title_card):
    # كل كلمة في النص: مشكولة، منطوقة (حدّ كلمة وطاقة مسموعة)، ومعروضة (ذهبها يغطّي إطاراً واحداً على الأقل)
    e, fr = env_db(prog)
    issues, total = [], 0
    items = list(scripts.lines(ep))
    for it, ln in zip(items, timing['lines']):
        toks = tokens(it['text_diacritized'])
        total += len(toks)
        if [skel(t) for t in toks] != [skel(w['w']) for w in ln['words']]:
            issues.append(f'{it["id"]}: spoken words differ from script')
        bare = schema.bare_words(it['text_diacritized'])
        if bare:
            issues.append(f'{it["id"]}: undiacritized {bare[:2]}')
    for w, ev in zip(words, events):
        # حدود TTS تسبق الصوت أحياناً (الوصل: «فِي الْحَرِّ»)، فتمتدّ نافذة الكلمة بتسامح التزامن
        a, b = int(w['start'] / fr), max(int(w['start'] / fr) + 1, int((w['end'] + VERIFY['sync_max_s']) / fr))
        if e[a:b].max() < VERIFY['speech_dbfs']:
            issues.append(f'silent word {w["w"]} @{w["start"]:.2f}')
        if skel(ev['w']) != skel(w['w']):
            issues.append(f'highlight mismatch {ev["w"]} ≠ {w["w"]}')
        if math.ceil(ev['start'] * FPS - 1e-6) >= math.ceil(ev['end'] * FPS - 1e-6):
            issues.append(f'highlight shorter than a frame: {w["w"]} @{w["start"]:.2f}')
        if schema.bare_words(ev['text']):
            issues.append(f'undiacritized subtitle near {w["w"]}')
    shown_card = {skel(x) for x in (title_card['series'] + ' ' + title_card['title']).split()}
    ident = [skel(w['w']) for w in timing['ident']['words']]
    missing = [w for w in ident if w not in shown_card]
    if missing:
        issues.append(f'ident words not on title card: {missing}')
    if len(events) != total:
        issues.append(f'{len(events)} highlights for {total} words')
    return {'ok': not issues, 'script_words': total, 'spoken': len(words), 'shown': len(events), 'ident_words_on_card': len(ident) - len(missing), 'issues': issues[:8]}


def signature_only(ass):
    head, _, body = ass.partition('[Events]')
    lines = [x for x in body.splitlines() if x.startswith('Format') or ',Signature,' in x]
    return head + '[Events]\n' + '\n'.join(lines) + '\n'


def check_signature(cdir, meta, ass):
    # تغطية زمنية بلا فجوات من 0 حتى الخاتمة، ثم حبر مرئي في كل ثانية، والخاتمة تحمل التوقيع نفسه
    spans = sorted((sec(a), sec(b)) for a, b in re.findall(r'^Dialogue: \d+,([\d:.]+),([\d:.]+),Signature,', ass, re.M))
    t_outro, D = meta['outro']
    cov, gaps = 0.0, []
    for a, b in spans:
        if a > cov + 1 / FPS:
            gaps.append([round(cov, 2), round(a, 2)])
        cov = max(cov, b)
    if cov < t_outro - 1 / FPS:
        gaps.append([round(cov, 2), round(t_outro, 2)])
    p = cdir / 'signature_only.ass'
    p.write_text(signature_only(ass), encoding='utf-8')
    times = np.arange(0, t_outro - .05, VERIFY['signature_step_s'])
    frames = sorted({int(t * FPS) for t in times})
    expr = '+'.join(f'eq(n\\,{f})' for f in frames)
    W, H = VIDEO['width'], VIDEO['height']
    raw = subprocess.run([deps.ffmpeg_bin(), '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', f'color=c=black:s={W}x{H}:r={FPS}:d={t_outro}',
                          '-vf', f"select='{expr}',ass=filename='{p}':fontsdir='{cdir / 'fonts'}',format=gray", '-fps_mode', 'passthrough', '-f', 'rawvideo', '-'],
                         capture_output=True, check=True).stdout
    ink = [(fr > 40).sum() for fr in np.frombuffer(raw, np.uint8).reshape(-1, H, W)]
    dark = [round(frames[i] / FPS, 1) for i, v in enumerate(ink) if v < 300]
    outro_ok = abs(D - t_outro - COMPOSE['outro_s']) < .01
    return {'ok': not gaps and not dark and outro_ok and spans[0][0] == 0.0, 'from_s': spans[0][0] if spans else None, 'until_s': round(D, 3),
            'gaps': gaps, 'frames_checked': len(frames), 'frames_missing': dark[:5], 'outro_card_credit': COMPOSE['signature']['text']}


def blend(fg, bg, a):
    return tuple(a * f + (1 - a) * b for f, b in zip(fg, bg))


def lum(rgb):
    ch = [v / 255 for v in rgb]
    ch = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in ch]
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]


def check_contrast():
    # أسوأ حالة: اللوح الحبري فوق ألمع لون في اللوحة، والمزج في فضاء غاما كما يفعل المركّب
    a = 1 - COMPOSE['subs']['box_alpha'] / 255
    ratio = lambda f, b: (max(lum(f), lum(b)) + .05) / (min(lum(f), lum(b)) + .05)
    brightest = max(design.RGB.values(), key=lum)
    rows = {}
    for under in (brightest, design.RGB['ink']):
        plate = blend(design.RGB['ink'], under, a)
        for txt in ('parchment', 'gold'):
            rows[f'{txt}/{"brightest" if under is brightest else "ink"}'] = round(ratio(design.RGB[txt], plate), 2)
    return {'ok': min(rows.values()) >= VERIFY['contrast_min'], 'min': min(rows.values()), 'ratios': rows, 'plate_opacity': round(a, 3)}


def check_safe(pl, ep, meta, vdir):
    # الشخصيات ونصوص المشاهد عند منتصف كل لقطة، والبطاقات، وحبر الترجمة والتوقيع
    times = [(s['start'] + s['end']) / 2 for s in pl['shots']]
    st = visuals.stills(pl, vdir / 'shots', times)
    bad = [(r['frame'], r['audit']) for r in st if r['audit']['bad'] or r['audit']['named'] or r['audit']['unsafe']]
    t_len = meta['title_card'][1] - meta['title_card'][0]
    cards = []
    for kind, dur in (('title', t_len), ('outro', COMPOSE['outro_s'])):
        r = visuals.stills(composer.card_plan(pl, ep, kind, dur), vdir / kind, [10 + dur * .5, 10 + dur - .05], extra=('cards.js',))
        cards += [(kind, x['audit']) for x in r if x['audit']['bad'] or x['audit']['unsafe']]
    shutil.rmtree(vdir, ignore_errors=True)
    x1, y1 = design.SAFE_BOX[2], design.SAFE_BOX[3]
    ink = meta['ink']['box']
    ok = not bad and not cards and ink[2] < x1 and ink[3] < y1 and not meta['cover_audit']['unsafe'] and not meta['cover_audit']['bad']
    return {'ok': ok, 'shots_checked': len(st), 'shot_issues': bad[:3], 'card_issues': cards[:3], 'text_ink_box': ink, 'safe_box': [x1, y1]}


def tonal_runs(x):
    # قمم طيفية بارزة تبقى على التردد نفسه طويلاً = نغمة آلة؛ الضجيج والتغريد المنزلق لا يثبت
    T = VERIFY['tonal']
    nfft, hop = T['nfft'], T['hop']
    n = (len(x) - nfft) // hop
    if n <= 0:
        return 0.0, None
    win = np.hanning(nfft).astype(np.float32)
    idx = np.arange(nfft)[None, :] + hop * np.arange(n)[:, None]
    best, where = 0.0, None
    run = np.zeros(nfft // 2 + 1, np.int32)
    for k in range(0, n, 512):
        blk = x[idx[k:k + 512]] * win
        mag = 20 * np.log10(np.abs(np.fft.rfft(blk, axis=1)) / (nfft / 4) + 1e-9)
        med = np.stack([np.median(mag[:, max(0, j - 24):j + 25], axis=1) for j in range(0, mag.shape[1], 8)], 1)
        med = np.repeat(med, 8, axis=1)[:, :mag.shape[1]]
        lo = int(T['min_hz'] * nfft / SR)
        peak = (mag - med > T['prominence_db']) & (mag > T['floor_dbfs'])
        peak[:, :lo] = False
        for f in range(peak.shape[0]):
            near = np.maximum.reduce([np.roll(run, s) for s in (-1, 0, 1)])
            run = np.where(peak[f], near + 1, 0)
            m = run.max()
            if m * hop / SR > best:
                best, where = m * hop / SR, (round((k + f) * hop / SR, 2), round(int(run.argmax()) * SR / nfft))
    return best, where


def check_tonal(ep, ctx, audio, words):
    b = sfx.build(ep, ctx)
    bus = b['bus'].mean(0)
    run_bus, at_bus = tonal_runs(bus)
    # النوافذ الخالية من الكلام في الصوت النهائي (مؤثرات الحلقة والتركيب معاً)
    mask = np.ones(len(audio), bool)
    for w in words:
        mask[max(0, int((w['start'] - .15) * SR)):int((w['end'] + .15) * SR)] = False
    gaps = np.split(audio, np.nonzero(np.diff(mask.astype(np.int8)))[0] + 1)
    starts = np.concatenate([[0], np.cumsum([len(q) for q in gaps])[:-1]])
    free = np.concatenate([g for g, s in zip(gaps, starts) if mask[s] and len(g) > VERIFY['tonal']['nfft'] * 2] or [np.zeros(1, np.float32)])
    run_free, at_free = tonal_runs(free)
    lim = VERIFY['tonal']['max_s']
    return {'ok': bool(run_bus < lim and run_free < lim), 'longest_s': round(max(run_bus, run_free), 3), 'longest_tone_bus_s': round(run_bus, 3), 'at_bus': at_bus, 'longest_tone_voice_free_s': round(run_free, 3),
            'voice_free_s': round(len(free) / SR, 1), 'limit_s': lim}


def check_phases(ep, ctx, tl, timing, vmeta, pl, meta, fixture):
    tag = ctx['tag']
    ok, notes = True, {}
    errs = [] if fixture else schema.load(PATHS['episodes'] / f'{tag}.json')[1]
    notes['p1_design'] = min(design.contrast(a, b) for a, b in (('gold', 'lapis'), ('gold', 'ink'), ('parchment', 'ink'), ('parchment', 'lapis_deep'))) >= 4.5 and all(
        (PATHS['fonts'] / f['file']).is_file() for f in FONTS.values())
    notes['p2_script'] = not errs
    i = timing['integrity']
    notes['p3_voice'] = timing['timings'] == 'word_boundary' and i['tokens'] == i['boundaries'] and not i['flagged']
    L = tl['loudness']
    notes['p4_mix'] = L['mode'] == 'linear' and abs(L['i'] - AUDIO['lufs']) <= .5 and L['tp'] <= AUDIO['true_peak'] and tl['duck']['depth_db'] == MIX['duck']['depth_db'] and all(c['cue'] in CUE or c['cue'] == 'transition_riser' for c in tl['cues'])
    notes['p5_visuals'] = vmeta['digest'] == visuals.digest(pl) and vmeta['frames'] == math.ceil(tl['duration'] * FPS - 1e-6) and vmeta['era'] == VISUALS['eras'].get(tag, vmeta['era'])
    v = meta['probe']
    notes['p6_export'] = ('(High)' in v['video'] and 'yuv420p' in v['video'] and 'bt709' in v['video'] and 'aac' in v['audio'] and v['faststart']
                          and meta['subs']['max_lines'] <= COMPOSE['subs']['lines'] and len(meta['signature_corners']) == 3 and (ctx.get('final_dir', ctx['out'].parent) / meta['cover']).is_file())
    ok = all(notes.values())
    return {'ok': ok, **notes}


def run(ep, ctx, fixture=False):
    tag, out = ctx['tag'], ctx['out']
    vdir = ctx.get('voice_dir') or PATHS['voice'] / tag
    cdir = out / 'compose'
    final = ctx.get('final_dir', out.parent) / f'{tag}.mp4'
    meta = json.loads((cdir / 'compose.json').read_text(encoding='utf-8'))
    tl = json.loads((out / 'audio' / 'timeline.json').read_text(encoding='utf-8'))
    timing = json.loads((vdir / 'timing.json').read_text(encoding='utf-8'))
    vmeta = json.loads((out / 'video' / 'visuals.json').read_text(encoding='utf-8'))
    pl = json.loads((out / 'video' / 'plan.json').read_text(encoding='utf-8'))
    ass = (cdir / 'subs.ass').read_text(encoding='utf-8')
    words = [w for ws in composer.spoken_words(timing, tl) for w in ws]
    events = karaoke_events(ass)
    prog = sfx.program(timing, vdir)[0]
    audio = decode_mono(final)
    pr = composer.probe(final)
    title_card = composer.card_plan(pl, ep, 'title', 1)['card']
    R = {
        'duration': check_duration(pr, fixture),
        'loudness': check_loudness(final),
        'sync': check_sync(words, events, prog, audio),
        'words': check_words(ep, timing, words, events, prog, title_card),
        'signature': check_signature(cdir, meta, ass),
        'contrast': check_contrast(),
        'safe': check_safe(pl, ep, meta, out / 'verify'),
        'tonal': check_tonal(ep, ctx, audio, words),
        'phases': check_phases(ep, ctx, tl, timing, vmeta, pl, meta, fixture),
    }
    R['rig'] = visuals.rig_hash(pl, out / 'verify' / 'rig')
    passed = all(v['ok'] for k, v in R.items() if isinstance(v, dict))
    report = {'episode': tag, 'passed': passed, 'file': final.name, **R}
    (out / 'verify.json').write_text(json.dumps(report, ensure_ascii=False, indent=1, default=float), encoding='utf-8')
    fails = [k for k, v in R.items() if isinstance(v, dict) and not v['ok']]
    print(f'    {"PASS" if passed else "FAIL " + ",".join(fails)} · {R["duration"]["seconds"]:.1f}s · {R["loudness"]["i"]:.1f} LUFS · sync ≤{R["sync"]["max_ms"]:.0f}ms · '
          f'{R["words"]["shown"]}/{R["words"]["script_words"]} words · signature 0→{R["signature"]["until_s"]:.0f}s · contrast {R["contrast"]["min"]:.1f} · '
          f'tone ≤{R["tonal"]["longest_s"]:.2f}s')
    if not passed:
        raise ValueError(f'{tag}: verification failed: {fails}')
    return report


def summary(tags):
    # تقرير السلسلة وورقة لقطات بإطار من كل حلقة (من اليمين إلى اليسار)
    reps = [json.loads((PATHS['out'] / t / 'verify.json').read_text(encoding='utf-8')) for t in tags]
    rigs = {r['rig'] for r in reps}
    out = {'series': SERIES['title'], 'episodes': len(reps), 'passed': all(r['passed'] for r in reps) and len(rigs) == 1, 'rig_identical': len(rigs) == 1,
           'rows': [{'episode': r['episode'], 'seconds': r['duration']['seconds'], 'lufs': r['loudness']['i'], 'tp': r['loudness']['tp'], 'sync_max_ms': r['sync']['max_ms'],
                     'words': r['words']['shown'], 'contrast': r['contrast']['min'], 'tone_s': r['tonal']['longest_s'],
                     'passed': r['passed']} for r in reps]}
    (PATHS['out'] / 'verification.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    sheet = contact_sheet(tags)
    print(f'series: {"PASS" if out["passed"] else "FAIL"} · {len(reps)} episodes · rig identical: {out["rig_identical"]} · {sheet.relative_to(PATHS["out"].parent)}')
    return out


def contact_sheet(tags):
    W, H, tw, th = VIDEO['width'], VIDEO['height'], 432, 768
    ins, labels = [], []
    for k, t in enumerate(tags):
        pl = json.loads((PATHS['out'] / t / 'video' / 'plan.json').read_text(encoding='utf-8'))
        pop = max((s for s in pl['shots'] if s['type'] in ('popup', 'silhouette')), key=lambda s: s['end'] - s['start'])
        ins += ['-ss', f'{(pop["start"] + pop["end"]) / 2:.2f}', '-i', str(PATHS['out'] / f'{t}.mp4')]
    cols, rows = 5, math.ceil(len(tags) / 5)
    pos = [((cols - 1 - k % cols) * tw, (k // cols) * th) for k in range(len(tags))]
    graph = ''.join(f'[{k}:v]scale={tw}:{th}[s{k}];' for k in range(len(tags))) + ''.join(f'[s{k}]' for k in range(len(tags))) + \
        f"xstack=inputs={len(tags)}:layout={'|'.join(f'{x}_{y}' for x, y in pos)}:fill=black[g]"
    ass = PATHS['out'] / 'contact_sheet.ass'
    ev = '\n'.join(f'Dialogue: 0,0:00:00.00,0:00:01.00,Label,,0,0,0,,{{\\an2\\pos({x + tw // 2},{y + th - 18})}}الحلقة {str(int(t[2:])).translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))}'
                   for (x, y), t in zip(pos, tags))
    k = composer.ass_scale()
    ass.write_text(f'[Script Info]\nScriptType: v4.00+\nPlayResX: {cols * tw}\nPlayResY: {rows * th}\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, '
                   f'ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n'
                   f'Style: Label,Readex Pro,{round(30 * k)},{composer.ass_color("gold")},{composer.ass_color("gold")},{composer.ass_color("ink", 0x30)},{composer.ass_color("ink", 0xFF)},-1,0,0,0,100,100,0,0,3,10,0,2,0,0,0,-1\n\n'
                   f'[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n{ev}\n', encoding='utf-8')
    dst = PATHS['out'] / 'contact_sheet.png'
    subprocess.run([deps.ffmpeg_bin(), '-hide_banner', '-loglevel', 'error', '-y', *ins, '-filter_complex',
                    graph + f";[g]ass=filename='{ass}':fontsdir='{PATHS['out'] / tags[0] / 'compose' / 'fonts'}'[o]", '-map', '[o]', '-frames:v', '1', str(dst)], check=True)
    ass.unlink()
    return dst
