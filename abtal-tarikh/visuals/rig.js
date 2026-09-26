'use strict';
// هيكل الشخصيات: فارس والجدّ بتعريف واحد لكل الحلقات. الرمش مبذور باسم الشخصية، الفم من سعة الصوت إطاراً إطاراً، والمشي دورة زاوية

const VOICE = PL.voice;
function mouthAt(t, who) {
  const i = clamp(Math.floor(t * FPS), 0, VOICE.who.length - 1);
  if (VOICE.who[i] !== who[0]) return { v: 0, sh: 'a' };
  const lv = k => +VOICE.level[clamp(k, 0, VOICE.level.length - 1)] / 9;
  return { v: (2 * lv(i) + lv(i - 1)) / 3, sh: VOICE.shape[i] };
}
const talking = (t, who) => { const i = clamp(Math.floor(t * FPS), 0, VOICE.who.length - 1); return VOICE.who[i] === who[0]; };

const BLINKS = {};
function blinkAt(t, who) {
  const b = BLINKS[who] || (BLINKS[who] = (() => {
    const r = rng('blink:' + who), a = [];
    for (let x = .9 + r() * 2; x < PL.duration + 10; x += 2.3 + r() * 3.2) { a.push(x); if (r() < .2) a.push(x + .3); }
    return a;
  })());
  let lo = 0, hi = b.length - 1, k = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (b[m] <= t) { k = m; lo = m + 1; } else hi = m - 1; }
  if (k < 0) return 0;
  const d = t - b[k];
  return d < .06 ? d / .06 : d < .15 ? 1 - (d - .06) / .09 : 0;
}

// حركة مفصلين: كتف ← مرفق ← يد نحو الهدف
function ik(sx, sy, tx, ty, l1, l2, bend) {
  const dx = tx - sx, dy = ty - sy, d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 2, l1 + l2 - .5);
  const a = Math.atan2(dy, dx), c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const a1 = a + bend * Math.acos(c), ex = sx + l1 * Math.cos(a1), ey = sy + l1 * Math.sin(a1);
  const a2 = Math.atan2(ty - ey, tx - ex);
  return { ex, ey, hx: ex + l2 * Math.cos(a2), hy: ey + l2 * Math.sin(a2), a: a2 };
}

function hand(x, y, a, kind, n, r, col) {
  const cap = (len, w) => `M0 ${-w / 2}h${len}a${w / 2} ${w / 2} 0 0 1 0 ${w}h${-len}z`;
  if (kind === 'count') {
    let f = '';
    for (let i = 0; i < n; i++) f += pth(cap(r * 1.45, r * .52), col, { transform: `rotate(${-90 + (i - (n - 1) / 2) * 17})` });
    return g({ transform: tf(x, y) }, f, circ(0, 0, r, col), ell(r * .7, r * .2, r * .38, r * .28, col));
  }
  if (kind === 'flat') {
    let f = '';
    for (let i = 0; i < 4; i++) f += pth(cap(r * 1.2, r * .46), col, { transform: `translate(${(i - 1.5) * r * .5} ${-r * .5}) rotate(-90)` });
    return g({ transform: tf(x, y) }, f, rect(-r, -r * .8, r * 2, r * 1.7, col, { rx: r * .7 }));
  }
  const deg = a / RAD;
  if (kind === 'point') return g({ transform: tf(x, y, 1, deg) }, circ(0, 0, r * .95, col), pth(cap(r * 1.6, r * .5), col, { transform: `translate(${r * .3} ${-r * .15})` }));
  if (kind === 'fist') return circ(x, y, r * .95, col);
  return g({ transform: tf(x, y, 1, deg) }, ell(r * .25, 0, r * 1.15, r * .88, col), ell(r * .1, -r * .75, r * .55, r * .3, col, { transform: 'rotate(-30)' }));
}

function armDraw(sx, sy, p, l1, l2, w, sleeve, cuff, skin, r) {
  const k = ik(sx, sy, p.tx, p.ty, l1, l2, p.bend);
  const cx = k.hx - Math.cos(k.a) * r * 1.1, cy = k.hy - Math.sin(k.a) * r * 1.1;
  return {
    svg: poly([[sx, sy], [k.ex, k.ey], [cx, cy]], sleeve, w) + line(cx - Math.cos(k.a) * 5, cy - Math.sin(k.a) * 5, cx, cy, cuff, w * .9) +
      hand(k.hx, k.hy, k.a, p.kind, p.n, r, skin),
    hx: k.hx, hy: k.hy, a: k.a,
  };
}

// أغراض في اليد: مرسومة قائمةً فوق موضع اليد
function held(name, x, y, t) {
  switch (name) {
    case 'phone': return g({ transform: tf(x, y - 26) }, rect(-15, -26, 30, 52, P.ink, { rx: 6 }), rect(-11, -21, 22, 40, P.lapis_light, { rx: 3 }), circ(0, 0, 30, 'url(#glow_soft)', { opacity: .5 }));
    case 'notebook': return g({ transform: tf(x + 6, y - 30, 1, -8) }, rect(-30, -38, 60, 76, P.lapis, { rx: 4 }), rect(-24, -32, 50, 64, P.parchment, { rx: 2 }), line(-16, -14, 16, -14, P.lapis_light, 3), line(-16, 0, 16, 0, P.lapis_light, 3), line(-16, 14, 8, 14, P.lapis_light, 3));
    case 'book': return g({ transform: tf(x, y - 34) }, rect(-32, -42, 64, 84, P.emerald, { rx: 4 }), rect(26, -40, 6, 80, P.parchment_dim), rect(-22, -30, 42, 60, 'none', { stroke: P.gold, 'stroke-width': 3, rx: 3 }), circ(-1, 0, 7, P.gold));
    case 'bigbook': return g({ transform: tf(x - 10, y - 20) }, rect(-58, -62, 116, 124, P.wood, { rx: 6 }), rect(-58, 44, 116, 18, P.parchment_dim), rect(-48, -52, 96, 94, 'none', { stroke: P.gold, 'stroke-width': 4, rx: 4 }), pth('M0 -34 L10 -6 L0 22 L-10 -6Z', P.gold));
    case 'compass': return g({ transform: tf(x, y - 24) }, circ(0, 0, 25, P.gold_dim), circ(0, 0, 20, P.parchment), pth('M0 -17 L5 0 L0 17 L-5 0Z', P.lapis, { transform: `rotate(${20 * Math.sin(t * 1.3)})` }), circ(0, 0, 3, P.gold));
    case 'ship': return g({ transform: tf(x, y - 30, 1, 3 * Math.sin(t * 2)) }, pth('M-38 6 L38 6 L26 22 L-26 22Z', P.parchment), line(0, 6, 0, -44, P.wood, 3), pth('M2 -42 Q30 -20 2 2Z', P.gold));
    case 'blank': return g({ transform: tf(x + 40, y - 20) }, pth('M-95 -52 Q-48 -62 0 -50 L0 50 Q-48 38 -95 48Z', P.parchment), pth('M95 -52 Q48 -62 0 -50 L0 50 Q48 38 95 48Z', P.parchment_dim), line(0, -50, 0, 50, P.gold_dim, 3), rect(-95, -60, 190, 118, 'url(#glow_soft)', { opacity: .6 }));
    default: return '';
  }
}

// ─── فارس ─────────────────────────────────────────────────────────────
const FR = { hip: 245, sh: [54, -188], neck: -205, head: -292, l1: 90, l2: 86, sleeve: 30, hand: 16, thigh: 116, shin: 112 };

function legsDraw(p) {
  const col = P.lapis_deep, w = 32, feet = [];
  let hip = [0, -FR.hip + p.dy], out = '';
  const legPath = (hx, th, kn) => {
    const kx = hx + Math.sin(th * RAD) * FR.thigh, ky = hip[1] + Math.cos(th * RAD) * FR.thigh;
    const fx = kx + Math.sin((th - kn) * RAD) * FR.shin, fy = ky + Math.cos((th - kn) * RAD) * FR.shin;
    feet.push([fx, fy]);
    return poly([[hx, hip[1]], [kx, ky], [fx, fy]], col, w) + ell(fx + 9, fy + 2, 22, 11, P.ink);
  };
  if (p.legs === 'walk' || p.legs === 'stand') {
    const amp = p.legs === 'walk' ? 1 : 0;
    const A = [22 * Math.sin(p.phase) * amp, 38 * Math.max(0, Math.sin(p.phase + 1.9)) * amp];
    const B = [22 * Math.sin(p.phase + Math.PI) * amp, 38 * Math.max(0, Math.sin(p.phase + Math.PI + 1.9)) * amp];
    out = legPath(-18, A[0] - 2, A[1]) + legPath(18, B[0] + 2, B[1]);
  } else if (p.legs === 'sit') {
    hip = [0, -150 + p.dy];
    out = rect(-54, hip[1] + 14, 108, 18, P.wood, { rx: 4 }) + rect(-46, hip[1] + 30, 12, -hip[1] - 30, P.wood_dark) + rect(34, hip[1] + 30, 12, -hip[1] - 30, P.wood_dark);
    for (const hx of [-14, 14]) out += poly([[hx, hip[1]], [hx + 108, hip[1] + 6], [hx + 116, -12]], col, w) + ell(hx + 128, -8, 22, 11, P.ink);
  } else if (p.legs === 'cross') {
    hip = [0, -72 + p.dy];
    out = poly([[-16, hip[1]], [-96, -34], [34, -18]], col, w + 2) + poly([[16, hip[1]], [96, -34], [-34, -18]], col, w + 2);
  } else if (p.legs === 'hug') {
    hip = [0, -64 + p.dy];
    out = poly([[-10, hip[1]], [62, -178], [92, -10]], col, w + 2) + ell(104, -6, 22, 11, P.ink) + poly([[12, hip[1]], [80, -170], [112, -10]], col, w + 2) + ell(124, -6, 22, 11, P.ink);
  }
  return { svg: out, hip };
}

function farisFace(p, t, o) {
  const tu = p.turn, b = o.blink, m = o.mouth, fx = tu * 14;
  const eye = (cx) => {
    const cy = 4 + (p.eyes === 'down' ? 4 : 0);
    if (b > .6 || p.eyes === 'closed') return pth(`M${cx - 10} ${cy} Q${cx} ${cy + 5} ${cx + 10} ${cy}`, 'none', { stroke: P.ink, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
    if (p.eyes === 'happy') return pth(`M${cx - 10} ${cy + 3} Q${cx} ${cy - 10} ${cx + 10} ${cy + 3}`, 'none', { stroke: P.ink, 'stroke-width': 4, 'stroke-linecap': 'round' });
    const ry = (p.eyes === 'wide' ? 14 : p.eyes === 'squint' ? 4.5 : p.eyes === 'down' ? 7 : 11) * (1 - b), rx = p.eyes === 'wide' ? 10 : 8.5;
    const lx = p.look[0] * 3, ly = p.look[1] * 3;
    return ell(cx + lx, cy + ly, rx, Math.max(1.5, ry), P.ink) + (ry > 5 ? circ(cx + lx + 3, cy + ly - ry * .4, 2.8, P.parchment) : '');
  };
  const brow = (cx, side) => {
    const y = -20 - p.brow * 6, tilt = p.browT * side;
    return pth(`M${cx - 11} ${y + tilt * 4} Q${cx} ${y - 5} ${cx + 11} ${y - tilt * 4}`, 'none', { stroke: P.ink, 'stroke-width': 4.5, 'stroke-linecap': 'round' });
  };
  const mx = tu * 12, my = 38;
  let mouth;
  if (m.v > .1) {
    const wdt = (m.sh === 'e' ? 17 : m.sh === 'o' ? 9 : 13) + m.v * 3, hgt = 3 + m.v * (m.sh === 'o' ? 20 : m.sh === 'e' ? 10 : 18);
    mouth = ell(mx, my + hgt * .3, wdt, hgt, P.ink) + (m.sh !== 'o' && m.v > .35 ? rect(mx - wdt * .7, my + hgt * .3 - hgt + 1, wdt * 1.4, hgt * .35, P.parchment, { rx: 2 }) : '') +
      ell(mx, my + hgt * .9, wdt * .55, hgt * .3, P.skin_shade);
  } else if (p.mouth === 'smile' || p.mouth === 'grin') {
    mouth = p.mouth === 'grin' ? pth(`M${mx - 18} ${my - 3} Q${mx} ${my + 20} ${mx + 18} ${my - 3}Z`, P.ink) + pth(`M${mx - 14} ${my - 1} Q${mx} ${my + 4} ${mx + 14} ${my - 1}Z`, P.parchment)
      : pth(`M${mx - 15} ${my - 2} Q${mx} ${my + 12} ${mx + 15} ${my - 2}`, 'none', { stroke: P.ink, 'stroke-width': 4, 'stroke-linecap': 'round' });
  } else if (p.mouth === 'wow' || p.mouth === 'o') {
    mouth = ell(mx, my + 3, 7, 10, P.ink);
  } else if (p.mouth === 'frown') {
    mouth = pth(`M${mx - 12} ${my + 5} Q${mx} ${my - 4} ${mx + 12} ${my + 5}`, 'none', { stroke: P.ink, 'stroke-width': 4, 'stroke-linecap': 'round' });
  } else if (p.mouth === 'breath') {
    mouth = line(mx - 8, my + 2, mx + 8, my + 2, P.ink, 4) + ell(mx - 26, my - 6, 12, 10, P.skin_shade, { opacity: .5 }) + ell(mx + 26, my - 6, 12, 10, P.skin_shade, { opacity: .5 });
  } else mouth = pth(`M${mx - 10} ${my} Q${mx} ${my + 5} ${mx + 10} ${my}`, 'none', { stroke: P.ink, 'stroke-width': 4, 'stroke-linecap': 'round' });
  return [
    ell(-60 - tu * 6, 6, 12, 17, P.skin), ell(60 - tu * 6, 6, 12, 17, P.skin),
    ell(tu * 4, 0, 63, 69, P.skin),
    pth(`M-62 -18 Q-66 22 -52 30 L-48 -6Z`, P.ink), pth(`M62 -18 Q66 22 52 30 L48 -6Z`, P.ink),
    pth('M-66 -18 Q-64 -80 0 -82 Q64 -80 66 -18Z', P.parchment),
    pth('M-66 -18 Q0 -34 66 -18 L66 -6 Q0 -22 -66 -6Z', P.gold),
    [-40, -14, 12, 38].map(x => circ(x + tu * 4, -52 + Math.abs(x) * .18, 4, P.lapis)).join(''),
    circ(-32 + fx, 26, 11, P.gold_light, { opacity: .3 }), circ(32 + fx, 26, 11, P.gold_light, { opacity: .3 }),
    eye(-22 + fx), eye(22 + fx), brow(-22 + fx, 1), brow(22 + fx, -1),
    pth(`M${fx + 4} 12 Q${fx + 12} 22 ${fx + 2} 25`, 'none', { stroke: P.skin_shade, 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
    mouth,
  ].join('');
}

function faris(o) {
  const p = o.p, s = o.s ?? 1;
  const bob = p.legs === 'walk' ? -5 * Math.abs(Math.cos(p.phase)) : 1.2 * Math.sin(o.t * 2.1);
  const L = legsDraw(p), hip = [p.dx, L.hip[1] + bob];
  const la = p.lean * RAD, rot = (x, y) => [hip[0] + x * Math.cos(la) - y * Math.sin(la), hip[1] + x * Math.sin(la) + y * Math.cos(la)];
  const shA = rot(-FR.sh[0], FR.sh[1]), shB = rot(FR.sh[0], FR.sh[1]);
  const A = armDraw(shA[0], shA[1], { tx: p.hA[0] + p.dx, ty: p.hA[1] + p.dy, bend: p.bendA, kind: p.handA, n: p.nA }, FR.l1, FR.l2, FR.sleeve, P.emerald_deep, P.gold_dim, P.skin_shade, FR.hand);
  const B = armDraw(shB[0], shB[1], { tx: p.hB[0] + p.dx, ty: p.hB[1] + p.dy, bend: p.bendB, kind: p.handB, n: p.nB }, FR.l1, FR.l2, FR.sleeve, P.emerald, P.gold, P.skin, FR.hand);
  const breathe = 1 + .012 * Math.sin(o.t * 2.1);
  const torso = g({ transform: `translate(${R(hip[0])} ${R(hip[1])}) rotate(${R(p.lean)})` },
    rect(-13, -216, 26, 34, P.skin_shade),
    g({ transform: `scale(1 ${breathe.toFixed(4)})` },
      paper('M-56 -196 Q0 -206 56 -196 L72 -110 Q84 -20 86 42 L-86 42 Q-84 -20 -72 -110Z', P.emerald, 5),
      pth('M-78 -84 L78 -84 L80 -60 L-80 -60Z', P.gold), circ(0, -72, 9, P.gold_light),
      pth('M-22 -198 L0 -164 L22 -198', 'none', { stroke: P.gold, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
      line(-60, 38, 60, 38, P.gold_dim, 5)),
    g({ transform: `translate(0 ${R(FR.head + p.nod * .6)}) rotate(${R(p.tilt + p.nod)})` }, farisFace(p, o.t, o)));
  const prop = p.prop ? held(p.prop, (p.propHand === 'A' ? A : B).hx, (p.propHand === 'A' ? A : B).hy, o.t) : '';
  return g({ transform: tf(o.x, o.y, s), 'data-safe': 'faris' }, A.svg, L.svg, torso, B.svg, prop);
}

// ─── الجدّ ────────────────────────────────────────────────────────────
const GR = { sh: [98, -252], head: -350, l1: 104, l2: 100, sleeve: 42, hand: 20 };

function grandpaFace(p, t, o) {
  const tu = p.turn, b = o.blink, m = o.mouth, fx = tu * 12;
  const eye = cx => {
    const cy = 2 + (p.eyes === 'down' ? 3 : 0);
    if (b > .6 || p.eyes === 'closed' || p.eyes === 'happy') return pth(`M${cx - 10} ${cy + 2} Q${cx} ${cy - 7} ${cx + 10} ${cy + 2}`, 'none', { stroke: P.ink, 'stroke-width': 4, 'stroke-linecap': 'round' });
    const ry = (p.eyes === 'wide' ? 10 : 8) * (1 - b);
    return ell(cx + p.look[0] * 3, cy + p.look[1] * 2, 7, Math.max(1.5, ry), P.ink) + (ry > 4 ? circ(cx + p.look[0] * 3 + 2.5, cy - 3, 2.2, P.parchment) : '') +
      pth(`M${cx + 12} ${cy + 4} l7 4 M${cx + 12} ${cy - 2} l8 -2`, 'none', { stroke: P.skin_shade, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
  };
  const brow = (cx, side) => {
    const y = -20 - p.brow * 7, tilt = p.browT * side;
    return pth(`M${cx - 16} ${y + 2 + tilt * 4} Q${cx} ${y - 9} ${cx + 16} ${y + 2 - tilt * 4}`, 'none', { stroke: P.parchment, 'stroke-width': 9, 'stroke-linecap': 'round' });
  };
  const mx = tu * 10, my = 50;
  const open = m.v > .1 ? (m.sh === 'o' ? ell(mx, my, 8 + m.v * 3, 4 + m.v * 14, P.ink) : ell(mx, my, 14 + m.v * 4, 3 + m.v * 13, P.ink)) :
    p.mouth === 'smile' || p.mouth === 'grin' ? pth(`M${mx - 14} ${my - 3} Q${mx} ${my + 9} ${mx + 14} ${my - 3}`, 'none', { stroke: P.ink, 'stroke-width': 4, 'stroke-linecap': 'round' })
      : line(mx - 10, my, mx + 10, my, P.ink, 4);
  return [
    ell(-64 - tu * 6, 8, 13, 20, P.skin), ell(64 - tu * 6, 8, 13, 20, P.skin),
    ell(tu * 4, 2, 66, 78, P.skin),
    pth('M-64 0 Q-74 92 -32 146 Q0 176 32 146 Q74 92 64 0 Q52 30 34 34 Q0 22 -34 34 Q-52 30 -64 0Z', P.parchment, { transform: `translate(${fx * .4} 0)` }),
    pth('M-40 124 Q0 150 40 124 M-50 90 Q-30 104 -36 124 M50 90 Q30 104 36 124', 'none', { stroke: P.parchment_dim, 'stroke-width': 3, transform: `translate(${fx * .4} 0)` }),
    open,
    pth(`M${mx - 36} ${my - 10} Q${mx - 18} ${my - 24} ${mx} ${my - 13} Q${mx + 18} ${my - 24} ${mx + 36} ${my - 10} Q${mx + 18} ${my - 2} ${mx} ${my - 8} Q${mx - 18} ${my - 2} ${mx - 36} ${my - 10}Z`, P.parchment),
    pth(`M${fx + 2} 4 Q${fx + 16} 24 ${fx + 4} 30 Q${fx - 6} 30 ${fx - 8} 26`, P.skin_shade),
    eye(-24 + fx), eye(24 + fx), brow(-24 + fx, 1), brow(24 + fx, -1),
    pth('M-86 -24 Q-96 -104 0 -118 Q96 -104 86 -24 Q0 -52 -86 -24Z', P.parchment),
    pth('M-80 -40 Q-10 -96 70 -84 M-84 -56 Q0 -104 60 -100 M-60 -30 Q20 -80 84 -52', 'none', { stroke: P.parchment_dim, 'stroke-width': 5, 'stroke-linecap': 'round' }),
    ell(0, -108, 30, 15, P.emerald), circ(0, -36, 9, P.gold), circ(0, -36, 4, P.lapis),
  ].join('');
}

function grandpa(o) {
  const p = o.p, s = o.s ?? 1;
  const la = p.lean * RAD, base = [p.dx, p.dy + 1.5 * Math.sin(o.t * 1.7)];
  const rot = (x, y) => [base[0] + x * Math.cos(la) - y * Math.sin(la), base[1] + x * Math.sin(la) + y * Math.cos(la)];
  const shA = rot(-GR.sh[0], GR.sh[1]), shB = rot(GR.sh[0], GR.sh[1]);
  const A = armDraw(shA[0], shA[1], { tx: p.hA[0] + p.dx, ty: p.hA[1] + p.dy, bend: p.bendA, kind: p.handA, n: p.nA }, GR.l1, GR.l2, GR.sleeve, P.lapis_deep, P.emerald_deep, P.skin_shade, GR.hand);
  const B = armDraw(shB[0], shB[1], { tx: p.hB[0] + p.dx, ty: p.hB[1] + p.dy, bend: p.bendB, kind: p.handB, n: p.nB }, GR.l1, GR.l2, GR.sleeve, P.lapis, P.emerald, P.skin, GR.hand);
  const torso = g({ transform: `translate(${R(base[0])} ${R(base[1])}) rotate(${R(p.lean)})` },
    rect(-16, -284, 32, 40, P.skin_shade),
    paper('M-100 -262 Q0 -278 100 -262 L132 -150 Q148 -40 150 60 L-150 60 Q-148 -40 -132 -150Z', P.lapis, 6),
    pth('M-34 -266 L34 -266 L46 60 L-46 60Z', P.parchment),
    pth('M-36 -266 L-52 60 M36 -266 L52 60', 'none', { stroke: P.emerald, 'stroke-width': 12 }),
    pth('M-44 -266 L-60 60 M44 -266 L60 60', 'none', { stroke: P.gold, 'stroke-width': 3 }),
    g({ transform: `translate(0 ${R(GR.head + p.nod * .5)}) rotate(${R(p.tilt + p.nod)})` }, grandpaFace(p, o.t, o)));
  return g({ transform: tf(o.x, o.y, s), 'data-safe': 'grandpa' }, A.svg, torso, B.svg);
}

// ─── ظلال بشرية عامة (المشاهد التاريخية): حبر مفرد، مشي بالدورة نفسها ─────────
function fig(o) {
  const s = o.s ?? 1, col = o.col ?? P.ink, f = o.facing ?? 1, ph = o.ph ?? 0, pose = o.pose ?? 'stand';
  let legs = '', hipY = -70, headY = -150, robe;
  if (pose === 'walk' || pose === 'stand') {
    const a = pose === 'walk' ? 1 : 0;
    for (const k of [0, Math.PI]) {
      const th = 24 * Math.sin(ph + k) * a, kn = 36 * Math.max(0, Math.sin(ph + k + 1.9)) * a;
      const kx = Math.sin(th * RAD) * 36, ky = hipY + Math.cos(th * RAD) * 36;
      legs += poly([[0, hipY], [kx, ky], [kx + Math.sin((th - kn) * RAD) * 36, ky + Math.cos((th - kn) * RAD) * 36]], col, 10);
    }
    robe = 'M-13 -134 Q0 -140 13 -134 L22 -44 L-22 -44Z';
  } else if (pose === 'sit') {
    hipY = -22; headY = -104;
    robe = 'M-12 -88 Q0 -94 12 -88 L36 0 L-36 0Z';
  } else {
    hipY = -30; headY = -112;
    robe = 'M-12 -96 Q0 -102 12 -96 L30 -4 L-24 0Z';
  }
  const bob = pose === 'walk' ? -2.5 * Math.abs(Math.cos(ph)) : 0;
  const sw = pose === 'walk' ? 22 * Math.sin(ph) : 0;
  const shY = headY + 22, it = o.item;
  const reach = it ? [22, shY + 34] : [10 + sw * .5, shY + 58];
  const arm = poly([[0, shY + 4], [8 + sw * .3, shY + 32], reach], col, 8);
  const head = circ(0, headY, 12, col) + (o.head === 'cap' ? ell(0, headY - 9, 11, 6, col) : ell(0, headY - 10, 15, 9, col) + ell(-3, headY - 17, 8, 5, col));
  const item = {
    staff: line(24, shY - 30, 30, 0, col, 5), rod: line(20, shY - 60, 26, 20, col, 4) + line(18, shY - 60, 38, shY - 60, col, 4),
    bundle: ell(-14, shY + 6, 16, 13, col), book: rect(12, shY + 24, 26, 18, P.gold, { rx: 2 }), scroll: rect(10, shY + 26, 30, 10, P.parchment, { rx: 5 }),
    banner: line(22, shY - 90, 22, 0, col, 4) + pth(`M22 ${shY - 90} l40 8 l-8 14 l8 14 l-40 4Z`, o.bannerCol ?? P.gold),
    lamp: g({ transform: `translate(26 ${shY + 30})` }, ell(0, 0, 12, 6, P.gold), circ(0, -12, 5, P.gold_light), circ(0, -12, 22, 'url(#glow_soft)')),
    instrument: line(14, shY + 36, 44, shY + 6, P.gold, 3), board: rect(10, shY + 18, 26, 34, P.wood, { rx: 3 }),
    bread: circ(26, shY + 32, 8, P.gold_dim), pen: line(16, shY + 40, 34, shY + 26, P.gold, 2.5),
  }[it] || '';
  return g({ transform: tf(o.x, o.y + bob * s, s * f, 0, s) + (o.lean ? ` rotate(${o.lean})` : '') }, legs, pth(robe, col), arm, head, item);
}

function horse(o) {
  const s = o.s ?? 1, col = o.col ?? P.ink, f = o.facing ?? 1, ph = o.ph ?? 0, run = o.run ?? 1;
  let legs = '';
  [[34, 0], [26, 1.1], [-34, 2.4], [-42, 3.5]].forEach(([x, k]) => {
    const a = 26 * Math.sin(ph + k) * run, b = 30 * Math.max(0, Math.sin(ph + k + 1.4)) * run;
    const kx = x + Math.sin(a * RAD) * 34, ky = -64 + Math.cos(a * RAD) * 34;
    legs += poly([[x, -74], [kx, ky], [kx + Math.sin((a - b) * RAD) * 36, ky + Math.cos((a - b) * RAD) * 36]], col, 8);
  });
  const nod = 4 * Math.sin(ph * 2) * run;
  const body = ell(0, -92, 58, 24, col) + pth(`M36 -104 L62 ${-150 + nod} L78 ${-146 + nod} L56 -92Z`, col) + ell(84, -140 + nod, 18, 10, col, { transform: `rotate(28 84 ${-140 + nod})` }) +
    pth(`M-56 -98 Q-84 ${-90 + nod * 2} -80 -56`, 'none', { stroke: col, 'stroke-width': 8, 'stroke-linecap': 'round' });
  const rider = o.rider ? fig({ x: -2, y: -86, s: .95, col, pose: 'sit', item: o.item, head: 'turban', bannerCol: o.bannerCol }) : '';
  return g({ transform: tf(o.x, o.y, s * f, 0, s) }, legs, body, rider);
}

function camel(o) {
  const s = o.s ?? 1, col = o.col ?? P.ink, f = o.facing ?? 1, ph = o.ph ?? 0;
  let legs = '';
  [[34, 0], [22, Math.PI], [-30, .9], [-42, Math.PI + .9]].forEach(([x, k]) => {
    const a = 16 * Math.sin(ph + k), kx = x + Math.sin(a * RAD) * 44, ky = -80 + Math.cos(a * RAD) * 44;
    legs += poly([[x, -110], [kx, ky], [kx + Math.sin(a * .3 * RAD) * 44, ky + 44]], col, 7);
  });
  const body = pth('M-54 -104 Q-50 -150 -12 -156 Q6 -186 26 -150 Q52 -140 56 -110 Q60 -92 40 -94 L-44 -92 Q-60 -92 -54 -104Z', col) +
    pth(`M50 -120 Q76 -126 80 -170 L96 -176 Q104 -170 98 -164 L90 -160 Q88 -118 58 -100Z`, col);
  const load = o.load ? rect(-30, -176, 44, 24, o.loadCol ?? P.gold_dim, { rx: 6 }) : '';
  return g({ transform: tf(o.x, o.y, s * f, 0, s) }, legs, body, load);
}

function ship(o) {
  const s = o.s ?? 1, rock = 2.5 * Math.sin((o.t ?? 0) * 1.6 + (o.x || 0) * .01), f = o.facing ?? 1;
  const hull = o.hull ?? P.wood, sail = o.sail ?? P.parchment;
  return g({ transform: tf(o.x, o.y, s * f, rock, s) },
    paper('M-120 -6 L120 -6 Q108 30 80 40 L-86 40 Q-112 28 -120 -6Z', hull, 5),
    line(-110, 4, 110, 4, P.gold_dim, 4), line(0, -6, 0, -210, P.wood_dark, 7),
    paper('M-6 -206 Q84 -140 94 -24 L-6 -24Z', sail, 4), paper('M-10 -150 Q-60 -110 -70 -30 L-10 -30Z', sail, 4, { opacity: .92 }),
    line(-6, -206, 110, -60, P.wood_dark, 4));
}
