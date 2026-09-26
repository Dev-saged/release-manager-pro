'use strict';
// الجزيئات والانتقالات: غبار في ضوء السراج، رمل تحمله الريح، شرر الشموع؛ وتوقيع السلسلة: صفحة الكتاب تنفتح طيّتين إلى المشهد

function dust(t, cx, cy, rx, ry, n, seed, col = P.gold_light) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const bx = r(), by = r(), sp = .3 + r() * .7, ph = r() * TAU, size = 1.4 + r() * 3.2;
    const x = cx + (bx * 2 - 1) * rx + 26 * noise(t * .25 * sp + i, 1), y = cy - ry + (((by * 2 * ry - t * 9 * sp) % (2 * ry)) + 2 * ry) % (2 * ry);
    const fall = 1 - Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (fall <= 0) continue;
    s += circ(x, y, size, col, { opacity: R(clamp(fall * 1.6) * (.35 + .45 * (.5 + .5 * Math.sin(t * 2.2 * sp + ph)))) });
  }
  return s;
}
function sand(t, n, seed, y0 = 900, y1 = 1500, strength = 1) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const bx = r(), by = r(), sp = 380 + r() * 520, len = 18 + r() * 50;
    const x = ((bx * 1800 - t * sp * strength) % 1800 + 1800) % 1800 - 360, y = y0 + by * (y1 - y0) + 12 * Math.sin(t * 3 + i);
    s += line(x, y, x + len, y - len * .08, i % 3 ? P.gold_light : P.parchment, 1.5 + r() * 2, { opacity: R(.2 + r() * .45) });
  }
  return s;
}
function embers(x, y, t, n, seed, h = 180) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const sp = .35 + r() * .5, off = r(), k = ((t * sp + off) % 1 + 1) % 1;
    s += circ(x + 22 * Math.sin(k * 7 + i * 2) * k, y - k * h, 1.5 + 2.5 * (1 - k), k < .5 ? P.gold_light : P.gold, { opacity: R((1 - k) * .9) });
  }
  return s;
}

// ─── الانتقالات ───────────────────────────────────────────────────────
// الصفحة تُرفع من الكتاب، ثم تنفتح طيّةً أفقية فعمودية حتى تملأ الإطار بالمشهد الجديد
function tUnfold(outS, inS, u, ax, ay) {
  const e0 = E.in(seg(u, 0, .42)), z = 1 + 1.1 * e0;
  let s = g({ transform: `translate(${R(ax)} ${R(ay)}) scale(${z.toFixed(4)}) translate(${R(-ax)} ${R(-ay)})` }, outS) + rect(0, 0, W, H, P.ink, { opacity: R(.82 * seg(u, .18, .45)) });
  if (u < .06) return s;
  const lift = seg(u, .06, .34), flipW = 150 * Math.cos(Math.PI * E.io(lift));
  if (u < .34) s += pth(`M${R(ax)} ${R(ay - 40 * z)} L${R(ax + flipW * z)} ${R(ay - 46 * z)} L${R(ax + flipW * z * 1.05)} ${R(ay + 44 * z)} L${R(ax)} ${R(ay + 50 * z)}Z`, P.parchment) +
    pth(`M${R(ax)} ${R(ay - 40 * z)} L${R(ax + flipW * z)} ${R(ay - 46 * z)} L${R(ax + flipW * z * 1.05)} ${R(ay + 44 * z)} L${R(ax)} ${R(ay + 50 * z)}Z`, `url(#fold_${flipW < 0 ? 'l' : 'r'})`);
  if (u < .3) return s;
  const e1 = E.io(seg(u, .32, .66)), e2 = E.io(seg(u, .6, .96)), grow = E.io(seg(u, .3, .96));
  const c1 = Math.cos(Math.PI * (1 - e1)), c2 = Math.cos(Math.PI * (1 - e2));
  const xR = W / 2 + W / 2 * Math.max(0, c1), yB = H / 2 + H / 2 * Math.max(0, c2);
  const px = lerp(W / 4, W / 2, grow), py = lerp(H / 4, H / 2, grow), cx = lerp(ax, W / 2, grow), cy = lerp(ay, H / 2, grow), sc = lerp(.34, 1, grow);
  let sheet = `<clipPath id="ufc"><rect x="0" y="0" width="${R(xR)}" height="${R(yB)}"/></clipPath>` +
    rect(0, 14, xR, yB, P.paper_shadow, { opacity: .45 }) + g({ 'clip-path': 'url(#ufc)' }, inS);
  if (c1 <= 0) sheet += rect(W / 2 + W / 2 * c1, 0, -W / 2 * c1, H / 2, P.parchment) + rect(W / 2 + W / 2 * c1, 0, -W / 2 * c1, H / 2, 'url(#fold_r)') + textLines(W / 2 + W / 2 * c1 + 40, W / 2 - 40, 120, 18, P.ink_soft, 1, 44);
  else if (e1 < 1) sheet += rect(W / 2, 0, W / 2 * c1, yB, 'url(#fold_l)', { opacity: R(1 - c1) });
  if (c2 > 0 && e2 < 1) sheet += rect(0, H / 2, W, H / 2 * c2, 'url(#fold_t)', { opacity: R(1 - c2) });
  if (u < .97) sheet += line(W / 2, 0, W / 2, yB, P.parchment_dim, 3, { opacity: R(1 - grow) }) + line(0, H / 2, xR, H / 2, P.parchment_dim, 3, { opacity: R(1 - grow) }) +
    rect(0, 0, xR, yB, 'none', { stroke: P.gold, 'stroke-width': R(10 / sc), opacity: R(1 - seg(u, .85, .97)) });
  return s + g({ transform: `translate(${R(cx)} ${R(cy)}) scale(${sc.toFixed(4)}) translate(${R(-px)} ${R(-py)})` }, sheet);
}
// المشهد يُطوى عائداً إلى الكتاب
function tFold(outS, inS, u, ax, ay) {
  const e = E.io(u), z = lerp(1.5, 1, E.out(u));
  return g({ transform: `translate(${R(ax)} ${R(ay)}) scale(${z.toFixed(4)}) translate(${R(-ax)} ${R(-ay)})` }, inS) +
    g({ transform: `translate(${R(lerp(W / 2, ax, e))} ${R(lerp(H / 2, ay, e))}) scale(${lerp(1, .2, e).toFixed(4)} ${lerp(1, .02, E.in(u)).toFixed(4)}) translate(${-W / 2} ${-H / 2})`, opacity: R(1 - seg(u, .65, 1)) },
      outS, rect(0, 0, W, H, 'url(#fold_t)', { opacity: R(e) }));
}
// قلب الصفحة من اليسار إلى اليمين كما في الكتاب العربي
function tTurn(outS, inS, u) {
  const e = E.io(u), x = lerp(-80, W + 80, e), w = 170 * Math.sin(Math.PI * e);
  return outS + `<clipPath id="ttc"><rect x="0" y="0" width="${R(Math.max(0, x))}" height="${H}"/></clipPath>` + g({ 'clip-path': 'url(#ttc)' }, inS) +
    rect(x - 90, 0, 90, H, 'url(#fold_r)', { opacity: .7 }) +
    pth(`M${R(x)} 0 Q${R(x + w * .8)} ${H * .3} ${R(x + w)} ${H / 2} Q${R(x + w * .8)} ${H * .7} ${R(x)} ${H}Z`, P.parchment) +
    pth(`M${R(x)} 0 Q${R(x + w * .8)} ${H * .3} ${R(x + w)} ${H / 2} Q${R(x + w * .8)} ${H * .7} ${R(x)} ${H}Z`, 'url(#fold_l)', { opacity: .8 });
}
function tMedallion(outS, inS, u) {
  const e = E.io(u), r = 1400 * e;
  return outS + `<clipPath id="tmc"><circle cx="${FX}" cy="${FY}" r="${R(r)}"/></clipPath>` + g({ 'clip-path': 'url(#tmc)' }, inS) +
    circ(FX, FY, r, 'none', { stroke: P.gold, 'stroke-width': 18, opacity: R(1 - seg(u, .8, 1)) }) +
    g({ transform: tf(FX, FY, 3 + 4 * e, 90 * e), opacity: R(1 - e) }, pth('M0 -40 L12 -12 L40 0 L12 12 L0 40 L-12 12 L-40 0 L-12 -12Z', P.gold));
}
const tFade = (outS, inS, u) => outS + g({ opacity: R(E.io(u)) }, inS);
