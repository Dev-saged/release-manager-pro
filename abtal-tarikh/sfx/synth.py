"""مولّدات المؤثرات بـ numpy وحده: ضجيج مُشكَّل ونبضات ورنين فيزيائي — بلا آلات ولا موسيقى لحنية ولا ملفات مُحمَّلة."""
import numpy as np

SR = 48000


def n_of(d):
    return max(1, int(round(d * SR)))


def rng(seed):
    return np.random.default_rng(seed)


def fast_len(n):
    # أصغر طول ≥ n عوامله 2·3·5 فقط (FFT سريع)
    best = 1 << (n - 1).bit_length()
    p5 = 1
    while p5 < best:
        p35 = p5
        while p35 < best:
            p = p35
            while p < n:
                p *= 2
            best = min(best, p)
            p35 *= 3
        p5 *= 5
    return best


def spectral(x, gain_fn):
    # مرشّح ثابت في مجال التردد
    m = fast_len(len(x))
    X = np.fft.rfft(x, m)
    return np.fft.irfft(X * gain_fn(np.fft.rfftfreq(m, 1 / SR)), m)[:len(x)].astype(np.float32)


def band(lo=None, hi=None, order=2):
    def g(f):
        out = np.ones_like(f)
        if lo:
            out /= np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
        if hi:
            out /= np.sqrt(1 + (f / hi) ** (2 * order))
        return out
    return g


def white(n, r):
    return r.standard_normal(n).astype(np.float32)


def pink(n, r):
    return spectral(white(n, r), lambda f: 1 / np.sqrt(np.maximum(f, 20)))


def brown(n, r):
    return spectral(white(n, r), lambda f: 1 / np.maximum(f, 20))


def norm(x, peak_db=-6.0):
    return (x * (10 ** (peak_db / 20) / (np.abs(x).max() + 1e-9))).astype(np.float32)


def rms_norm(x, db=-24.0):
    return (x * (10 ** (db / 20) / (np.sqrt(np.mean(x ** 2)) + 1e-9))).astype(np.float32)


def smooth_env(n, rate, r, lo=0.0, hi=1.0):
    # غلاف بطيء عشوائي ناعم
    k = max(2, int(n / SR * rate) + 2)
    pts = r.random(k)
    c = max(2, int(n / SR * 200))
    env = np.interp(np.linspace(0, k - 1, c), np.arange(k), pts)
    m = fast_len(c)
    E = np.fft.rfft(env - env.mean(), m)
    env = np.fft.irfft(E * band(hi=rate)(np.fft.rfftfreq(m, 1 / 200)), m)[:c] + env.mean()
    env = np.interp(np.linspace(0, c - 1, n), np.arange(c), env)
    return (lo + (hi - lo) * np.clip(env, 0, 1)).astype(np.float32)


def decay(n, tau):
    return np.exp(-np.arange(n) / (tau * SR)).astype(np.float32)


def fade(x, fin=0.01, fout=0.05):
    x = x.copy()
    n = x.shape[-1]
    a, b = min(n, n_of(fin)), min(n, n_of(fout))
    x[..., :a] *= np.linspace(0, 1, a)
    x[..., n - b:] *= np.linspace(1, 0, b)
    return x


def place(dst, src, at):
    a = max(0, at)
    b = min(dst.shape[-1], at + src.shape[-1])
    if b > a:
        dst[..., a:b] += src[..., a - at:b - at]
    return dst


def layer(*parts):
    # جمع مقاطع أحادية بأطوال مختلفة
    out = np.zeros(max(len(x) for x in parts), np.float32)
    for x in parts:
        out[:len(x)] += x
    return out


def stereo(left, right=None):
    return np.stack([left, left if right is None else right]).astype(np.float32)


def pan(mono, p):
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.stack([mono * np.cos(th), mono * np.sin(th)]).astype(np.float32)


def pan_sweep(mono, p0, p1):
    th = (np.clip(np.linspace(p0, p1, len(mono)), -1, 1) + 1) * np.pi / 4
    return np.stack([mono * np.cos(th), mono * np.sin(th)]).astype(np.float32)


def reverb(x, rt60=0.8, wet=0.3, seed=0, hi=6000):
    r = rng(seed)
    n = n_of(rt60)
    ir = white(n, r) * np.exp(-6.9 * np.arange(n) / n)
    ir = spectral(ir, band(hi=hi))
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    size = len(x) + n
    m = fast_len(size)
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:size].astype(np.float32)
    return np.concatenate([x, np.zeros(n, np.float32)]) * (1 - wet) + y * wet


def sweep(x, centers, width=0.6, nfft=2048):
    # مرشّح متحرّك (STFT): نطاق غاوسي على محور لوغاريتمي يتبع المراكز
    hop = nfft // 4
    win = np.hanning(nfft).astype(np.float32)
    pad = np.concatenate([np.zeros(nfft, np.float32), x, np.zeros(nfft, np.float32)])
    nfr = (len(pad) - nfft) // hop + 1
    frames = pad[np.arange(nfft)[None, :] + hop * np.arange(nfr)[:, None]] * win
    f = np.log2(np.maximum(np.fft.rfftfreq(nfft, 1 / SR), 20))
    c = np.log2(np.interp(np.arange(nfr), np.linspace(0, nfr - 1, len(centers)), centers))
    mask = np.exp(-0.5 * ((f[None, :] - c[:, None]) / width) ** 2)
    y = np.fft.irfft(np.fft.rfft(frames, axis=1) * mask, nfft, axis=1).astype(np.float32) * win
    out = np.zeros(hop * (nfr + 3), np.float32)
    for k in range(4):
        out[k * hop:k * hop + nfr * hop] += y[:, k * hop:(k + 1) * hop].reshape(-1)
    return out[nfft:nfft + len(x)] / 1.5


def burst(dur, tau, lo, hi, r, attack=0.002):
    n = n_of(dur)
    env = decay(n, tau)
    a = min(n, n_of(attack))
    env[:a] *= np.linspace(0, 1, a)
    return spectral(white(n, r), band(lo, hi)) * env


def thump(freq0, freq1, dur, tau):
    # ارتطام فيزيائي منخفض: هبوط سريع في التردد مع اضمحلال (ليس نغمة موسيقية)
    n = n_of(dur)
    f = np.geomspace(freq0, freq1, n)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(n, tau)).astype(np.float32)


# ─── المؤثرات ────────────────────────────────────────────────────────────

def wind(d, strength=0.5, kind='soft', seed=1):
    r = rng(seed)
    n = n_of(d)
    chans = []
    for ch in range(2):
        rr = rng(seed * 7 + ch)
        base = brown(n, rr)
        gust = smooth_env(n, 0.25, r, 0.25, 1.0)
        low = spectral(base, band(120, 500))
        mid = spectral(pink(n, rr), band(400, 1400))
        y = low * (0.6 + 0.4 * gust) + mid * gust ** 2 * (0.4 + strength)
        if kind == 'desert':
            y += spectral(white(n, rr), band(3000, 9000)) * smooth_env(n, 0.6, r, 0, 1) ** 3 * 0.08
        if kind == 'flap':
            flaps = np.zeros(n, np.float32)
            for t in np.cumsum(r.uniform(0.25, 0.9, int(d * 3) + 2)):
                if t < d:
                    place(flaps, burst(0.09, 0.03, 150, 2500, rr) * r.uniform(0.5, 1.0), n_of(t))
            y += flaps * 0.6
        chans.append(y)
    return stereo(rms_norm(chans[0], -26 + 6 * strength), rms_norm(chans[1], -26 + 6 * strength))


def footstep(surface, r):
    if surface == 'sand':
        body = burst(0.25, 0.07, 80, 1800, r, attack=0.02)
        grains = np.zeros_like(body)
        for t in r.uniform(0, 0.14, 40):
            place(grains, burst(0.004, 0.001, 3000, 9000, r) * r.uniform(0.2, 1), n_of(t))
        return body + grains * 0.5
    click = burst(0.03, 0.004, 900, 6000, r)
    heel = np.zeros(n_of(0.12), np.float32)
    place(heel, thump(110, 70, 0.1, 0.02) * 0.6, 0)
    place(heel, click, n_of(0.01))
    return heel


def footsteps(d, surface='stone', rate=1.8, seed=2):
    r = rng(seed)
    out = np.zeros(n_of(d + 0.5), np.float32)
    t = 0.05
    while t < d:
        s = footstep(surface, r) * r.uniform(0.7, 1.0)
        place(out, s, n_of(t))
        t += 1 / rate * r.uniform(0.85, 1.15)
    out = reverb(out, 0.5 if surface == 'stone' else 0.2, 0.18, seed)
    return norm(out[:n_of(d + 0.3)], -8)


def gallop(d, distance=0.3, seed=3):
    r = rng(seed)
    out = np.zeros(n_of(d + 0.5), np.float32)
    t, stride = 0.0, 0.42
    while t < d:
        for off, amp in ((0.0, 0.7), (0.09, 0.8), (0.19, 1.0)):
            hoof = layer(burst(0.08, 0.025, 60, 900, r), thump(90, 55, 0.06, 0.015) * 0.5, burst(0.03, 0.01, 2500, 7000, r) * 0.15)
            place(out, hoof * amp * r.uniform(0.85, 1.1), n_of(t + off + r.normal(0, 0.006)))
        t += stride * r.uniform(0.95, 1.05)
    out = spectral(out, band(hi=900 + 3000 * (1 - distance)))
    return norm(reverb(out, 0.4 + distance, 0.15 + 0.3 * distance, seed)[:n_of(d)], -8 - 10 * distance)


def waves(d, kind='sea', seed=4):
    n = n_of(d)
    chans = []
    for ch in range(2):
        r = rng(seed * 11 + ch)
        t = np.arange(n) / SR
        if kind == 'river':
            flow = spectral(pink(n, r), band(200, 2500)) * smooth_env(n, 0.8, r, 0.7, 1.0)
            bubbles = np.zeros(n, np.float32)
            for tt in np.cumsum(r.exponential(0.25, int(d * 5) + 2)):
                if tt < d:
                    k = n_of(0.03)
                    f = np.geomspace(r.uniform(300, 600), r.uniform(700, 1200), k)
                    place(bubbles, np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(k, 0.01) * r.uniform(0.1, 0.3), n_of(tt))
            chans.append(rms_norm(flow + bubbles * 0.2, -24))
            continue
        swell = 0.5 + 0.3 * np.sin(2 * np.pi * t / 7.3 + ch) + 0.2 * np.sin(2 * np.pi * t / 11.1 + 2 * ch)
        swell = np.clip(swell * smooth_env(n, 0.1, r, 0.8, 1.1), 0.1, 1.2).astype(np.float32)
        rumble = spectral(brown(n, r), band(40, 600)) * swell
        foam = spectral(pink(n, r), band(1200, 9000)) * np.maximum(0, np.gradient(swell) * SR * 4) ** 0.7
        foam = spectral(foam, band(hi=9000)) * swell
        chans.append(rms_norm(rumble + foam * 0.9, -22))
    return stereo(*chans)


def fire(d, intensity=0.6, seed=5):
    r = rng(seed)
    n = n_of(d)
    roar = spectral(brown(n, r), band(60, 500)) * smooth_env(n, 1.5, r, 0.6, 1.0)
    roar = rms_norm(roar, -34 + 8 * intensity)
    crack = np.zeros(n + n_of(0.05), np.float32)
    for t in np.cumsum(r.exponential(1 / (3 + 15 * intensity), int(d * 20) + 5)):
        if t < d:
            c = r.uniform(1500, 6000)
            place(crack, burst(0.02, r.uniform(0.002, 0.008), c * 0.6, c * 1.6, r) * r.lognormal(-1.2, 0.7), n_of(t))
    y = roar + norm(crack[:n], -10 + 4 * intensity)
    return pan(y, 0.0) * 1.2


def whoosh(d=0.6, bright=1.0, seed=6):
    r = rng(seed)
    n = n_of(d)
    x = pink(n, r)
    k = 32
    t = np.linspace(0, 1, k)
    centers = 300 + (2200 * bright) * np.sin(np.pi * t) ** 2
    y = sweep(x, centers, width=0.7) * (np.sin(np.pi * np.linspace(0, 1, n)) ** 2)
    return norm(y, -6)


def thud(kind='heavy', seed=7):
    r = rng(seed)
    if kind == 'tap':
        return norm(burst(0.05, 0.006, 1800, 6000, r), -10)
    if kind == 'knock':
        y = layer(burst(0.15, 0.03, 400, 1600, r), thump(220, 160, 0.1, 0.02) * 0.4)
        return norm(reverb(y, 0.3, 0.2, seed), -8)
    y = layer(thump(70, 38, 0.7, 0.16), burst(0.4, 0.07, 30, 400, r) * 0.8)
    if kind == 'stone':
        y = layer(y * 0.6, burst(0.3, 0.04, 800, 5000, r) * 0.5)
    if kind == 'distant':
        y = spectral(reverb(y, 2.5, 0.6, seed, hi=900), band(hi=500))
    return norm(reverb(y, 0.6, 0.15, seed), -4)


def page(kind='turn', seed=8):
    r = rng(seed)
    d = {'turn': 0.55, 'unfold': 1.4, 'heavy': 0.7}[kind]
    n = n_of(d)
    y = np.zeros(n, np.float32)
    clusters = [(0.05, 0.4)] if kind != 'unfold' else [(t, 0.3) for t in (0.05, 0.4, 0.75, 1.05)]
    for start, span in clusters:
        for t in start + r.beta(2, 3, 45) * span:
            place(y, burst(r.uniform(0.004, 0.02), r.uniform(0.002, 0.008), 1200, 9000, r) * r.uniform(0.2, 1), n_of(t))
        air = spectral(white(n_of(span), r), band(600, 4000)) * np.sin(np.linspace(0, np.pi, n_of(span))) ** 2 * 0.08
        place(y, air, n_of(start))
    if kind == 'heavy':
        place(y, thud('heavy', seed)[:n_of(0.4)] * 0.25, n_of(0.35))
    return norm(reverb(y, 0.4, 0.12, seed), -8)


def quill(d, kind='scratch', seed=9):
    r = rng(seed)
    n = n_of(d)
    y = np.zeros(n, np.float32)
    lo, hi, grain = (2500, 7500, (40, 120)) if kind == 'scratch' else (250, 1500, (8, 16))
    t = 0.02
    while t < d:
        L = r.uniform(0.15, 0.5)
        m = n_of(L)
        am = np.abs(spectral(white(m, r), band(grain[0] / 2, grain[1])))
        stroke = spectral(white(m, r), band(lo, hi)) * am * np.sin(np.linspace(0, np.pi, m)) ** 0.5
        place(y, stroke * r.uniform(0.6, 1), n_of(t))
        t += L + r.uniform(0.08, 0.3)
    return norm(y, -10)


def crowd(d, density=20, bright=1.0, seed=10):
    r = rng(seed)
    n = n_of(d)
    out = np.zeros((2, n), np.float32)
    for _ in range(density):
        v = pink(n, r)
        f1, f2 = r.uniform(350, 900), r.uniform(1200, 2600) * bright
        v = spectral(v, lambda f: np.exp(-0.5 * ((f - f1) / 180) ** 2) + 0.6 * np.exp(-0.5 * ((f - f2) / 400) ** 2))
        syll = np.clip(smooth_env(n, r.uniform(3.5, 6), r, -0.6, 1.0), 0, 1) * smooth_env(n, 0.3, r, 0.2, 1.0)
        out += pan(v * syll, r.uniform(-0.8, 0.8))
    return (out / (np.sqrt(np.mean(out ** 2)) + 1e-9) * 10 ** (-24 / 20)).astype(np.float32)


def creak(d, rate, r):
    # احتكاك «التصاق-انزلاق»: قطار نبضات متغيّر يثير رنين الخشب
    n = n_of(d)
    rr = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, 6), r.uniform(*rate, 6))
    ph = np.cumsum(rr) / SR
    imp = np.diff(np.floor(ph), prepend=0).astype(np.float32) * r.uniform(0.6, 1, n).astype(np.float32)
    m = n_of(0.02)
    tt = np.arange(m) / SR
    body = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.004) for f in r.uniform(500, 2400, 3))
    y = np.convolve(imp, body.astype(np.float32))[:n]
    return y * np.sin(np.linspace(0, np.pi, n)) ** 0.6


def door(kind='door', seed=11):
    r = rng(seed)
    if kind == 'rope':
        y = np.concatenate([creak(r.uniform(0.2, 0.35), (160, 320), r) for _ in range(3)] + [np.zeros(n_of(0.1), np.float32)])
        return norm(y, -10)
    if kind == 'ship':
        y = np.zeros(n_of(2.4), np.float32)
        for t in (0.0, 0.9, 1.6):
            place(y, creak(r.uniform(0.4, 0.7), (25, 70), r), n_of(t))
        return norm(reverb(y, 0.8, 0.25, seed), -10)
    d, rate = (1.1, (70, 220)) if kind == 'door' else (2.2, (30, 90))
    y = creak(d, rate, r)
    y = np.concatenate([y, np.zeros(n_of(0.6), np.float32)])
    place(y, thud('knock' if kind == 'door' else 'heavy', seed)[:n_of(0.6)] * (0.7 if kind == 'door' else 0.5), n_of(d - 0.05))
    return norm(reverb(y, 0.7 if kind == 'door' else 1.4, 0.2, seed), -8)


def chirp(r, lo, hi, dur):
    n = n_of(dur)
    shape = r.choice(['down', 'up', 'arch'])
    x = np.linspace(0, 1, n)
    curve = {'down': 1 - x, 'up': x, 'arch': np.sin(np.pi * x)}[shape]
    f = lo + (hi - lo) * curve
    env = np.sin(np.pi * x) ** 2
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * env).astype(np.float32)


def birds(d, kind='song', density=1.0, seed=12):
    r = rng(seed)
    n = n_of(d)
    out = np.zeros((2, n + n_of(1)), np.float32)
    t = r.uniform(0, 0.5)
    while t < d:
        p = r.uniform(-0.8, 0.8)
        if kind == 'crickets':
            call = np.zeros(n_of(0.2), np.float32)
            for k in range(r.integers(3, 5)):
                place(call, chirp(r, 4400, 4700, 0.018), n_of(k * 0.03))
            gap = r.uniform(0.25, 0.6) / density
        elif kind == 'gull':
            call = chirp(r, 700, r.uniform(1100, 1500), r.uniform(0.25, 0.45))
            call += spectral(white(len(call), r), band(900, 2500)) * np.abs(call) * 0.4
            gap = r.uniform(2, 5) / density
        else:
            call = np.concatenate([np.concatenate([chirp(r, r.uniform(2500, 3500), r.uniform(4000, 6000), r.uniform(0.05, 0.12)),
                                                   np.zeros(n_of(r.uniform(0.02, 0.07)), np.float32)]) for _ in range(r.integers(2, 6))])
            gap = r.uniform(0.6, 2.2) / density
        place(out, pan(call * r.uniform(0.3, 1.0), p), n_of(t))
        t += len(call) / SR + gap
    return (out[:, :n] / (np.abs(out).max() + 1e-9) * 10 ** (-12 / 20)).astype(np.float32)


def heartbeat(beats=2, bpm=62, seed=13):
    r = rng(seed)
    period = 60 / bpm
    out = np.zeros(n_of(beats * period + 0.4), np.float32)
    for b in range(beats):
        for off, amp in ((0.0, 1.0), (0.28, 0.65)):
            hit = layer(thump(58, 34, 0.18, 0.05), burst(0.12, 0.03, 20, 150, r) * 0.6)
            place(out, hit * amp, n_of(b * period + off))
    return norm(spectral(out, band(hi=180)), -6)


def riser(d=1.2, seed=14):
    r = rng(seed)
    n = n_of(d)
    k = 40
    centers = np.geomspace(250, 7000, k)
    env = np.linspace(0, 1, n) ** 2.2
    tail = n_of(0.03)
    env[-tail:] *= np.linspace(1, 0, tail)
    chans = [sweep(pink(n, rng(seed * 3 + c)), centers, width=0.9) * env for c in range(2)]
    y = stereo(*chans)
    width = np.linspace(0.2, 1.0, n)
    mid, side = (y[0] + y[1]) / 2, (y[0] - y[1]) / 2 * width
    return norm(np.stack([mid + side, mid - side]), -6)


# ─── الخلفيات حسب المكان ────────────────────────────────────────────────

def bed(setting, d, seed=20):
    r = rng(seed)
    n = n_of(d)
    if setting == 'desert':
        y = wind(d, 0.35, 'desert', seed)
    elif setting == 'sea':
        y = waves(d, 'sea', seed) + birds(d, 'gull', 0.25, seed) * 0.25
    elif setting == 'city':
        y = crowd(d, 16, 0.8, seed) * 0.8
        y = np.stack([spectral(c, band(hi=2500)) for c in y])
        steps = footsteps(d, 'stone', 1.2, seed)[:n]
        y += pan(steps, r.uniform(-0.5, 0.5)) * 0.15
    else:
        tone = spectral(pink(n, r), band(40, 450))
        air = spectral(white(n, r), band(3000, 10000)) * 0.05
        y = stereo(rms_norm(tone, -46) + rms_norm(air, -60), rms_norm(spectral(pink(n, rng(seed + 1)), band(40, 450)), -46))
        for t in np.cumsum(r.uniform(7, 14, int(d / 7) + 2)):
            if t < d - 1:
                place(y, pan(page('turn', int(t * 10)), r.uniform(-0.6, 0.6)) * 0.08, n_of(t))
    return y.astype(np.float32)


SOUNDS = {
    'wind': lambda: wind(4.0, 0.5),
    'footsteps_sand': lambda: pan(footsteps(3.0, 'sand'), 0),
    'footsteps_stone': lambda: pan(footsteps(3.0, 'stone'), 0),
    'horse_gallop': lambda: pan_sweep(gallop(4.0, 0.3), -0.7, 0.7),
    'sea_waves': lambda: waves(8.0),
    'fire_crackle': lambda: fire(4.0),
    'sword_whoosh': lambda: pan_sweep(whoosh(0.6), -0.5, 0.5),
    'heavy_thud': lambda: pan(thud('heavy'), 0),
    'page_turn': lambda: pan(page('turn'), 0),
    'quill_scratch': lambda: pan(quill(3.0), 0),
    'crowd_murmur': lambda: crowd(5.0),
    'wooden_door': lambda: pan(door('door'), 0),
    'birds': lambda: birds(6.0),
    'heartbeat': lambda: pan(heartbeat(3), 0),
    'transition_riser': lambda: riser(1.2),
    'bed_desert': lambda: bed('desert', 8.0),
    'bed_sea': lambda: bed('sea', 8.0),
    'bed_city': lambda: bed('city', 8.0),
    'bed_library': lambda: bed('library', 8.0),
}
