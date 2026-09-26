'use strict';
// نواة العارض: ألوان النظام فقط، أدوات SVG نصّية، عشوائية مبذورة، كاميرا بطبقات بارالاكس. كل شيء دالة نقية في الزمن t
const PL = window.PLAN, P = PL.palette, W = PL.w, H = PL.h, FPS = PL.fps;
const [FX, FY] = PL.focus, DEPTH = PL.parallax, SAFE = PL.safe;
const TAU = Math.PI * 2, RAD = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  io: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  out: u => 1 - Math.pow(1 - u, 3),
  in: u => u * u * u,
  sine: u => .5 - .5 * Math.cos(Math.PI * u),
  back: u => { const c = 1.9, d = c + 1; return 1 + d * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
};
// نبضة ذهاب وإياب ناعمة داخل [a,b]
const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));

function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hash(seed);
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function noise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  const h = n => { const v = Math.sin((n + seed * 57.131) * 127.1 + seed) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
  return lerp(h(i), h(i + 1), u);
}

const R = v => Math.round(v * 100) / 100;
function at(o) {
  let s = '';
  for (const k in o) { const v = o[k]; if (v === undefined || v === null || v === false) continue; s += ` ${k}="${typeof v === 'number' ? R(v) : v}"`; }
  return s;
}
const g = (o, ...k) => `<g${at(o)}>${k.join('')}</g>`;
const el = (tag, o) => `<${tag}${at(o)}/>`;
const pth = (d, fill, o = {}) => el('path', { d, fill, ...o });
const circ = (cx, cy, r, fill, o = {}) => el('circle', { cx, cy, r, fill, ...o });
const ell = (cx, cy, rx, ry, fill, o = {}) => el('ellipse', { cx, cy, rx, ry, fill, ...o });
const rect = (x, y, w, h, fill, o = {}) => el('rect', { x, y, width: w, height: h, fill, ...o });
const line = (x1, y1, x2, y2, stroke, w, o = {}) => el('line', { x1, y1, x2, y2, stroke, 'stroke-width': w, 'stroke-linecap': 'round', ...o });
const poly = (pts, stroke, w, o = {}) => pth('M' + pts.map(p => `${R(p[0])} ${R(p[1])}`).join(' L'), 'none', { stroke, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...o });
const txt = (x, y, s, o = {}) => `<text${at({ x, y, 'text-anchor': 'middle', direction: 'rtl', ...o })}>${s}</text>`;
const tf = (x = 0, y = 0, s = 1, r = 0, sy) => `translate(${R(x)} ${R(y)})` + (r ? ` rotate(${R(r)})` : '') +
  (s !== 1 || (sy !== undefined && sy !== s) ? ` scale(${+s.toFixed(4)} ${+(sy ?? s).toFixed(4)})` : '');
const pts = a => a.map((p, i) => (i ? 'L' : 'M') + R(p[0]) + ' ' + R(p[1])).join('') + 'Z';
// ظلّ ورقي مزدوج للشكل الواحد
const paper = (d, fill, dy = 6, o = {}) => pth(d, P.paper_shadow, { transform: `translate(0 ${dy})`, opacity: .28 }) + pth(d, fill, o);

const memo = new Map();
const once = (key, fn) => { if (!memo.has(key)) memo.set(key, fn()); return memo.get(key); };
// المجموعات الثابتة الثقيلة تُرسم مرة واحدة إلى صورة نقطية وتُستعمل كصورة في كل إطار
const BAKED = new Map(), BAKE = new Map();
function baked(key, box, fn, sc = 1) {
  BAKE.set(key, [box, fn, sc]);
  const url = BAKED.get(key);
  return url ? `<image href="${url}" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" preserveAspectRatio="none"/>` : once(key, fn);
}
async function bakeAll() {
  for (const [key, [box, fn, sc]] of BAKE) {
    const [x, y, w, h] = box, cw = Math.round(w * sc), ch = Math.round(h * sc);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="${x} ${y} ${w} ${h}">${defs()}${fn()}</svg>`;
    const img = new Image();
    img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await img.decode();
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    c.getContext('2d').drawImage(img, 0, 0, cw, ch);
    BAKED.set(key, URL.createObjectURL(await new Promise(r => c.toBlob(r, 'image/png'))));
  }
}

// خط أفق متموّج عبر الإطار مع هامش للبارالاكس
function ridge(y, amp, seed, freq = 1, x0 = -420, x1 = W + 420, bottom = H + 400) {
  const r = rng(seed), n = 26, ph = [r() * TAU, r() * TAU, r() * TAU];
  let d = `M${x0} ${bottom}`;
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n), u = x / W * freq;
    d += `L${R(x)} ${R(y - amp * (.55 * Math.sin(u * 5.1 + ph[0]) + .3 * Math.sin(u * 11.3 + ph[1]) + .15 * Math.sin(u * 23 + ph[2])))}`;
  }
  return d + `L${x1} ${bottom}Z`;
}

// كاميرا: بؤرة الشاشة F، الطبقة k تتحرّك وتكبر بنسبة k من حركة الكاميرا
function layerT(c, k) {
  const s = 1 + (c.z - 1) * k, ox = (c.x - FX) * k, oy = (c.y - FY) * k;
  return `translate(${R(FX)} ${R(FY)}) scale(${+s.toFixed(4)}) translate(${R(-FX - ox)} ${R(-FY - oy)})`;
}
function layers(c, L, shadow = true) {
  return L.map((content, i) => content ? g({ transform: layerT(c, DEPTH[i]), filter: shadow && i ? `url(#fp${i})` : null }, content) : '').join('');
}
const CAM0 = { x: FX, y: FY, z: 1 };

// التعريفات الثابتة: تدرّجات السماء والتوهّج والظلال الورقية — من ألوان النظام وحدها
function defs() {
  const lg = (id, stops, o = {}) => `<linearGradient id="${id}"${at({ x1: 0, y1: 0, x2: 0, y2: 1, ...o })}>` +
    stops.map(([off, c, op = 1]) => `<stop offset="${off}" stop-color="${c}" stop-opacity="${op}"/>`).join('') + '</linearGradient>';
  const rg = (id, stops, o = {}) => `<radialGradient id="${id}"${at(o)}>` +
    stops.map(([off, c, op = 1]) => `<stop offset="${off}" stop-color="${c}" stop-opacity="${op}"/>`).join('') + '</radialGradient>';
  const shadows = [4, 7, 11].map((dy, i) => `<filter id="fp${i + 1}" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="${dy}" stdDeviation="0" flood-color="${P.paper_shadow}" flood-opacity="${.3 + i * .06}"/></filter>`).join('');
  return '<defs>' + [
    lg('sky_dawn', [[0, P.lapis_deep], [.45, P.lapis], [.78, P.gold_dim], [1, P.gold_light]]),
    lg('sky_day', [[0, P.lapis], [.5, P.lapis_light], [.85, P.lapis_mist], [1, P.parchment]]),
    lg('sky_dusk', [[0, P.lapis_deep], [.5, P.lapis], [.82, P.gold_dim], [1, P.gold]]),
    lg('sky_night', [[0, P.ink], [.6, P.lapis_deep], [1, P.lapis]]),
    lg('sky_dark', [[0, P.ink], [1, P.lapis_deep]]),
    lg('sky_gold', [[0, P.lapis_deep], [.55, P.gold_dim], [.8, P.gold], [1, P.gold_light]]),
    lg('sea', [[0, P.lapis_light], [.4, P.lapis], [1, P.lapis_deep]]),
    lg('parch', [[0, P.parchment], [1, P.parchment_dim]]),
    lg('goldm', [[0, P.gold_light], [.5, P.gold], [1, P.gold_dim]], { x2: 1, y2: 1 }),
    lg('wall', [[0, P.ink], [.5, P.lapis_deep], [1, P.ink]]),
    lg('wood', [[0, P.wood], [1, P.wood_dark]]),
    lg('beam', [[0, P.gold_light, .85], [1, P.gold_light, 0]], { x2: 1, y2: 0 }),
    lg('fold_l', [[0, P.ink, .45], [1, P.ink, 0]], { x2: 1, y2: 0 }),
    lg('fold_r', [[0, P.ink, 0], [1, P.ink, .45]], { x2: 1, y2: 0 }),
    lg('fold_t', [[0, P.ink, .45], [1, P.ink, 0]]),
    lg('fade_b', [[0, P.ink, 0], [1, P.ink, .85]]),
    rg('glow', [[0, P.gold_light, .9], [.35, P.gold, .35], [1, P.gold, 0]]),
    rg('glow_soft', [[0, P.gold_light, .45], [1, P.gold_light, 0]]),
    rg('vignette', [[.55, P.ink, 0], [1, P.ink, .7]], { cx: .45, cy: .42, r: .75 }),
    `<pattern id="geo" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M24 4 L30 18 L44 24 L30 30 L24 44 L18 30 L4 24 L18 18Z" fill="none" stroke="${P.gold_dim}" stroke-width="2"/></pattern>`,
    `<pattern id="hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="16" height="16" fill="${P.lapis_mist}"/><rect width="3" height="16" fill="${P.lapis_light}" opacity=".5"/></pattern>`,
    shadows,
  ].join('') + '</defs>';
}
