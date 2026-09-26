"""ربط إشارات النصوص (المرحلة 2) بمولّدات synth. لا آلات ولا نغمات: الأجراس والطبول والرنين تُستبدل بأصوات فيزيائية."""
import numpy as np
from . import synth as S


def stinger(lead, seed):
    y = np.zeros(S.n_of(lead + 1.4), np.float32)
    S.place(y, S.whoosh(lead, 0.8, seed) * 0.7, 0)
    S.place(y, S.thud('heavy', seed), S.n_of(lead))
    return y


def hits(kind, times, seed):
    r = S.rng(seed)
    y = np.zeros(S.n_of(times[-1] + 1.2), np.float32)
    for i, t in enumerate(times):
        S.place(y, S.thud(kind, seed + i) * r.uniform(0.7, 1.0), S.n_of(t + abs(r.normal(0, 0.02))))
    return y


def distant(d, seed):
    # ارتطامات بعيدة بفواصل غير منتظمة: لا إيقاع ولا طبول
    r = S.rng(seed)
    y = np.zeros(S.n_of(d + 4), np.float32)
    t = r.uniform(0, 0.4)
    while t < d:
        S.place(y, S.thud('distant', seed + int(t * 10)) * r.uniform(0.5, 1.0), S.n_of(t))
        t += r.uniform(0.9, 2.4)
    return y


def surface(bed):
    return 'sand' if bed == 'desert' else 'stone'


def cue(kind, db, at, gen, lead=0.0, rms=False):
    return {'kind': kind, 'db': db, 'at': at, 'gen': gen, 'lead': lead, 'rms': rms}


# kind: shot يسبق السطر · span يغطّيه. db: ذروة، أو RMS إن rms=True. at: موضع STAGE أو speaker أو wide أو (p0, p1) للحركة (يمين←يسار)
# gen(d, seed, bed): d مدة الامتداد (None للحدث)، bed خلفية المشهد
CUE = {
    'stinger_hook': cue('shot', -6, 'center', lambda d, s, b: stinger(0.24, s), lead=0.24),
    'book_open': cue('shot', -16, 'book', lambda d, s, b: S.page('heavy', s)),
    'book_close': cue('shot', -16, 'book', lambda d, s, b: S.layer(S.thud('heavy', s) * 0.5, S.page('turn', s) * 0.6)),
    'page_turn': cue('shot', -18, 'book', lambda d, s, b: S.page('turn', s)),
    'paper_unfold': cue('shot', -18, 'popup', lambda d, s, b: S.page('unfold', s)),
    'whoosh_page': cue('shot', -16, (0.4, -0.4), lambda d, s, b: S.whoosh(0.5, 0.7, s), lead=0.25),
    'candle_flicker': cue('span', -36, 'lamp', lambda d, s, b: S.fire(d, 0.15, s), rms=True),
    'quill_scratch': cue('span', -24, 'book', lambda d, s, b: S.quill(d, 'scratch', s)),
    'chime_soft': cue('shot', -20, 'center', lambda d, s, b: S.riser(0.8, s), lead=0.8),
    'chime_lesson': cue('shot', -12, 'center', lambda d, s, b: S.heartbeat(2, 60, s)),
    'footsteps': cue('span', -18, 'speaker', lambda d, s, b: S.footsteps(d, surface(b), 1.8, s)),
    'wind_soft': cue('span', -32, 'wide', lambda d, s, b: S.wind(d, 0.3, 'soft', s), rms=True),
    'desert_wind': cue('span', -29, 'wide', lambda d, s, b: S.wind(d, 0.6, 'desert', s), rms=True),
    'sail_flap': cue('span', -30, 'wide', lambda d, s, b: S.wind(d, 0.4, 'flap', s), rms=True),
    'waves': cue('span', -28, 'wide', lambda d, s, b: S.waves(d, 'sea', s), rms=True),
    'river_flow': cue('span', -31, 'wide', lambda d, s, b: S.waves(d, 'river', s), rms=True),
    'seagulls': cue('span', -20, 'wide', lambda d, s, b: S.birds(d, 'gull', 1.5, s)),
    'birds_morning': cue('span', -22, 'wide', lambda d, s, b: S.birds(d, 'song', 1.0, s)),
    'night_crickets': cue('span', -26, 'wide', lambda d, s, b: S.birds(d, 'crickets', 1.0, s)),
    'ship_creak': cue('shot', -18, 'popup', lambda d, s, b: S.door('ship', s)),
    'rope_pull': cue('shot', -18, 'popup', lambda d, s, b: S.door('rope', s)),
    'drums_distant': cue('span', -14, 'wide', lambda d, s, b: distant(d, s)),
    'hoofbeats': cue('span', -14, (0.6, -0.6), lambda d, s, b: S.gallop(d, 0.4, s)),
    'camel_bells': cue('span', -20, (0.5, -0.5), lambda d, s, b: S.footsteps(d, 'sand', 1.1, s)),
    'market_bustle': cue('span', -28, 'wide', lambda d, s, b: S.crowd(d, 24, 1.0, s), rms=True),
    'crowd_murmur': cue('span', -30, 'wide', lambda d, s, b: S.crowd(d, 14, 0.8, s), rms=True),
    'gate_open': cue('shot', -14, 'popup', lambda d, s, b: S.door('gate', s)),
    'stone_blocks': cue('shot', -14, 'popup', lambda d, s, b: hits('stone', (0.0, 0.55), s)),
    'hammer_anvil': cue('shot', -16, 'popup', lambda d, s, b: hits('knock', (0.0, 0.4, 0.8), s)),
    'metal_tools': cue('shot', -20, 'popup', lambda d, s, b: hits('tap', (0.0, 0.18, 0.5, 0.62), s)),
    'glass_clink': cue('shot', -22, 'popup', lambda d, s, b: hits('tap', (0.0, 0.22), s)),
    'mortar_pestle': cue('span', -22, 'popup', lambda d, s, b: S.quill(d, 'grind', s)),
    'fire_crackle': cue('span', -30, 'popup', lambda d, s, b: S.fire(d, 0.6, s), rms=True),
}
