'use strict';
// العوالم: المكتبة القديمة، السماوات، التضاريس، والعصور العشر وبقية المدن — طبقات [سماء، بعيد، وسط، قريب] للبارالاكس

const ST = PL.stage;
const GY = 1180;   // خط الأرض في مشاهد القصة

// ─── سماء وماء ونبات ──────────────────────────────────────────────────
function sky(kind, t, o = {}) {
  let s = rect(-400, -400, W + 800, GY + 600, `url(#sky_${kind})`);
  if (kind === 'night' || o.stars) s += once('stars', () => { const r = rng('stars'); let x = ''; for (let i = 0; i < 90; i++) x += circ(-300 + r() * 1680, r() * 1000, .8 + r() * 2.2, P.parchment, { opacity: .35 + r() * .6 }); return x; }) +
    [0, 1, 2, 3, 4, 5].map(i => circ(120 + i * 170, 140 + (i * 97) % 380, 3, P.gold_light, { opacity: .5 + .5 * Math.sin(t * 2 + i) })).join('');
  const sunY = o.sunY ?? { dawn: GY - 150, day: 330, dusk: GY - 230, night: 260, gold: GY - 120 }[kind];
  const sunX = o.sunX ?? 700;
  if (kind === 'night') s += g({}, circ(sunX, sunY, 58, P.parchment), circ(sunX + 24, sunY - 12, 50, P.lapis_deep));
  else if (!o.noSun) s += circ(sunX, sunY, 260, 'url(#glow_soft)') + circ(sunX, sunY, kind === 'day' ? 70 : 96, kind === 'day' ? P.parchment : P.gold_light, { opacity: .95 });
  if (kind !== 'night') s += clouds(t, kind);
  return s;
}
function clouds(t, kind) {
  const col = kind === 'day' ? P.parchment : kind === 'dawn' ? P.gold_light : P.gold;
  return [[120, 260, 1.1], [620, 170, .8], [900, 420, 1.3], [300, 520, .7]].map(([x, y, s], i) => {
    const dx = ((x + t * (8 + i * 3)) % 1500) - 200;
    return g({ transform: tf(dx, y, s), opacity: .55 }, paper('M-120 20 Q-110 -14 -60 -10 Q-40 -44 10 -34 Q40 -60 80 -30 Q128 -30 130 20Z', col, 5));
  }).join('');
}
function sea(y0, t, o = {}) {
  let s = rect(-400, y0, W + 800, (o.y1 ?? GY + 260) - y0, 'url(#sea)');
  for (let i = 0; i < 6; i++) {
    const y = y0 + 18 + i * ((o.y1 ?? GY + 260) - y0 - 20) / 6, ph = t * (0.8 + i * .15) + i;
    let d = `M-400 ${y + 40}`;
    for (let x = -400; x <= W + 400; x += 60) d += `Q${x + 15} ${R(y - 10 + 5 * Math.sin(ph + x * .02))} ${x + 30} ${R(y + 4 * Math.sin(ph + x * .015))}T${x + 60} ${R(y)}`;
    s += pth(d + `L${W + 400} ${y + 40}Z`, i % 2 ? P.lapis_light : P.lapis, { opacity: .45 });
    s += line(-400, y, W + 400, y, P.parchment, 2, { opacity: .18, 'stroke-dasharray': '30 60', 'stroke-dashoffset': R(-t * 40 * (i % 2 ? 1 : -1)) });
  }
  return s;
}
function river(y, h, t, col = P.lapis_light) {
  return pth(`M-400 ${y} Q300 ${y - 16} 700 ${y + 6} T1500 ${y} L1500 ${y + h} Q700 ${y + h + 18} -400 ${y + h}Z`, col) +
    [0, 1, 2].map(i => line(-400, y + 12 + i * h / 3, 1500, y + 12 + i * h / 3, P.parchment, 3, { opacity: .3, 'stroke-dasharray': '50 90', 'stroke-dashoffset': R(-t * 30 - i * 40) })).join('');
}
function palm(x, y, h, t, col = P.emerald, trunk = P.wood) {
  const sway = 3 * Math.sin(t * 1.3 + x * .01), top = [x + h * .12, y - h];
  let f = '';
  for (let i = 0; i < 7; i++) {
    const a = -170 + i * 27 + sway * 2, len = h * (.42 + .08 * (i % 2)), ex = top[0] + Math.cos(a * RAD) * len, ey = top[1] + Math.sin(a * RAD) * len + len * .35;
    f += pth(`M${R(top[0])} ${R(top[1])} Q${R((top[0] + ex) / 2)} ${R(top[1] - len * .35)} ${R(ex)} ${R(ey)} Q${R((top[0] + ex) / 2 + 6)} ${R(top[1] - len * .18)} ${R(top[0])} ${R(top[1] + 8)}Z`, col);
  }
  return g({ transform: `rotate(${R(sway)} ${x} ${y})` }, pth(`M${x - 7} ${y} Q${x + h * .05} ${y - h * .5} ${top[0] - 4} ${top[1]} L${top[0] + 5} ${top[1]} Q${x + h * .08 + 6} ${y - h * .5} ${x + 7} ${y}Z`, trunk), f, circ(top[0], top[1] + 6, 7, P.gold_dim));
}
function olive(x, y, s, t, col = P.emerald_deep, leaf = P.emerald_light) {
  const sw = 2 * Math.sin(t * 1.1 + x * .02);
  return g({ transform: tf(x, y, s) },
    pth('M-8 0 Q-14 -40 -30 -70 M8 0 Q12 -46 30 -74 M0 0 Q2 -40 0 -80', 'none', { stroke: P.wood, 'stroke-width': 12, 'stroke-linecap': 'round' }),
    g({ transform: `rotate(${R(sw)} 0 -80)` }, ell(-34, -96, 46, 30, col), ell(30, -104, 50, 34, col), ell(0, -126, 52, 34, col),
      [[-50, -104], [-20, -130], [18, -122], [48, -100], [0, -98]].map(([a, b]) => ell(a, b, 9, 4, leaf, { transform: `rotate(-25 ${a} ${b})` })).join('')));
}
const cypress = (x, y, h, col = P.emerald_deep) => pth(`M${x} ${y - h} Q${x + h * .16} ${y - h * .5} ${x + h * .09} ${y} L${x - h * .09} ${y} Q${x - h * .16} ${y - h * .5} ${x} ${y - h}Z`, col);
const poplar = (x, y, h, col = P.emerald) => ell(x, y - h * .55, h * .1, h * .5, col) + rect(x - 3, y - h * .1, 6, h * .1, P.wood);

// ─── عمارة ─────────────────────────────────────────────────────────────
function dome(x, y, w, h, col, kind = 'round') {
  const r = w / 2;
  const d = kind === 'onion' ? `M${x - r} ${y} Q${x - r * 1.25} ${y - h * .55} ${x} ${y - h} Q${x + r * 1.25} ${y - h * .55} ${x + r} ${y}Z`
    : kind === 'pointed' ? `M${x - r} ${y} Q${x - r} ${y - h * .8} ${x} ${y - h} Q${x + r} ${y - h * .8} ${x + r} ${y}Z`
      : `M${x - r} ${y} A${r} ${h} 0 0 1 ${x + r} ${y}Z`;
  return pth(d, col) + (kind === 'ribbed' || kind === 'onion' ? [-.5, 0, .5].map(k => pth(`M${x + k * r * .9} ${y} Q${x + k * r * .5} ${y - h * .7} ${x} ${y - h}`, 'none', { stroke: P.parchment, 'stroke-width': 2, opacity: .35 })).join('') : '') +
    line(x, y - h, x, y - h - 18, P.gold, 3) + circ(x, y - h - 20, 4, P.gold);
}
function minaret(x, y, h, w, style, col, cap = P.emerald) {
  if (style === 'square') return rect(x - w / 2, y - h, w, h, col) + rect(x - w / 2 - 4, y - h - 6, w + 8, 10, cap) + rect(x - w / 4, y - h - 36, w / 2, 30, col) + pth(`M${x - w / 4} ${y - h - 36} L${x} ${y - h - 54} L${x + w / 4} ${y - h - 36}Z`, cap) +
    [.2, .45, .7].map(k => rect(x - 5, y - h * (1 - k) - 24, 10, 20, P.ink_soft, { rx: 5 })).join('');
  if (style === 'pencil') return pth(`M${x - w / 2} ${y} L${x - w * .4} ${y - h} L${x + w * .4} ${y - h} L${x + w / 2} ${y}Z`, col) + rect(x - w * .6, y - h * .7, w * 1.2, 8, col) +
    pth(`M${x - w * .4} ${y - h} L${x} ${y - h - w * 2.2} L${x + w * .4} ${y - h}Z`, cap) + circ(x, y - h - w * 2.2, 3, P.gold);
  if (style === 'spiral') { let d = ''; for (let i = 0; i < 5; i++) d += rect(x - w * (1 - i * .16) / 2, y - h * (i + 1) / 5, w * (1 - i * .16), h / 5 + 1, col) + line(x - w * (1 - i * .16) / 2, y - h * (i + 1) / 5 + h / 10, x + w * (1 - i * .16) / 2, y - h * (i + .6) / 5, P.parchment_dim, 3); return d; }
  if (style === 'tower') return pth(`M${x - w / 2} ${y} L${x - w * .38} ${y - h} L${x + w * .38} ${y - h} L${x + w / 2} ${y}Z`, col) +
    [.25, .5, .75].map(k => rect(x - w * (.5 - .12 * k), y - h * k, w * (1 - .24 * k), 7, cap)).join('') + rect(x - w * .46, y - h - 18, w * .92, 18, col) + circ(x, y - h - 26, 10, cap);
  return rect(x - w / 2, y - h, w, h, col) + rect(x - w * .65, y - h * .75, w * 1.3, 8, P.gold_dim) + rect(x - w * .4, y - h - 30, w * .8, 30, col) + dome(x, y - h - 30, w * .8, 26, cap, 'onion');
}
function house(x, y, w, h, col, win = P.ink_soft, glow = 0) {
  return rect(x, y - h, w, h, col) + rect(x - 3, y - h - 5, w + 6, 7, col) +
    (w > 36 ? rect(x + w * .3, y - h * .62, w * .16, h * .26, glow ? P.gold_light : win, { rx: w * .08, opacity: glow ? .6 + .4 * glow : 1 }) +
      rect(x + w * .58, y - h * .62, w * .16, h * .26, glow ? P.gold_light : win, { rx: w * .08, opacity: glow ? .6 + .4 * glow : 1 }) : '');
}
function wallC(x0, x1, y, h, col, gate = -1, open = 0) {
  let d = `M${x0} ${y} L${x0} ${y - h}`;
  for (let x = x0; x < x1; x += 40) d += `L${x} ${y - h - 18} L${x + 22} ${y - h - 18} L${x + 22} ${y - h} L${x + 40} ${y - h}`;
  d += `L${x1} ${y}Z`;
  let s = pth(d, col) + line(x0, y - h * .55, x1, y - h * .55, P.ink, 2, { opacity: .15 });
  if (gate >= 0) {
    const gw = 90, gh = h * .75, gx = gate;
    s += pth(`M${gx - gw / 2} ${y} L${gx - gw / 2} ${y - gh * .6} Q${gx - gw / 2} ${y - gh} ${gx} ${y - gh * 1.08} Q${gx + gw / 2} ${y - gh} ${gx + gw / 2} ${y - gh * .6} L${gx + gw / 2} ${y}Z`, open ? P.gold_light : P.wood_dark) +
      (open < 1 ? rect(gx - gw / 2, y - gh * .7, gw / 2 * (1 - open), gh * .7, P.wood) + rect(gx + gw / 2 * open, y - gh * .7, gw / 2 * (1 - open), gh * .7, P.wood) : '') +
      (open ? circ(gx, y - gh * .4, 120 * open, 'url(#glow_soft)') : '');
  }
  return s;
}
function towerSq(x, y, w, h, col) { let d = `M${x - w / 2} ${y} L${x - w / 2} ${y - h}`; for (let k = 0; k < 3; k++) d += `L${x - w / 2 + k * w / 3} ${y - h - 16} L${x - w / 2 + k * w / 3 + w / 6} ${y - h - 16} L${x - w / 2 + k * w / 3 + w / 6} ${y - h} L${x - w / 2 + (k + 1) * w / 3} ${y - h}`; return pth(d + `L${x + w / 2} ${y}Z`, col) + rect(x - 6, y - h * .7, 12, 24, P.ink_soft, { rx: 6 }); }
function arcade(x, y, w, h, n, col, v1 = P.parchment, v2 = P.gold) {
  const aw = w / n;
  let s = rect(x, y - h, w, h, col);
  for (let i = 0; i < n; i++) {
    const cx = x + aw * (i + .5), r = aw * .38, top = y - h * .78;
    s += pth(`M${cx - r} ${y} L${cx - r} ${top + r * .4} A${r * 1.05} ${r * 1.05} 0 1 1 ${cx + r} ${top + r * .4} L${cx + r} ${y}Z`, P.ink_soft);
    for (let k = 0; k < 7; k++) { const a0 = (190 + k * 23) * RAD, a1 = (190 + (k + 1) * 23) * RAD, rr = r * 1.05, ro = rr + 12, cy = top + r * .4;
      s += pth(`M${R(cx + Math.cos(a0) * rr)} ${R(cy + Math.sin(a0) * rr)} L${R(cx + Math.cos(a0) * ro)} ${R(cy + Math.sin(a0) * ro)} L${R(cx + Math.cos(a1) * ro)} ${R(cy + Math.sin(a1) * ro)} L${R(cx + Math.cos(a1) * rr)} ${R(cy + Math.sin(a1) * rr)}Z`, k % 2 ? v1 : v2); }
  }
  return s;
}
function iwan(x, y, w, h, col, tile = P.lapis) {
  return rect(x - w / 2, y - h, w, h, col) + pth(`M${x - w * .32} ${y} L${x - w * .32} ${y - h * .55} Q${x} ${y - h * .98} ${x + w * .32} ${y - h * .55} L${x + w * .32} ${y}Z`, tile) +
    rect(x - w / 2, y - h, w, 14, P.gold_dim) + pth(`M${x - w * .22} ${y} L${x - w * .22} ${y - h * .45} Q${x} ${y - h * .78} ${x + w * .22} ${y - h * .45} L${x + w * .22} ${y}Z`, P.ink_soft);
}
function houses(x0, x1, y, seed, cols, hmin = 50, hmax = 110, glow = 0) {
  const r = rng(seed); let s = '';
  for (let x = x0; x < x1;) { const w = 50 + r() * 60, h = hmin + r() * (hmax - hmin); s += house(x, y + r() * 10, w, h, cols[Math.floor(r() * cols.length)], P.ink_soft, glow * (r() > .4 ? 1 : 0)); x += w * (.7 + r() * .3); }
  return s;
}

// ─── العصور العشر: [سماء، بعيد، وسط، قريب] ─────────────────────────────
const ERAS = {
  andalus: { sky: 'dawn', f: (t, o) => [
    sky(o.sky, t, { sunX: 820 }),
    pth(ridge(GY - 150, 60, 'rif', 1.2, -420, 520), P.lapis_mist) + pth(ridge(GY - 190, 50, 'sierra', 1, 560, W + 420), P.lapis_mist, { opacity: .8 }),
    sea(GY - 90, t) + paper(`M560 ${GY + 10} L600 ${GY - 250} Q640 ${GY - 400} 720 ${GY - 430} Q800 ${GY - 380} 860 ${GY - 300} L960 ${GY - 120} L1500 ${GY - 60} L1500 ${GY + 40}Z`, P.gold_dim, 8) +
      pth(`M600 ${GY - 250} Q640 ${GY - 400} 720 ${GY - 430} L700 ${GY - 250}Z`, P.gold, { opacity: .7 }) +
      paper(`M-400 ${GY + 20} L-400 ${GY - 120} L40 ${GY - 150} Q140 ${GY - 260} 220 ${GY - 220} L320 ${GY - 60} L360 ${GY + 20}Z`, P.gold_dim, 8) +
      (o.white ? houses(20, 260, GY - 130, 'tangier-w', [P.parchment, P.parchment_dim], 30, 60) + minaret(160, GY - 150, 110, 26, 'square', P.parchment) : ''),
    sea(GY + 40, t + 3, { y1: H + 400 }) + pth(`M-400 ${H + 400} L-400 ${GY + 180} Q-100 ${GY + 150} 120 ${GY + 200} L260 ${GY + 330} L260 ${H + 400}Z`, P.wood_dark),
  ] },
  baghdad: { sky: 'day', f: (t, o) => [
    sky(o.sky, t, { sunX: 780 }),
    once('bg1', () => [...Array(14)].map((_, i) => palm(-300 + i * 120, GY - 170, 150 + (i % 3) * 30, 0, P.emerald_deep, P.wood_dark)).join('')) + dome(840, GY - 200, 150, 110, P.lapis_mist),
    once('bg2', () => wallC(-100, 1200, GY - 60, 90, P.gold_dim) + houses(-200, 1300, GY - 150, 'bgh', [P.parchment_dim, P.parchment], 60, 120) +
      dome(520, GY - 250, 230, 200, P.emerald, 'pointed') + rect(410, GY - 250, 220, 110, P.parchment_dim) + minaret(250, GY - 120, 330, 90, 'spiral', P.gold_dim) + arcade(700, GY - 60, 380, 170, 5, P.parchment_dim)) +
      river(GY - 40, 90, t),
    [-120, 60, 920, 1120].map((x, i) => palm(x, GY + 250, 380 + i * 30, t)).join('') + pth(`M-400 ${GY + 250} Q540 ${GY + 200} 1500 ${GY + 250} L1500 ${H + 400} L-400 ${H + 400}Z`, P.emerald_deep),
  ] },
  bukhara: { sky: 'dawn', f: (t, o) => [
    sky(o.sky, t, { sunX: 300 }),
    pth(ridge(GY - 120, 30, 'kyz', .8), P.gold_dim, { opacity: .6 }),
    once('bk2', () => pth(`M-300 ${GY - 60} L-220 ${GY - 260} L140 ${GY - 260} L200 ${GY - 60}Z`, P.wood) + wallC(-220, 140, GY - 260, 40, P.wood) +
      houses(-300, 1400, GY - 40, 'bkh', [P.parchment_dim, P.gold_dim], 50, 100) + minaret(560, GY - 60, 560, 70, 'tower', P.gold_dim, P.lapis_light) +
      iwan(830, GY - 60, 250, 300, P.parchment_dim, P.lapis) + dome(720, GY - 250, 120, 120, P.emerald_light, 'ribbed') + dome(950, GY - 250, 120, 120, P.lapis_light, 'ribbed') +
      iwan(330, GY - 60, 180, 220, P.parchment_dim, P.emerald)),
    once('bk3', () => rect(-400, GY + 280, W + 800, H, P.gold_dim) + [-100, 160, 820, 1100].map((x, i) => ell(x, GY + 120, 110, 80, P.emerald_deep) + rect(x - 8, GY + 120, 16, 140, P.wood)).join('') + houses(-300, 1400, GY + 300, 'bkn', [P.gold_dim, P.wood], 70, 130)),
  ] },
  cordoba: { sky: 'dusk', f: (t, o) => [
    sky(o.sky, t, { sunX: 250 }),
    pth(ridge(GY - 170, 70, 'morena', 1.1), P.emerald_deep, { opacity: .85 }),
    once('cd2', () => houses(-300, 1400, GY - 150, 'cdh', [P.parchment, P.parchment_dim], 40, 90) + arcade(200, GY - 60, 700, 190, 9, P.parchment_dim, P.parchment, P.gold) +
      rect(200, GY - 290, 700, 50, P.wood) + minaret(160, GY - 60, 330, 70, 'square', P.parchment_dim, P.gold_dim) + dome(560, GY - 290, 130, 70, P.gold_dim)) +
      river(GY - 50, 80, t) + once('cd2b', () => { let s = rect(-300, GY - 90, 1700, 30, P.parchment_dim); for (let i = 0; i < 12; i++) s += pth(`M${-300 + i * 140} ${GY - 60} L${-300 + i * 140} ${GY + 10} L${-240 + i * 140} ${GY + 10} L${-240 + i * 140} ${GY - 60}Z`, P.parchment_dim) + pth(`M${-240 + i * 140} ${GY + 10} Q${-200 + i * 140} ${GY - 50} ${-160 + i * 140} ${GY + 10}`, P.ink_soft, { opacity: .5 }); return s; }),
    [-150, 90, 880, 1100].map((x, i) => palm(x, GY + 260, 400 + i * 20, t)).join('') + pth(`M-400 ${GY + 250} Q540 ${GY + 190} 1500 ${GY + 250} L1500 ${H + 400} L-400 ${H + 400}Z`, P.wood_dark),
  ] },
  cairo: { sky: 'day', f: (t, o) => [
    sky(o.sky, t, { sunX: 820 }),
    once('cr1', () => pth(ridge(GY - 150, 40, 'muq', .7), P.gold_dim, { opacity: .7 }) + pth(`M-160 ${GY - 150} L-40 ${GY - 330} L80 ${GY - 150}Z M40 ${GY - 150} L130 ${GY - 280} L220 ${GY - 150}Z`, P.gold, { opacity: .75 })),
    once('cr2', () => houses(-300, 1400, GY - 90, 'crh', [P.parchment_dim, P.gold_dim, P.parchment], 60, 130) + minaret(420, GY - 90, 380, 44, 'round', P.parchment_dim, P.gold_dim) +
      minaret(700, GY - 90, 330, 40, 'round', P.parchment_dim, P.gold_dim) + dome(560, GY - 200, 190, 150, P.gold_dim, 'pointed') + rect(470, GY - 200, 180, 110, P.parchment) + arcade(820, GY - 90, 300, 150, 4, P.parchment_dim)) +
      river(GY - 40, 100, t) + [180, 700].map((x, i) => g({ transform: tf(((x + t * 20) % 1400) - 200, GY - 10, .55) }, ship({ x: 0, y: 0, t, sail: P.parchment }))).join(''),
    [-140, 70, 930, 1140].map((x, i) => palm(x, GY + 260, 400 + i * 25, t)).join('') + pth(`M-400 ${GY + 250} Q540 ${GY + 190} 1500 ${GY + 250} L1500 ${H + 400} L-400 ${H + 400}Z`, P.emerald_deep),
  ] },
  hamadan: { sky: 'day', f: (t, o) => [
    sky(o.sky, t, { sunX: 250 }),
    once('hm1', () => { const d = `M-400 ${GY - 100} L-100 ${GY - 360} L120 ${GY - 250} L420 ${GY - 520} L700 ${GY - 300} L900 ${GY - 420} L1500 ${GY - 120} L1500 ${GY} L-400 ${GY}Z`;
      return pth(d, P.lapis_mist) + pth(`M340 ${GY - 450} L420 ${GY - 520} L500 ${GY - 440} L460 ${GY - 450} L420 ${GY - 420} L380 ${GY - 460}Z M840 ${GY - 380} L900 ${GY - 420} L960 ${GY - 385} L900 ${GY - 390}Z`, P.parchment); }),
    once('hm2', () => houses(-300, 1400, GY - 60, 'hmh', [P.gold_dim, P.wood, P.parchment_dim], 50, 110) +
      pth(`M560 ${GY - 60} L560 ${GY - 330} L680 ${GY - 330} L680 ${GY - 60}Z`, P.gold_dim) + pth(`M548 ${GY - 330} L620 ${GY - 480} L692 ${GY - 330}Z`, P.emerald_deep) + [0, 1, 2].map(k => rect(560, GY - 300 + k * 80, 120, 6, P.parchment_dim)).join('') +
      arcade(120, GY - 60, 360, 150, 5, P.gold_dim, P.parchment_dim, P.wood)),
    once('hm3', () => [-160, -40, 80, 860, 980, 1100].map((x, i) => poplar(x, GY + 240, 460 + (i % 3) * 60, i % 2 ? P.emerald : P.emerald_deep)).join('')) + river(GY + 200, 50, t) +
      pth(`M-400 ${GY + 250} L1500 ${GY + 250} L1500 ${H + 400} L-400 ${H + 400}Z`, P.emerald_deep),
  ] },
  jerusalem: { sky: 'day', f: (t, o) => [
    sky(o.sky, t, { sunX: 250 }),
    once('js1', () => pth(ridge(GY - 180, 50, 'olives', .8), P.emerald_deep, { opacity: .8 }) + (() => { const r = rng('oldots'); let s = ''; for (let i = 0; i < 40; i++) s += circ(-300 + r() * 1700, GY - 140 + r() * 60, 7 + r() * 5, P.emerald, { opacity: .7 }); return s; })()),
    once('js2', () => houses(-300, 1400, GY - 150, 'jsh', [P.parchment_dim, P.parchment], 40, 90) +
      pth(`M420 ${GY - 150} L450 ${GY - 290} L630 ${GY - 290} L660 ${GY - 150}Z`, P.lapis) + rect(450, GY - 290, 180, 20, P.emerald) + [0, 1, 2, 3].map(k => rect(465 + k * 44, GY - 250, 20, 40, P.parchment, { rx: 10 })).join('') +
      rect(500, GY - 330, 80, 40, P.lapis_light) + dome(540, GY - 330, 190, 150, 'url(#goldm)') + dome(840, GY - 170, 110, 60, P.lapis_mist) + cypress(300, GY - 150, 150) + cypress(740, GY - 150, 130)) +
      wallC(-300, 1400, GY - 10, 150, P.parchment_dim, o.gate ?? 200, o.gateOpen ?? 0),
    once('js3', () => [-140, 110, 870, 1110].map((x, i) => olive(x, GY + 270, 1.6 + (i % 2) * .3, 0)).join('')) + pth(`M-400 ${GY + 250} Q540 ${GY + 200} 1500 ${GY + 250} L1500 ${H + 400} L-400 ${H + 400}Z`, P.gold_dim),
  ] },
  tangier: { sky: 'dawn', f: (t, o) => [
    sky(o.sky, t, { sunX: 780 }),
    sea(GY - 200, t, { y1: GY + 100 }) + pth(`M700 ${GY - 200} Q900 ${GY - 250} 1500 ${GY - 220} L1500 ${GY - 200}Z`, P.lapis_mist),
    once('tg2', () => pth(`M-400 ${GY + 60} L-400 ${GY - 260} Q0 ${GY - 330} 380 ${GY - 180} Q560 ${GY - 60} 700 ${GY + 60}Z`, P.gold_dim) +
      houses(-320, 180, GY - 230, 'tgh1', [P.parchment, P.parchment_dim], 40, 80) + houses(-100, 520, GY - 110, 'tgh2', [P.parchment, P.parchment_dim], 40, 90) +
      wallC(-300, 200, GY - 290, 60, P.parchment_dim) + minaret(60, GY - 250, 260, 60, 'square', P.parchment, P.emerald) + houses(0, 640, GY + 20, 'tgh3', [P.parchment], 50, 100)),
    [920, 1120].map(x => palm(x, GY + 260, 420, t)).join('') + g({ transform: tf(820, GY + 140, .5) }, ship({ x: 0, y: 0, t, sail: P.parchment })) + pth(`M-400 ${GY + 250} Q300 ${GY + 200} 1500 ${GY + 260} L1500 ${H + 400} L-400 ${H + 400}Z`, P.gold_dim),
  ] },
  constantinople: { sky: 'day', f: (t, o) => [
    sky(o.sky, t, { sunX: 820 }),
    pth(ridge(GY - 220, 40, 'asia', .9, 500, W + 420), P.lapis_mist) + sea(GY - 190, t, { y1: GY + 100 }),
    once('cp2', () => pth(`M-400 ${GY + 40} L-400 ${GY - 200} Q100 ${GY - 260} 560 ${GY - 180} Q700 ${GY - 120} 760 ${GY + 40}Z`, P.parchment_dim) +
      houses(-300, 640, GY - 170, 'cph', [P.parchment, P.parchment_dim, P.gold_dim], 40, 80) +
      rect(160, GY - 330, 300, 150, P.gold_dim) + dome(310, GY - 330, 260, 130, P.lapis_mist) + dome(170, GY - 300, 100, 50, P.lapis_mist) + dome(450, GY - 300, 100, 50, P.lapis_mist) +
      pth(`M880 ${GY - 110} L880 ${GY - 380} L960 ${GY - 380} L960 ${GY - 110}Z`, P.parchment_dim) + pth(`M870 ${GY - 380} L920 ${GY - 480} L970 ${GY - 380}Z`, P.lapis) + houses(760, 1400, GY - 110, 'glt', [P.parchment_dim], 40, 80)) +
      wallC(-300, 700, GY + 30, 110, P.parchment_dim) + [-200, 0, 200, 400, 600].map(x => towerSq(x, GY + 30, 70, 150, P.parchment)).join('') +
      (o.chain ? pth(`M700 ${GY + 10} Q810 ${GY + 60} 900 ${GY + 10}`, 'none', { stroke: P.ink, 'stroke-width': 8, 'stroke-dasharray': '14 6' }) : ''),
    sea(GY + 100, t + 2, { y1: H + 400 }),
  ] },
  libya: { sky: 'dusk', f: (t, o) => [
    sky(o.sky, t, { sunX: 700 }),
    pth(ridge(GY - 220, 90, 'akhdar', 1.2), P.emerald_deep) + pth(ridge(GY - 150, 60, 'akhdar2', 1.6), P.emerald, { opacity: .85 }),
    pth(ridge(GY - 40, 70, 'dune1', .7), P.gold_dim) + pth(ridge(GY + 20, 50, 'dune2', .9), P.gold) +
      once('ly2', () => pth(`M700 ${GY - 30} L730 ${GY - 110} L800 ${GY - 140} L860 ${GY - 90} L880 ${GY - 30}Z`, P.wood) + g({ transform: tf(240, GY - 20) }, line(0, 0, 0, -90, P.wood_dark, 8), ell(0, -110, 90, 22, P.emerald_deep))),
    once('ly3', () => [-120, 1050].map((x, i) => olive(x, GY + 280, 1.8, 0)).join('')) + pth(ridge(GY + 250, 30, 'dune3', 1.3), P.gold_dim) +
      [0, 1, 2, 3].map(i => pth(`M${-200 + i * 400} ${GY + 330} q100 -20 200 0`, 'none', { stroke: P.gold_light, 'stroke-width': 3, opacity: .4 })).join(''),
  ] },
};

// مدن إضافية تستدعيها طبقات المشاهد
const CITYSETS = {
  toledo: (t, o) => once('toledo', () => pth(`M-100 ${GY} Q200 ${GY - 330} 540 ${GY - 360} Q880 ${GY - 330} 1180 ${GY}Z`, P.gold_dim) + houses(160, 900, GY - 300, 'tol', [P.parchment_dim, P.parchment], 40, 90) +
    towerSq(300, GY - 300, 80, 170, P.parchment_dim) + towerSq(780, GY - 290, 80, 160, P.parchment_dim) + rect(470, GY - 520, 140, 200, P.parchment) + towerSq(540, GY - 500, 60, 60, P.parchment_dim)) +
    wallC(120, 960, GY - 180, 60, P.parchment_dim, 540, (o && o.gateOpen) || 0) + g({ transform: tf(0, 0) }, pth(`M-200 ${GY + 30} L1300 ${GY + 30} L1300 ${GY + 60} L-200 ${GY + 60}Z`, P.parchment_dim) +
    [0, 1, 2, 3, 4, 5].map(i => pth(`M${-100 + i * 240} ${GY + 60} Q${20 + i * 240} ${GY - 40} ${140 + i * 240} ${GY + 60}Z`, P.lapis_light)).join('')),
  basra: t => once('basra', () => houses(-300, 1400, GY - 60, 'bas', [P.parchment_dim, P.gold_dim], 40, 90) + dome(540, GY - 120, 140, 90, P.emerald) + minaret(700, GY - 60, 260, 40, 'round', P.parchment_dim, P.emerald) +
    [...Array(10)].map((_, i) => palm(-300 + i * 170, GY - 40, 200, 0, P.emerald_deep, P.wood_dark)).join('')) + river(GY - 20, 70, t),
  tikrit: t => once('tikrit', () => pth(`M-300 ${GY - 60} L200 ${GY - 60} L260 ${GY - 360} L840 ${GY - 360} L900 ${GY - 60} L1400 ${GY - 60} L1400 ${GY + 40} L-300 ${GY + 40}Z`, P.gold_dim) +
    wallC(280, 820, GY - 360, 120, P.wood) + towerSq(300, GY - 360, 90, 200, P.wood) + towerSq(800, GY - 360, 90, 200, P.wood) + towerSq(550, GY - 360, 110, 260, P.wood)) + river(GY - 40, 90, t),
  damascus: t => once('damascus', () => houses(-300, 1400, GY - 80, 'dam', [P.parchment_dim, P.parchment], 50, 100) + rect(300, GY - 260, 480, 180, P.parchment_dim) + dome(540, GY - 260, 160, 110, P.lapis_mist, 'pointed') +
    minaret(320, GY - 80, 320, 50, 'square', P.parchment, P.gold_dim) + minaret(760, GY - 80, 300, 44, 'round', P.parchment, P.lapis_mist) + minaret(540, GY - 260, 180, 36, 'square', P.parchment, P.emerald)),
  fes: t => once('fes', () => pth(`M-300 ${GY} Q540 ${GY - 260} 1400 ${GY}Z`, P.gold_dim) + houses(-300, 1400, GY - 60, 'fes', [P.parchment, P.parchment_dim], 50, 110) +
    [[260, 200], [600, 240], [880, 180]].map(([x, w]) => pth(`M${x - w / 2} ${GY - 150} L${x} ${GY - 220} L${x + w / 2} ${GY - 150}Z`, P.emerald) + rect(x - w / 2, GY - 150, w, 70, P.parchment_dim)).join('') +
    minaret(460, GY - 80, 330, 64, 'square', P.parchment, P.emerald) + wallC(-300, 1400, GY + 10, 60, P.wood)),
  barqa: t => once('barqa', () => pth(ridge(GY - 100, 80, 'barqa', 1.2), P.emerald) + houses(160, 900, GY - 60, 'brq', [P.parchment, P.parchment_dim], 40, 70) + minaret(520, GY - 70, 150, 36, 'square', P.parchment, P.emerald)),
};
const ERA_CITY = { andalus: 'andalus', baghdad: 'baghdad', bukhara: 'bukhara', cordoba: 'cordoba', cairo: 'cairo', jerusalem: 'jerusalem', tangier: 'tangier', constantinople: 'constantinople' };
function eraLayers(name, t, o = {}) { const e = ERAS[name]; return e.f(t, { ...o, sky: o.sky || e.sky }); }

// ─── المكتبة ───────────────────────────────────────────────────────────
const LIB = { deskBack: 1150, deskFront: 1272, win: [110, 250, 330, 560] };

function shelves(x0, x1, seed) {
  const r = rng(seed), cols = [P.lapis, P.emerald, P.gold_dim, P.parchment_dim, P.wood, P.lapis_light, P.emerald_deep, P.lapis_deep];
  let s = rect(x0 - 20, 180, x1 - x0 + 40, 1100, P.wood_dark);
  for (let y = 330; y < 1180; y += 140) {
    s += rect(x0 - 20, y, x1 - x0 + 40, 16, P.wood);
    for (let x = x0; x < x1 - 20;) {
      const w = 16 + r() * 20, h = 70 + r() * 50, c = cols[Math.floor(r() * cols.length)], lean = r() < .08 ? (r() - .5) * 18 : 0;
      if (r() < .1) { s += ell(x + 30, y - 12, 32, 12, P.parchment_dim) + ell(x + 30, y - 30, 28, 11, P.parchment); x += 64; continue; }
      s += g({ transform: lean ? `rotate(${R(lean)} ${R(x + w / 2)} ${y})` : null }, rect(x, y - h, w, h, c, { rx: 2 }), rect(x, y - h * .8, w, 5, P.gold, { opacity: .8 }), rect(x, y - h * .25, w, 3, P.gold_dim));
      x += w + 1;
    }
  }
  return s;
}
function lampDesk(x, y, t, lvl = 1, glowK = 1) {
  const fl = 1 + .06 * noise(t * 7, 3) + .03 * noise(t * 17, 5);
  return g({},
    circ(x, y, 330 * fl * lvl * glowK, 'url(#glow)', { opacity: .55 * lvl }),
    pth(`M${x - 34} ${y + 72} L${x + 34} ${y + 72} L${x + 22} ${y + 56} L${x - 22} ${y + 56}Z`, P.gold_dim), rect(x - 8, y + 30, 16, 28, P.gold_dim),
    pth(`M${x - 30} ${y + 34} Q${x - 42} ${y - 30} ${x - 18} ${y - 56} L${x + 18} ${y - 56} Q${x + 42} ${y - 30} ${x + 30} ${y + 34}Z`, P.parchment, { opacity: .35 }),
    lvl > .05 ? pth(`M${x} ${y + 20} Q${x - 12 * fl} ${y - 4} ${x} ${y - 34 * fl * lvl} Q${x + 12 * fl} ${y - 4} ${x} ${y + 20}Z`, P.gold) + pth(`M${x} ${y + 18} Q${x - 6} ${y + 4} ${x} ${y - 16 * fl * lvl} Q${x + 6} ${y + 4} ${x} ${y + 18}Z`, P.gold_light) : '',
    pth(`M${x - 22} ${y - 56} L${x + 22} ${y - 56} L${x + 12} ${y - 74} L${x - 12} ${y - 74}Z`, P.gold_dim), circ(x, y - 82, 8, P.gold),
    pth(`M${x - 30} ${y + 34} Q${x - 42} ${y - 30} ${x - 18} ${y - 56}`, 'none', { stroke: P.gold_dim, 'stroke-width': 3 }),
    pth(`M${x + 30} ${y + 34} Q${x + 42} ${y - 30} ${x + 18} ${y - 56}`, 'none', { stroke: P.gold_dim, 'stroke-width': 3 }));
}
function libWindow(t, era, st) {
  const [x, y, w, h] = LIB.win, arch = `M${x} ${y + h} L${x} ${y + w * .55} Q${x} ${y} ${x + w / 2} ${y - w * .12} Q${x + w} ${y} ${x + w} ${y + w * .55} L${x + w} ${y + h}Z`;
  const L = eraLayers(era, t, { sky: st.lamp === 'dim' ? 'night' : undefined });
  const view = g({ 'clip-path': 'url(#winclip)' }, g({ transform: `translate(${x - 70} ${y - 120}) scale(.44)` }, L[0], L[1], L[2], L[3]));
  let s = `<clipPath id="winclip"><path d="${arch}"/></clipPath>` + pth(arch, P.lapis_deep) + view;
  s += once('lattice', () => { let l = ''; for (let i = 1; i < 5; i++) l += line(x + i * w / 5, y - 20, x + i * w / 5, y + h, P.wood_dark, 6); for (let j = 1; j < 7; j++) l += line(x, y + j * h / 7, x + w, y + j * h / 7, P.wood_dark, 6); return g({ 'clip-path': 'url(#winclip)' }, l); });
  s += pth(arch, 'none', { stroke: P.wood, 'stroke-width': 18 }) + pth(arch, 'none', { stroke: P.gold_dim, 'stroke-width': 4 });
  if (st.curtain === 'pinhole') s += pth(arch, P.lapis_deep) + [0, 1, 2, 3].map(i => line(x + 30 + i * 80, y, x + 40 + i * 80, y + h, P.ink, 10, { opacity: .5 })).join('') + circ(x + w * .62, y + h * .45, 4, P.gold_light) + circ(x + w * .62, y + h * .45, 26, 'url(#glow_soft)');
  return s;
}
function desk() {
  return baked('desk', [340, 1140, 1080, 800], () => {
    const { deskBack: b, deskFront: f } = LIB;
    return pth(`M392 ${b} L1400 ${b} L1400 ${f} L352 ${f}Z`, 'url(#wood)') + pth(`M352 ${f} L1400 ${f} L1400 ${H + 300} L352 ${H + 300}Z`, P.wood_dark) +
      rect(352, f + 30, 1100, 1000, 'url(#geo)', { opacity: .45 }) + line(352, f + 4, 1400, f + 4, P.gold_dim, 6) + line(392, b, 1400, b, P.gold_dim, 2, { opacity: .5 });
  });
}
function libraryBack(t, era, st, o = {}) {
  const L0 = once('libwall', () => rect(-400, -400, W + 800, H + 800, 'url(#wall)') + [0, 1, 2].map(i => pth(`M${-200 + i * 520} 1200 L${-200 + i * 520} 260 Q${60 + i * 520} 20 ${320 + i * 520} 260 L${320 + i * 520} 1200`, 'none', { stroke: P.lapis, 'stroke-width': 26, opacity: .5 })).join('')) + libWindow(t, era, st);
  const L1 = baked('libshelves', [-340, 170, 1740, 1330], () => shelves(560, 1380, 'shelfR') + shelves(-320, 90, 'shelfL') + g({ opacity: .9 }, line(40, 300, 120, 1480, P.wood, 14), line(110, 300, 190, 1480, P.wood, 14), [0, 1, 2, 3, 4, 5, 6, 7].map(i => line(46 + i * 10.6, 400 + i * 142, 116 + i * 10.6, 400 + i * 142, P.wood, 10)).join('')));
  return [L0, L1];
}
