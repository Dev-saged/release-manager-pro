"""مرحلة التركيب: ترجمة ASS كاريوكي من توقيت الكلمات (الكلمة الناطقة بالذهب)، توقيع متحرّك، بطاقة عنوان وبطاقة خاتمة،
صوت نهائي مُعاد إتقانه، وتصدير out/epNN.mp4 (H.264 High، yuv420p، AAC 192k، faststart) مع صورة غلاف."""
import hashlib
import json
import re
import shutil
import struct
import subprocess
import numpy as np
from config import AUDIO, COMPOSE, FONTS, PATHS, VIDEO, VISUALS
from pipeline import deps, design, visuals
from pipeline.sfx import level, loudnorm, master
from pipeline.voice import ARABIC
from sfx import synth as S

SR = AUDIO['rate']
ROOT = PATHS['pipeline'].parent / 'visuals'


def ass_color(name, alpha=0):
    h = design.HEX[name]
    return f'&H{alpha:02X}{h[5:7]}{h[3:5]}{h[1:3]}&'.upper()


def ass_scale(family='subtitle'):
    # libass يحجّم الخط بمجموع winAscent+winDescent (سلوك GDI)؛ الأحجام في الإعدادات بوحدة em فتُضرب بهذه النسبة
    f = (PATHS['fonts'] / FONTS[family]['file']).read_bytes()
    tabs = {f[12 + 16 * i:16 + 16 * i]: struct.unpack('>I', f[20 + 16 * i:24 + 16 * i])[0] for i in range(struct.unpack('>H', f[4:6])[0])}
    upm = struct.unpack('>H', f[tabs[b'head'] + 18:tabs[b'head'] + 20])[0]
    wa, wd = struct.unpack('>HH', f[tabs[b'OS/2'] + 74:tabs[b'OS/2'] + 78])
    return (wa + wd) / upm


def ts(t):
    t = max(0.0, t)
    cs = int(round(t * 100))
    return f'{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}'


def measure(items, size, weight, cdir, family='subtitle'):
    # عرض كل نص بخطّ الترجمة كما يشكّله HarfBuzz
    job = {'playwright': str(deps.node_playwright()), 'chromium_args': list(VISUALS['chromium_args']),
           'font_url': (PATHS['fonts'] / FONTS[family]['file']).as_uri(), 'items': items, 'css': f'{weight} {size}px %f'}
    p = cdir / 'measure.json'
    p.write_text(json.dumps(job, ensure_ascii=False), encoding='utf-8')
    r = subprocess.run(['node', str(ROOT / 'measure.js'), str(p)], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)['widths']


def display_tokens(text):
    # علامات الترقيم المنفصلة تلتصق بالكلمة المجاورة فيبقى لكل كلمة منطوقة توقيتها
    out, lead = [], ''
    for tok in text.split():
        if ARABIC.search(tok):
            out.append(lead + tok)
            lead = ''
        elif out:
            out[-1] += ' ' + tok
        else:
            lead += tok + ' '
    return out


def spoken_words(timing, tl):
    # كلمات كل سطر من توقيت المرحلة 3 مزاحةً إلى زمن البرنامج
    prog = {ln['id']: ln for ln in tl['lines']}
    out = []
    for ln in timing['lines']:
        toks = display_tokens(ln['text'])
        if len(toks) != len(ln['words']):
            raise ValueError(f'{ln["id"]}: {len(toks)} tokens vs {len(ln["words"])} boundaries')
        d = prog[ln['id']]['start'] - ln['start']
        out.append([{'w': tk, 'start': w['start'] + d, 'end': w['end'] + d} for tk, w in zip(toks, ln['words'])])
    return out


def layout(ws, space, maxw, lines):
    # أقل عدد أسطر ثم موازنة السطرين
    width = lambda seq: sum(w['width'] for w in seq) + space * max(0, len(seq) - 1)
    if width(ws) <= maxw:
        return [ws]
    if lines < 2:
        return None
    best = None
    for k in range(1, len(ws)):
        a, b = width(ws[:k]), width(ws[k:])
        if a <= maxw and b <= maxw and (best is None or max(a, b) < best[0]):
            best = (max(a, b), k)
    return [ws[:best[1]], ws[best[1]:]] if best else None


def cards(words, space):
    C = COMPOSE['subs']
    fits = lambda ws: layout(ws, space, C['max_w'], C['lines']) is not None
    phrases, cur = [], []
    for w in words:
        cur.append(w)
        if w['w'][-1] in C['punct']:
            phrases.append(cur)
            cur = []
    if cur:
        phrases.append(cur)
    out, card = [], []
    for ph in phrases:
        if card and fits(card + ph):
            card += ph
            continue
        if card:
            out.append(card)
            card = []
        for w in ph:
            if not card or fits(card + [w]):
                card.append(w)
            else:
                out.append(card)
                card = [w]
    if card:
        out.append(card)
    return out


def ass_header():
    C = COMPOSE['subs']
    # منطقة النص متمركزة على مركز صندوق الأمان، أعرض قليلاً من أطول سطر مسموح
    cx = design.SAFE_BOX[2] // 2
    ml, mr = cx - C['max_w'] // 2 - 25, VIDEO['width'] - (cx + C['max_w'] // 2 + 25)
    k = ass_scale(C['family'])
    sub = (f'Style: Karaoke,{FONTS[C["family"]]["family"]},{round(C["size"] * k)},{ass_color("parchment")},{ass_color("parchment")},'
           f'{ass_color("ink")},{ass_color("ink", 0xFF)},0,0,0,0,100,100,0,0,1,2,0,2,{ml},{mr},{VIDEO["height"] - C["bottom_y"]},-1')
    sig = (f'Style: Signature,{FONTS[C["family"]]["family"]},{round(COMPOSE["signature"]["size"] * k)},{ass_color("gold")},{ass_color("gold")},'
           f'{ass_color("ink")},{ass_color("ink", 0xFF)},-1,0,0,0,100,100,0,0,1,2,0,5,0,0,0,-1')
    return ('[Script Info]\nScriptType: v4.00+\nPlayResX: {w}\nPlayResY: {h}\nWrapStyle: 2\nScaledBorderAndShadow: yes\nYCbCr Matrix: TV.709\n\n'
            '[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, '
            'ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n{sub}\n{sig}\n\n'
            '[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n').format(w=VIDEO['width'], h=VIDEO['height'], sub=sub, sig=sig)


def karaoke(lines, space, end_at):
    # حدث لكل كلمة: البطاقة كاملة والكلمة الناطقة بالذهب، فوق لوح حبري مستدير واحد بعرض أطول سطر
    C, gold, base = COMPOSE['subs'], ass_color('gold'), ass_color('parchment')
    (px, py), lh = C['box_pad'], C['size'] * ass_scale(C['family'])
    all_cards = [c for ws in lines for c in cards(ws, space)]
    ev, stats = [], {'cards': len(all_cards), 'events': 0, 'max_w': 0.0, 'max_lines': 0}
    for n, card in enumerate(all_cards):
        rows = layout(card, space, C['max_w'], C['lines'])
        rw = max(sum(w['width'] for w in r) + space * (len(r) - 1) for r in rows)
        stats['max_lines'] = max(stats['max_lines'], len(rows))
        stats['max_w'] = max(stats['max_w'], rw)
        nxt = all_cards[n + 1][0]['start'] - C['lead_s'] if n + 1 < len(all_cards) else end_at
        a, b = card[0]['start'] - C['lead_s'], min(card[-1]['end'] + C['hold_s'], nxt - .02, end_at)
        ev.append(f'Dialogue: 0,{ts(a)},{ts(b)},Karaoke,,0,0,0,plate,{{\\an2\\pos({design.SAFE_BOX[2] // 2},{C["bottom_y"] + py})\\p1\\bord0\\1c{ass_color("ink")}\\1a&H{C["box_alpha"]:02X}&}}'
                  f'{rounded(round(rw + 2 * px), round(len(rows) * lh + 2 * py), 20)}{{\\p0}}')
        for i, w in enumerate(card):
            s0, s1 = (a if i == 0 else w['start']), (card[i + 1]['start'] if i + 1 < len(card) else b)
            if s1 - s0 < .01:
                continue
            text = '\\N'.join(' '.join(f'{{\\c{gold}}}{x["w"]}{{\\c{base}}}' if x is w else x['w'] for x in r) for r in rows)
            ev.append(f'Dialogue: 1,{ts(s0)},{ts(s1)},Karaoke,,0,0,0,karaoke,{text}')
    stats['events'] = len(ev) - stats['cards']
    return ev, stats


def rounded(w, h, r):
    return (f'm {r} 0 l {w - r} 0 b {w} 0 {w} 0 {w} {r} l {w} {h - r} b {w} {h} {w} {h} {w - r} {h} l {r} {h} b 0 {h} 0 {h} 0 {h - r} l 0 {r} b 0 0 0 0 {r} 0')


def signature(end_at, w_stamp, w_small):
    # ختم افتتاحي ثلاث ثوانٍ ببريق ذهبي، ثم انزلاق بين ثلاث زوايا آمنة كل 20 ثانية بنبض توهّج وعتامة 75%
    G, gold, glow = COMPOSE['signature'], ass_color('gold'), ass_color('gold_light')
    t0, t1 = G['stamp_s']
    k = ass_scale(COMPOSE['subs']['family'])
    cx, cy, fs, small = 475, G['stamp_y'], round(G['stamp_size'] * k), round(G['size'] * k)
    x1, m = design.SAFE_BOX[2], G['margin']
    corners = [(m + w_small / 2, G['top_y']), (x1 - m - w_small / 2, G['top_y']), (m + w_small / 2, G['bottom_y'])]
    alpha = f'&H{round(255 * (1 - G["opacity"])):02X}&'
    text = G['text']
    bw, bh = int(w_stamp + 64), int(G['stamp_size'] * 1.9)
    ms = int((t1 - t0) * 1000)
    ev = [
        f'Dialogue: 1,{ts(t0)},{ts(t1)},Signature,,0,0,0,stamp,{{\\an5\\pos({cx},{cy})\\p1\\bord3\\3c{gold}\\1a&HFF&\\fscx150\\fscy150\\3a&HFF&\\t(0,260,\\fscx100\\fscy100\\3a&H00&)\\t({ms - 300},{ms},\\3a&HFF&)}}{rounded(bw, bh, 22)}{{\\p0}}',
        f'Dialogue: 2,{ts(t0)},{ts(t1)},Signature,,0,0,0,stamp,{{\\an5\\pos({cx},{cy})\\fs{fs}\\frz-4\\fscx160\\fscy160\\alpha&HFF&\\t(0,260,\\frz0\\fscx100\\fscy100\\alpha&H00&)}}{text}',
        f'Dialogue: 3,{ts(t0)},{ts(t1)},Signature,,0,0,0,shimmer,{{\\an5\\pos({cx},{cy})\\fs{fs}\\c{glow}\\bord0\\blur2\\clip({int(cx + w_stamp / 2)},{cy - G["stamp_size"]},{int(cx + w_stamp / 2 + 70)},{cy + G["stamp_size"]})'
        f'\\t(350,1500,\\clip({int(cx - w_stamp / 2 - 70)},{cy - G["stamp_size"]},{int(cx - w_stamp / 2)},{cy + G["stamp_size"]}))}}{text}',
        f'Dialogue: 0,{ts(t0)},{ts(t1)},Signature,,0,0,0,glow,{{\\an5\\pos({cx},{cy})\\fs{fs}\\1a&HFF&\\bord9\\blur12\\3c{gold}\\3a&HFF&\\t(200,600,\\3a&H40&)\\t(600,1600,\\3a&HC0&)}}{text}',
    ]
    n, start, prev = 0, t1, (cx, cy)
    while start < end_at - .05:
        stop = min(start + G['every_s'], end_at)
        tx, ty = corners[n % 3]
        gl = int(G['glide_s'] * 1000)
        mv = f'\\move({prev[0]:.0f},{prev[1]:.0f},{tx:.0f},{ty:.0f},0,{gl})'
        enter = f'\\fs{fs}\\alpha&H00&\\t(0,{gl},\\fs{small}\\alpha{alpha})' if n == 0 else f'\\fs{small}\\alpha{alpha}'
        pulses = ''.join(f'\\t({p},{p + 450},\\3a&H50&)\\t({p + 450},{p + 1400},\\3a&HFF&)' for p in range(gl, int((stop - start) * 1000) - 1400, 5000))
        ev.append(f'Dialogue: 2,{ts(start)},{ts(stop)},Signature,,0,0,0,corner,{{\\an5{mv}{enter}}}{text}')
        ev.append(f'Dialogue: 0,{ts(start)},{ts(stop)},Signature,,0,0,0,glow,{{\\an5{mv}\\fs{small}\\1a&HFF&\\bord7\\blur10\\3c{gold}\\3a&HFF&{pulses}}}{text}')
        prev, start, n = (tx, ty), stop, n + 1
    return ev, corners


def ink_bbox(ass_path, fonts, D):
    # الترجمة والتوقيع وحدهما فوق أسود عند منتصف كل حدث: أقصى امتداد للحبر يجب أن يبقى داخل صندوق الأمان
    fps, W, H = VIDEO['fps'], VIDEO['width'], VIDEO['height']
    spans = re.findall(r'^Dialogue: \d+,([\d:.]+),([\d:.]+),', ass_path.read_text(encoding='utf-8'), re.M)
    sec = lambda v: sum(float(x) * m for x, m in zip(v.split(':'), (3600, 60, 1)))
    frames = sorted({min(int((sec(a) + sec(b)) / 2 * fps), int(D * fps) - 1) for a, b in spans} | {int(sec(a) * fps) + 1 for a, _ in spans})
    box = [W, H, 0, 0]
    for k in range(0, len(frames), 150):
        expr = '+'.join(f'eq(n\\,{f})' for f in frames[k:k + 150])
        raw = subprocess.run([deps.ffmpeg_bin(), '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', f'color=c=black:s={W}x{H}:r={fps}:d={D}',
                              '-vf', f"select='{expr}',ass=filename='{ass_path}':fontsdir='{fonts}',format=gray", '-fps_mode', 'passthrough', '-f', 'rawvideo', '-'],
                             capture_output=True, check=True).stdout
        for fr in np.frombuffer(raw, np.uint8).reshape(-1, H, W):
            ys, xs = np.nonzero(fr > 24)
            if len(xs):
                box = [min(box[0], xs.min()), min(box[1], ys.min()), max(box[2], xs.max()), max(box[3], ys.max())]
    return {'frames': len(frames), 'box': [int(v) for v in box]}


def card_plan(base, ep, kind, dur):
    shot = {'id': 'card', 'scene': 'card', 'part': 'card', 'type': 'card', 'start': 10.0, 'end': 10.0 + dur, 'speaker': None,
            'd': {}, 'actors': {}, 'subject': None, 'fx': [], 'state': {}, 'next': {}, 'mini': None, 'prevLib': None, 'rise': False, 'tr': {'kind': 'cut', 'dur': 0}}
    card = {'kind': kind, 'number': ep['number'], 'title': ep['title'], 'era': ep['hero'].get('era', ''), 'place': ep['hero'].get('place', ''),
            'credit': COMPOSE['signature']['text'], 'follow': COMPOSE['follow']}
    return {**base, 'duration': 10.0 + dur + 5, 'frames': int(round((10.0 + dur) * base['fps'])), 'shots': [shot], 'card': card,
            'voice': {'level': '0', 'shape': 'a', 'who': '-'}}


def decode_stereo(path):
    raw = subprocess.run([deps.ffmpeg_bin(), '-hide_banner', '-loglevel', 'error', '-i', str(path), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).T.copy()


def final_audio(mix, dst, D, t_stamp, t_outro, tag):
    # المزج كما هو + حفيف الختم + حفيف الخاتمة وإغلاق الكتاب، ثم إعادة الإتقان بهامش ذروة لترميز AAC
    x = decode_stereo(mix)
    n = int(round(D * SR))
    y = np.zeros((2, n), np.float32)
    y[:, :min(n, x.shape[1])] = x[:, :n]
    w = level(S.whoosh(.55, 1.25, hash(tag) & 0xFFFF), COMPOSE['stamp_whoosh_db'], False)
    S.place(y, S.pan_sweep(w, .45, -.45), int((t_stamp - .3) * SR))
    o = level(S.whoosh(.7, .9, 7), COMPOSE['outro_whoosh_db'], False)
    S.place(y, S.pan_sweep(o, -.3, .3), int((t_outro - .35) * SR))
    S.place(y, S.pan(level(S.page('heavy', 9), COMPOSE['outro_whoosh_db'] - 2, False), 0), int((t_outro + .2) * SR))
    return master(y, dst, COMPOSE['aac_true_peak'])


def probe(path):
    err = subprocess.run([deps.ffmpeg_bin(), '-hide_banner', '-i', str(path)], capture_output=True, text=True).stderr
    dur = re.search(r'Duration: (\d+):(\d+):([\d.]+)', err)
    head = path.read_bytes()[:1 << 20]
    return {'duration': int(dur[1]) * 3600 + int(dur[2]) * 60 + float(dur[3]),
            'video': re.search(r'Video: (.*)', err)[1], 'audio': re.search(r'Audio: (.*)', err)[1],
            'faststart': head.find(b'moov') != -1 and (head.find(b'mdat') == -1 or head.find(b'moov') < head.find(b'mdat'))}


def final_loudness(path):
    m = loudnorm(path, 'loudnorm=print_format=json')
    return {'i': m['input_i'], 'tp': m['input_tp'], 'lra': m['input_lra']}


def digest(*parts):
    h = hashlib.sha256()
    for p in parts:
        h.update(p if isinstance(p, bytes) else json.dumps(p, sort_keys=True, ensure_ascii=False, default=str).encode())
    return h.hexdigest()[:20]


def run(ep, ctx):
    tag, out = ctx['tag'], ctx['out']
    cdir = out / 'compose'
    cdir.mkdir(parents=True, exist_ok=True)
    vdir = ctx.get('voice_dir') or PATHS['voice'] / tag
    tl = json.loads((out / 'audio' / 'timeline.json').read_text(encoding='utf-8'))
    timing = json.loads((vdir / 'timing.json').read_text(encoding='utf-8'))
    vmeta = json.loads((out / 'video' / 'visuals.json').read_text(encoding='utf-8'))
    final, cover = ctx.get('final_dir', out.parent) / f'{tag}.mp4', ctx.get('final_dir', out.parent) / f'{tag}_cover.jpg'

    last_voice = max(ln['end'] for ln in tl['lines'])
    t_outro = min(last_voice + COMPOSE['outro_gap_s'], VIDEO['max_s'] - COMPOSE['outro_s'])
    D = round(t_outro + COMPOSE['outro_s'], 3)
    ident = next(s for s in tl['segments'] if s['id'] == 'ident')

    lines = spoken_words(timing, tl)
    uniq = sorted({w['w'] for ws in lines for w in ws})
    C, G = COMPOSE['subs'], COMPOSE['signature']
    widths = measure(uniq + [' '], C['size'], 400, cdir)
    wmap, space = dict(zip(uniq, widths)), widths[-1]
    for ws in lines:
        for w in ws:
            w['width'] = wmap[w['w']]
    w_stamp, w_small = measure([G['text']], G['stamp_size'], 700, cdir)[0], measure([G['text']], G['size'], 700, cdir)[0]
    sub_ev, sub_stats = karaoke(lines, space, t_outro)
    sig_ev, corners = signature(t_outro, w_stamp, w_small)
    ass = ass_header() + '\n'.join(sig_ev + sub_ev) + '\n'
    (cdir / 'subs.ass').write_text(ass, encoding='utf-8')

    base = json.loads((out / 'video' / 'plan.json').read_text(encoding='utf-8'))
    fonts = cdir / 'fonts'
    fonts.mkdir(exist_ok=True)
    for f in FONTS.values():
        dst = fonts / f['file']
        if not dst.exists():
            shutil.copyfile(PATHS['fonts'] / f['file'], dst)
    mix = out / 'audio' / 'mix.wav'
    dg = digest(vmeta['digest'], hashlib.sha256(mix.read_bytes()).digest(), ass, (ROOT / 'cards.js').read_bytes(), COMPOSE, VIDEO, AUDIO, base['era'], ep['title'])
    meta_p = cdir / 'compose.json'
    if final.is_file() and cover.is_file() and meta_p.is_file() and json.loads(meta_p.read_text(encoding='utf-8')).get('digest') == dg:
        meta = json.loads(meta_p.read_text(encoding='utf-8'))
        print(f'    current · {final.name} · {meta["duration"]:.1f}s')
        return meta

    # بطاقة العنوان فوق مقطع الشارة، وبطاقة الخاتمة، والغلاف
    t_len = ident['end'] - ident['start']
    fps = VIDEO['fps']
    title_pl = card_plan(base, ep, 'title', t_len)
    visuals.render(title_pl, cdir / 'title', frames=(int(10 * fps), int(10 * fps) + int(round(t_len * fps))), extra=('cards.js',))
    outro_pl = card_plan(base, ep, 'outro', COMPOSE['outro_s'])
    visuals.render(outro_pl, cdir / 'outro', frames=(int(10 * fps), int(10 * fps) + int(round(COMPOSE['outro_s'] * fps))), extra=('cards.js',))
    cov = visuals.stills(card_plan(base, ep, 'cover', 1), cdir / 'cover', [10.5], audit=True, extra=('cards.js',))[0]
    subprocess.run([deps.ffmpeg_bin(), '-hide_banner', '-loglevel', 'error', '-y', '-i', cov['png'], '-q:v', '2', str(cover)], check=True)

    loud = final_audio(mix, cdir / 'audio.wav', D, G['stamp_s'][0], t_outro, tag)

    tf_, of_ = COMPOSE['title_fade_s'], COMPOSE['outro_fade_s']
    pad = max(0.0, D - vmeta['frames'] / fps) + 1
    graph = (f'[0:v]tpad=stop_mode=clone:stop_duration={pad:.3f},trim=duration={D},setpts=PTS-STARTPTS[b];'
             f'[1:v]format=yuva420p,fade=t=in:st=0:d={tf_}:alpha=1,fade=t=out:st={t_len - tf_:.3f}:d={tf_}:alpha=1,setpts=PTS-STARTPTS+{ident["start"]}/TB[tc];'
             f'[b][tc]overlay=eof_action=pass[v1];'
             f'[2:v]format=yuva420p,fade=t=in:st=0:d={of_}:alpha=1,setpts=PTS-STARTPTS+{t_outro}/TB[oc];'
             f'[v1][oc]overlay=eof_action=pass[v2];'
             f'[v2]scale=in_color_matrix=bt601:out_color_matrix=bt709:in_range=tv:out_range=tv,'
             f'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv,'
             f"ass=filename='{cdir / 'subs.ass'}':fontsdir='{fonts}',format=yuv420p[v]")
    cmd = [deps.ffmpeg_bin(), '-hide_banner', '-loglevel', 'error', '-y',
           '-i', str(out / 'video' / 'visuals.mp4'), '-i', str(cdir / 'title' / 'visuals.mp4'), '-i', str(cdir / 'outro' / 'visuals.mp4'), '-i', str(cdir / 'audio.wav'),
           '-filter_complex', graph, '-map', '[v]', '-map', '3:a',
           '-c:v', VIDEO['vcodec'], '-profile:v', COMPOSE['profile'], '-level:v', COMPOSE['level'], '-preset', VIDEO['preset'], '-crf', str(VIDEO['crf']),
           '-pix_fmt', VIDEO['pix_fmt'], '-r', str(fps), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
           '-c:a', AUDIO['acodec'], '-b:a', AUDIO['bitrate'], '-ar', str(SR), '-movflags', '+faststart', '-t', str(D), str(final)]
    subprocess.run(cmd, check=True)

    ink = ink_bbox(cdir / 'subs.ass', fonts, D)
    pr = probe(final)
    fl = final_loudness(final)
    meta = {'episode': tag, 'digest': dg, 'file': final.name, 'cover': cover.name, 'duration': round(pr['duration'], 3), 'probe': pr,
            'loudness_master': loud, 'loudness_final': fl, 'subs': sub_stats, 'signature_corners': [[round(x), round(y)] for x, y in corners],
            'title_card': [ident['start'], ident['end']], 'outro': [t_outro, D], 'cover_audit': cov['audit'], 'ink': ink}
    bad = []
    if pr['duration'] > VIDEO['max_s'] + .05 or abs(pr['duration'] - D) > .1:
        bad.append(f'duration {pr["duration"]:.2f}s vs {D:.2f}s')
    if '(High)' not in pr['video'] or 'yuv420p' not in pr['video'] or f'{VIDEO["width"]}x{VIDEO["height"]}' not in pr['video']:
        bad.append(f'video {pr["video"]}')
    kbps = int((re.search(r'(\d+) kb/s', pr['audio']) or [0, 0])[1])
    if 'aac' not in pr['audio'] or f'{SR} Hz' not in pr['audio'] or 'stereo' not in pr['audio'] or not 150 <= kbps <= 200:
        bad.append(f'audio {pr["audio"]}')
    if not pr['faststart']:
        bad.append('moov not at start')
    if abs(fl['i'] - AUDIO['lufs']) > .5 or fl['tp'] > AUDIO['true_peak']:
        bad.append(f'loudness {fl}')
    if sub_stats['max_lines'] > C['lines'] or sub_stats['max_w'] > C['max_w']:
        bad.append(f'subtitles {sub_stats}')
    if ink['box'][2] >= design.SAFE_BOX[2] or ink['box'][3] >= design.SAFE_BOX[3]:
        bad.append(f'text outside safe zone {ink}')
    if cov['audit']['bad'] or cov['audit']['unsafe']:
        bad.append(f'cover {cov["audit"]}')
    if bad:
        raise ValueError(f'{final.name}: ' + '; '.join(bad))
    meta_p.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'    {final.name} · {pr["duration"]:.1f}s · {sub_stats["cards"]} subtitle cards · {fl["i"]:.1f} LUFS · TP {fl["tp"]:.1f} · cover {cover.name}')
    return meta
