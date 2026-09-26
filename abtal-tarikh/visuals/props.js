'use strict';
// الأغراض: الكتاب، علامة الاستفهام، لقطات الأشياء، وشعارات الدروس داخل الإطار المذهّب

const QPATH = 'M110 -120 C110 -236 -112 -236 -112 -112 C-112 -34 0 -46 0 40 L0 92';
const QLEN = 640;
// علامة استفهام عربية ورقية مرسومة بالخطّ
function qmark(x, y, s, u = 1, o = {}) {
  const dash = { 'stroke-dasharray': QLEN, 'stroke-dashoffset': R(QLEN * (1 - u)) };
  return g({ transform: tf(x, y, s * (o.sx ?? 1), o.rot ?? 0, s) },
    pth(QPATH, 'none', { stroke: P.paper_shadow, 'stroke-width': 50, 'stroke-linecap': 'round', opacity: .35, transform: 'translate(0 10)', ...dash }),
    pth(QPATH, 'none', { stroke: o.col ?? 'url(#goldm)', 'stroke-width': 46, 'stroke-linecap': 'round', ...dash }),
    pth(QPATH, 'none', { stroke: P.gold_light, 'stroke-width': 8, 'stroke-linecap': 'round', opacity: .6, transform: 'translate(-8 -6)', ...dash }),
    u > .95 ? circ(0, 170, 26 * E.back(seg(u, .95, 1)), o.col ?? 'url(#goldm)') : '');
}
// نقاط على مسار علامة الاستفهام لتجميع الأشكال فوقها
function qPoint(k) {
  const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; };
  if (k < .45) return bez([110, -120], [110, -236], [-112, -236], [-112, -112], k / .45);
  if (k < .8) return bez([-112, -112], [-112, -34], [0, -46], [0, 40], (k - .45) / .35);
  if (k < .95) return [0, 40 + 52 * (k - .8) / .15];
  return [0, 170];
}

// نصّ ذهبي يُحبَّر من اليمين إلى اليسار
function inkText(x, y, str, size, u, o = {}) {
  const w = size * .85 * [...str].length + 120, id = 'ink' + hash(str + x + y) % 100000;
  const body = txt(x, y + 4, str, { 'font-family': 'Reem Kufi', 'font-weight': 700, 'font-size': size, fill: P.paper_shadow, opacity: .3 }) +
    txt(x, y, str, { 'font-family': 'Reem Kufi', 'font-weight': 700, 'font-size': size, fill: o.col ?? P.gold });
  if (u >= 1) return body;
  return `<clipPath id="${id}"><rect x="${R(x + w / 2 - w * u)}" y="${R(y - size * 1.2)}" width="${R(w * u + 2)}" height="${R(size * 1.8)}"/></clipPath>` + g({ 'clip-path': `url(#${id})` }, body);
}
const label = (x, y, str, size = 30, col = P.ink) => txt(x, y, str, { 'font-family': 'Readex Pro', 'font-weight': 500, 'font-size': size, fill: col });

// ─── الكتاب على المكتب ─────────────────────────────────────────────────
function textLines(x0, x1, y0, n, col, u = 1, gap = 16) {
  let s = '';
  for (let i = 0; i < n; i++) if (i / n < u) s += line(x0, y0 + i * gap, x0 + (x1 - x0) * (i % 4 === 3 ? .6 : 1), y0 + i * gap, col, 3, { opacity: .55 });
  return s;
}
function book(bx, by, o = {}) {
  const w = 165, open = o.open ?? 1, flip = o.flip ?? -1, rot = o.rot ?? 0;
  let s = '';
  if (open <= 0) {
    s = g({ transform: `translate(${R(bx)} ${R(by)}) rotate(${R(rot)})` },
      pth('M-128 30 L128 30 L112 -42 L-112 -42Z', P.parchment_dim, { transform: 'translate(0 16)' }),
      paper('M-130 30 L130 30 L114 -44 L-114 -44Z', P.wood, 6), pth('M-114 22 L114 22 L100 -36 L-100 -36Z', 'none', { stroke: P.gold, 'stroke-width': 4 }),
      pth('M0 -22 L20 -4 L0 14 L-20 -4Z', P.gold), [[-106, 22], [106, 22], [-94, -36], [94, -36]].map(([a, b]) => circ(a, b, 7, P.gold)).join(''),
      o.glint ? rect(-130 + 260 * o.glint - 30, -44, 60, 76, 'url(#glow_soft)', { opacity: bump(o.glint, 0, 1) }) + line(-120 + 240 * o.glint, 30, -110 + 240 * o.glint, -42, P.gold_light, 6, { opacity: bump(o.glint, 0, 1) }) : '');
    return s;
  }
  const page = side => `M0 ${-46} Q${side * w * .5} ${-60} ${side * w} ${-50} L${side * (w + 12)} 48 Q${side * w * .5} 38 0 54Z`;
  s += pth(`M${-w - 22} 58 L${w + 22} 58 L${w + 8} -58 L${-w - 8} -58Z`, P.wood);
  s += paper(page(-1), P.parchment, 4) + paper(page(1), P.parchment_dim, 4);
  if (o.pages === 'blank') s += rect(-w, -60, 2 * w, 110, 'url(#glow_soft)', { opacity: .4 + .6 * (o.glow ?? 0) });
  else if (o.pages === 'drawings') s += [-120, -60, 40, 110].map((x, i) => line(x, -30, x + 30, 30, P.gold, 3, { opacity: seg(o.u ?? 1, i * .2, i * .2 + .3) })).join('');
  else if (!o.mini) s += textLines(-w + 20, -24, -30, 5, P.ink_soft) + textLines(24, w - 20, -30, 5, P.ink_soft) + pth('M-130 -44 L-40 -44', 'none', { stroke: P.gold, 'stroke-width': 5 });
  s += line(0, -46, 0, 54, P.gold_dim, 3);
  if (open < 1) {
    const cw = w * Math.cos(Math.PI * open) * flip;
    s += pth(`M0 -58 L${R(cw)} -58 L${R(cw * 1.05)} 58 L0 58Z`, open < .5 ? P.wood : P.parchment_dim) + pth(`M0 -58 L${R(cw)} -58 L${R(cw * 1.05)} 58 L0 58Z`, `url(#fold_${cw < 0 ? 'l' : 'r'})`);
  }
  if (o.turn !== undefined && o.turn > 0 && o.turn < 1) {
    const pw = w * Math.cos(Math.PI * o.turn) * (o.turnDir ?? -1);
    s += pth(`M0 -48 Q${R(pw * .5)} ${R(-60 - 30 * Math.sin(Math.PI * o.turn))} ${R(pw)} -50 L${R(pw * 1.05)} 48 Q${R(pw * .5)} 36 0 52Z`, P.parchment) +
      pth(`M0 -48 L${R(pw)} -50 L${R(pw * 1.05)} 48 L0 52Z`, `url(#fold_${pw < 0 ? 'l' : 'r'})`, { opacity: .6 });
  }
  if (o.glint) s += line(0, -46, 0, 54, P.gold_light, 8, { opacity: bump(o.glint, 0, 1) }) + circ(0, lerp(-46, 54, o.glint), 40, 'url(#glow_soft)');
  return g({ transform: `translate(${R(bx)} ${R(by)}) rotate(${R(rot)})` }, s) + (o.mini ? g({ transform: `translate(${R(bx)} ${R(by - 50)})` }, o.mini) : '');
}

// ─── خطّافات البداية: أشكال ذهبية تتجمّع في علامة استفهام ─────────────────
function hookMotif(m, lt, dur, t) {
  const cx = 475, cy = 700, u = E.io(seg(lt, .2, Math.min(dur - .3, 2.4)));
  const q = (uu, o) => qmark(cx, cy, 1, uu, o);
  const spin = (lt2) => ({ sx: Math.cos(Math.PI * 2 * E.out(seg(lt2, 0, 1.6))) });
  switch (m) {
    case 'digits': return ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'].map((d, i) => { const [px, py] = qPoint(i / 9.5), a = i * .63 + lt * 2 * (1 - u);
      const x = lerp(cx + Math.cos(a) * 320, cx + px, u), y = lerp(cy + Math.sin(a) * 320, cy + py, u);
      return txt(x, y + 22, d, { 'font-family': 'Reem Kufi', 'font-weight': 700, 'font-size': 70, fill: P.gold, opacity: 1 - seg(u, .85, 1) }); }).join('') + q(seg(u, .6, 1));
    case 'slip': return g({ transform: tf(cx, cy, 1 - seg(u, .5, .8), 0, E.back(seg(lt, 0, .8)) * (1 - seg(u, .5, .8))) }, paper('M-170 -110 L170 -110 L170 110 L-170 110Z', P.parchment), textLines(-130, 130, -60, 6, P.lapis, 1, 24)) + q(seg(u, .55, 1));
    case 'instruments': return [...Array(9)].map((_, i) => { const [px, py] = qPoint(i / 8.4), r = rng('ins' + i), sx = cx + (r() - .5) * 700, sy = cy + (r() - .5) * 700;
      const x = lerp(sx, cx + px, u), y = lerp(sy, cy + py, u), a = lerp(r() * 360, 40 + i * 15, u);
      return g({ transform: tf(x, y, 1, a) }, line(-40, 0, 40, 0, P.gold, 6), circ(-40, 0, 8, 'none', { stroke: P.gold, 'stroke-width': 4 }), line(30, -8, 44, 0, P.gold, 4)); }).join('') + q(seg(u, .8, 1), { col: P.gold_dim });
    case 'eyes': { const op = E.out(seg(lt, .2, 1)), b = blinkAt(t + 1.3, 'hook');
      const eye = x => g({ transform: tf(x, cy - 40) }, pth('M-110 0 Q0 -90 110 0 Q0 90 -110 0Z', P.parchment), circ(0, 0, 44 * op, P.lapis), circ(0, 0, 22 * op, P.ink), circ(12, -14, 8 * op, P.parchment),
        pth(`M-112 0 Q0 ${R(-90 + 180 * (1 - op) + 170 * b)} 112 0 Q0 -96 -112 0Z`, P.lapis_deep));
      return eye(cx - 200) + eye(cx + 200) + qmark(cx, cy + 40, .55, seg(lt, .8, 1.8)); }
    case 'book': return g({ transform: tf(cx, cy + 60, 1) }, paper('M-170 -260 L170 -260 L170 260 L-170 260Z', P.wood, 10), rect(150, -250, 26, 500, P.parchment_dim), rect(-146, -236, 292, 472, 'none', { stroke: P.gold, 'stroke-width': 6 }),
      circ(0, 0, 260, 'url(#glow_soft)', { opacity: u })) + qmark(cx, cy + 40, .62, u);
    case 'olive': { const d = QPATH, uu = u;
      let leaves = ''; for (let i = 0; i < 12; i++) { if (i / 12 > uu) break; const [px, py] = qPoint(i / 12.5); leaves += ell(cx + px + (i % 2 ? 22 : -22), cy + py, 22, 9, P.emerald_light, { transform: `rotate(${i % 2 ? 30 : -30} ${cx + px} ${cy + py})` }); }
      return g({ transform: tf(cx, cy) }, pth(d, 'none', { stroke: P.emerald, 'stroke-width': 16, 'stroke-linecap': 'round', 'stroke-dasharray': QLEN, 'stroke-dashoffset': R(QLEN * (1 - uu)) })) + leaves + (uu > .95 ? circ(cx, cy + 170, 20, P.gold) : ''); }
    case 'route': { let s = '', n = 40; for (let i = 0; i < n; i++) { const k = i / n; if (k > u) break; const a = k * TAU * 1.3, r0 = 360 * (1 - k);
      const loop = [cx + Math.cos(a) * r0 * .9, cy + Math.sin(a) * r0 * .6 + 200 * (1 - k)], [qx, qy] = qPoint(seg(k, .55, 1));
      const x = k < .55 ? loop[0] : cx + qx, y = k < .55 ? loop[1] : cy + qy; s += circ(x, y, 9, P.gold); }
      return s + (u > .96 ? circ(cx, cy + 170, 22, P.gold) : ''); }
    case 'ship': { const hill = `M-200 1100 Q200 1080 ${cx - 100} ${cy + 200} Q${cx + 40} ${cy + 20} ${cx + 110} ${cy - 120}`;
      const k = E.io(seg(lt, .2, 2)), [px, py] = qPoint(k * .45), x = lerp(-50, cx + px, k), y = lerp(1000, cy + py, k);
      return pth(`M-400 1400 L-400 1000 Q100 980 ${cx - 120} ${cy + 220} Q${cx + 80} ${cy - 40} ${cx + 180} ${cy - 160} L1400 1400Z`, P.emerald_deep, { opacity: .8 }) + qmark(cx, cy, 1, seg(lt, 1.2, 2.6), { col: P.gold_dim }) +
        g({ transform: tf(x, y - 20, .45, lerp(-20, -40, k)) }, ship({ x: 0, y: 0, t, sail: P.gold })); }
    case 'lamp': return pth(`M${cx - 380} ${cy + 300} Q${cx - 150} ${cy + 280} ${cx - 112} ${cy - 112} Q${cx - 112} ${cy - 236} ${cx + 110} ${cy - 236}`, 'none', { stroke: P.gold_dim, 'stroke-width': 40, 'stroke-linecap': 'round', 'stroke-dasharray': 1200, 'stroke-dashoffset': R(1200 * (1 - u)) }) +
      lampDesk(cx, cy + 150, t, E.out(seg(lt, .8, 1.8)) + .05, .6);
    default: return g({ transform: tf(cx, cy) }, g({ transform: `scale(${R(spin(lt).sx)} 1)` }, qmark(0, 0, 1, 1)));
  }
}

// ─── لقطات الأشياء: [خلفية، بعيد، رئيسي، قريب] ───────────────────────────
const DESKBG = () => baked('objbg', [-400, -400, W + 800, H + 800], () => rect(-400, -400, W + 800, H + 800, 'url(#wood)') + rect(-400, -400, W + 800, H + 800, 'url(#geo)', { opacity: .12 }));
function pageSheet(x, y, w, h, o = {}) {
  return paper(`M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h}Z`, P.parchment, 10) + rect(x + 24, y + 24, w - 48, h - 48, 'none', { stroke: P.gold, 'stroke-width': 4 }) +
    rect(x + 34, y + 34, w - 68, h - 68, 'none', { stroke: P.gold_dim, 'stroke-width': 2 }) + (o.lines === false ? '' : textLines(x + 70, x + w - 70, y + (o.top ?? 150), o.n ?? 14, P.ink_soft, o.u ?? 1, 34));
}
function obj(name, lt, dur, t) {
  const u = E.io(seg(lt, .2, Math.max(.8, dur - .6))), cx = 475;
  const glow = circ(cx, 700, 700, 'url(#glow_soft)', { opacity: .6 });
  const ring = (x, y, lit, grey) => circ(x, y, 34, 'none', { stroke: grey ? P.ink_soft : lit ? P.gold_light : P.gold_dim, 'stroke-width': 12 }) + (lit ? circ(x, y, 60, 'url(#glow_soft)') : '') + line(x - 10, y, x + 10, y, grey ? P.ink_soft : P.lapis, 3);
  switch (name) {
    case 'rock': return [sky('dawn', t, { sunX: 250 }), sea(1050, t), paper('M120 1300 L220 700 Q300 420 460 380 Q620 420 720 640 L900 1300Z', P.gold_dim, 12) + pth('M220 700 Q300 420 460 380 L420 700Z', P.gold, { opacity: .6 }),
      inkText(475, 300, 'جبل طارق', 120, u) + sea(1300, t + 2, { y1: H + 400 })];
    case 'margin_q': return [DESKBG(), glow, pageSheet(110, 260, 760, 1060, { lines: true }) + rect(150, 300, 170, 980, P.parchment_dim, { opacity: .5 }), qmark(235, 720, .45, u)];
    case 'desk_ship': return [DESKBG(), glow, book(620, 900, { open: 0, rot: -8 }), g({ transform: tf(330, 980, 1.3) }, ship({ x: 0, y: 0, t: 0, sail: P.parchment, hull: P.parchment_dim })) + lampDesk(820, 700, t, 1, .6)];
    case 'title_lift': { const lift = E.back(seg(lt, 1.2, 2.4));
      return [DESKBG(), glow, pageSheet(110, 260, 760, 1060, { top: 520, n: 10 }) + inkText(490, 420, 'كتاب الجبر والمقابلة', 64, seg(lt, .2, 1.2)),
        g({ transform: tf(490, 620 - 180 * lift, 1 + .4 * lift) }, txt(0, R(12 + 30 * lift), 'الجبر', { 'font-family': 'Reem Kufi', 'font-weight': 700, 'font-size': 110, fill: P.paper_shadow, opacity: R(.35 * lift) }), txt(0, 0, 'الجبر', { 'font-family': 'Reem Kufi', 'font-weight': 700, 'font-size': 110, fill: P.gold }))]; }
    case 'tiles': { let s = ''; for (let i = 0; i < 6; i++) { const k = seg(lt, .2 + i * .35, .5 + i * .35), x = 190 + i * 110, y = 1150 - i * 110;
      s += g({ transform: tf(x, lerp(1500, y, E.back(k))) }, paper('M-50 -50 L50 -50 L50 50 L-50 50Z', k > .9 ? P.gold : P.parchment, 8), txt(0, 26, ['١', '٢', '٣', '٤', '٥', '٦'][i], { 'font-family': 'Reem Kufi', 'font-size': 70, fill: P.lapis })); }
      return [DESKBG(), glow, '', s]; }
    case 'recipe': { const k = E.io(seg(lt, .8, 2.2));
      return [DESKBG(), glow, g({ transform: tf(330, 760, 1, -6 * (1 - k)) }, paper('M-200 -300 L200 -300 L200 300 L-200 300Z', P.parchment, 10), ['١', '٢', '٣', '٤', '٥'].map((d, i) => txt(150, -180 + i * 100, d, { 'font-family': 'Reem Kufi', 'font-size': 56, fill: P.gold, opacity: seg(lt, .8 + i * .3, 1.1 + i * .3) }) + line(-150, -196 + i * 100, 100 * (1 - .3 * (i % 2)), -196 + i * 100, P.lapis, 6, { opacity: .6 })).join('')),
        g({ transform: tf(720, 900) }, paper('M-130 -100 L130 -100 L130 70 L-130 70Z', P.ink_soft, 8), rect(-112, -84, 224, 136, P.lapis, { rx: 6 }), textLines(-80, 80, -50, 4, P.gold_light, seg(lt, 1.5, 3), 26), pth('M-170 70 L170 70 L150 100 L-150 100Z', P.parchment_dim))]; }
    case 'hundred': { const z = E.out(seg(lt, 1, 2)), big = { 'font-family': 'Readex Pro', 'font-weight': 700, 'font-size': 320, fill: P.gold };
      return [DESKBG(), glow, '', g({ transform: tf(lerp(475, 250, z), 820) }, paper('M-110 -200 L110 -200 L110 200 L-110 200Z', P.parchment, 10), txt(0, 110, '1', { ...big, direction: 'ltr' })) +
        [0, 1].map(i => g({ transform: tf(lerp(1300 + i * 300, 480 + i * 230, E.back(seg(lt, 1 + i * .3, 2 + i * .3))), 820) }, paper('M-100 -200 L100 -200 L100 200 L-100 200Z', P.parchment, 10), txt(0, 110, '0', { ...big, direction: 'ltr' }))).join('')]; }
    case 'icons3': return [DESKBG(), glow, pageSheet(110, 260, 760, 1060, { lines: false }) + inkText(490, 440, 'الجبر', 96, 1),
      [[270, 'scale'], [490, 'field'], [710, 'scroll']].map(([x, k], i) => g({ transform: tf(x, lerp(1400, 820, E.back(seg(lt, .3 + i * .4, 1.1 + i * .4)))) }, icon(k))).join('')];
    case 'rings': { let s = ''; for (let i = 0; i < 7; i++) { const k = seg(lt, .2 + i * .3, .5 + i * .3); if (k <= 0) break; const x = 790 - i * 105, y = 780 + 40 * Math.sin(i);
      s += g({ transform: tf(x, y, E.back(k)) }, ring(0, 0, false) + txt(0, 70, '•', { fill: P.ink_soft })); }
      return [DESKBG(), glow, pageSheet(110, 360, 760, 860, { lines: false }), s]; }
    case 'rings_light': { let s = ''; for (let i = 0; i < 7; i++) { const x = 790 - i * 105, y = 780 + 40 * Math.sin(i), lit = lt > .4 + i * .35; s += ring(x, y, lit); }
      return [DESKBG(), glow, pageSheet(110, 360, 760, 860, { lines: false }), s]; }
    case 'rings_break': { const off = E.io(seg(lt, 1.6, 2.8)); let s = ''; for (let i = 0; i < 7; i++) s += ring(790 - i * 105, 780 + 40 * Math.sin(i), lt < .8, i === 3 && lt > .8);
      return [DESKBG(), glow, pageSheet(110, 360, 760, 860, { lines: false }), g({ transform: tf(-240 * off, 420 * off, 1 - .35 * off), opacity: 1 - .5 * off }, s)]; }
    case 'book_stand': return [DESKBG(), glow, frameIllum(u), g({ transform: tf(475, 860) }, pth('M-170 150 L170 -60 M170 150 L-170 -60', 'none', { stroke: P.wood, 'stroke-width': 26, 'stroke-linecap': 'round' }),
      paper('M-200 -110 Q-100 -150 0 -120 Q100 -150 200 -110 L200 60 Q100 20 0 50 Q-100 20 -200 60Z', P.parchment, 8), rect(-200, -150, 400, 200, 'url(#glow_soft)', { opacity: .7 }), textLines(-170, -20, -90, 5, P.ink_soft), textLines(20, 170, -90, 5, P.ink_soft))];
    case 'volumes': { let s = rect(80, 1000, 820, 30, P.wood); for (let i = 0; i < 30; i++) { const k = seg(lt, i * .05, .2 + i * .05); s += rect(90 + i * 27, lerp(700, 830, 1 - k) + 0, 24, 170, [P.lapis, P.emerald, P.wood][i % 3], { opacity: k, rx: 3 }) + rect(90 + i * 27, 870, 24, 6, P.gold, { opacity: k }); }
      const op = seg(lt, 1.8, 2.4); s += g({ transform: tf(475, 500), opacity: op }, pageSheet(-300, -260, 600, 440, { lines: false }), [...Array(5)].map((_, i) => line(-230 + i * 110, -120, -180 + i * 110, 60, P.gold, 5, { 'stroke-dasharray': 200, 'stroke-dashoffset': R(200 * (1 - seg(lt, 2.2 + i * .35, 2.6 + i * .35))) })).join(''));
      return [DESKBG(), glow, '', s]; }
    case 'tool_match': { const k = E.io(seg(lt, .3, 1.6));
      const forceps = (col, w) => pth('M-150 -20 Q0 -40 150 -6 M-150 20 Q0 40 150 6 M-150 -20 Q-190 0 -150 20', 'none', { stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' });
      return [DESKBG(), glow, pageSheet(110, 360, 760, 860, { lines: false }), g({ transform: tf(lerp(-300, 475, k), 640) }, forceps(P.gold, 6)) + g({ transform: tf(475, 960) }, forceps(P.ink, 22)) +
        (lt > 1.8 ? pth('M300 800 L360 860 L460 740', 'none', { stroke: P.emerald, 'stroke-width': 14, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: seg(lt, 1.8, 2.2) }) : '')]; }
    case 'tooth_arm': { const a = E.back(seg(lt, .2, 1)), b = E.back(seg(lt, .8, 1.6));
      return [DESKBG(), glow, '', g({ transform: tf(270, 780, 1, 0, a) }, pageSheet(-170, -260, 340, 520, { lines: false }), pth('M-60 -120 Q0 -150 60 -120 Q70 0 40 40 L30 160 Q20 120 0 60 Q-20 120 -30 160 L-40 40 Q-70 0 -60 -120Z', 'none', { stroke: P.gold, 'stroke-width': 7 })) +
        g({ transform: tf(690, 780, 1, 0, b) }, pageSheet(-170, -260, 340, 520, { lines: false }), pth('M-40 -200 L-40 200 M40 -200 L40 200', 'none', { stroke: P.gold, 'stroke-width': 7 }), [-120, -40, 40, 120].map(y => rect(-70, y - 14, 140, 28, P.parchment_dim, { stroke: P.gold_dim, 'stroke-width': 3 })).join(''))]; }
    case 'name_ink': return [DESKBG(), glow, pageSheet(110, 260, 760, 1060, { lines: false }) + [...Array(4)].map((_, i) => line(200 + i * 160, 700, 260 + i * 160, 1050, P.gold, 5)).join(''), inkText(490, 470, 'الزَّهْرَاوِيّ', 110, u)];
    case 'obscura': case 'obscura_rays': {
      const street = (flip) => g({ transform: flip ? 'scale(1 -1)' : '' }, rect(-220, 40, 440, 16, P.gold_dim), palm(-150, 40, 150, t, P.emerald_light), palm(160, 40, 130, t, P.emerald_light), house(-60, 40, 110, 90, P.parchment_dim),
        g({ transform: tf(((t * 30) % 400) - 200, 40, .5) }, rect(-50, -60, 100, 50, P.wood), circ(-30, -8, 16, P.wood_dark), circ(30, -8, 16, P.wood_dark)));
      const room = rect(-400, -400, W + 800, H + 800, P.ink) + rect(560, 250, 380, 1100, P.lapis_deep) + circ(560, 800, 5, P.gold_light);
      return name === 'obscura' ? [room, '', g({ transform: tf(760, 800, 1.1), opacity: .5 + .5 * seg(lt, .3, 1.5) }, street(true)), pth('M0 790 L560 800 L0 810Z', 'url(#beam)', { opacity: .5, transform: 'scale(-1 1) translate(-560 0)' })]
        : [room, g({ transform: tf(250, 800, .9) }, street(false)), g({ transform: tf(760, 800, 1.1) }, street(true)),
          [[-60, 60], [60, -60]].map(([a, b], i) => poly([[250 + a * 2, 800 - 150], [560, 800], [760 + b * 2.5, 800 + 170]], P.gold, 5, { 'stroke-dasharray': 1200, 'stroke-dashoffset': R(1200 * (1 - seg(lt, .3 + i * .4, 1.3 + i * .4))) })).join('')]; }
    case 'optics': { const k = seg(lt, .2, 2.4), p1 = [120, 520], p2 = [560, 820], p3 = [760, 520], p4 = [840, 760];
      const seg2 = (a, b, v) => [lerp(a[0], b[0], v), lerp(a[1], b[1], v)];
      const pts3 = [p1, k < .4 ? seg2(p1, p2, k / .4) : p2]; if (k > .4) pts3.push(k < .75 ? seg2(p2, p3, (k - .4) / .35) : p3); if (k > .75) pts3.push(seg2(p3, p4, (k - .75) / .25));
      return [rect(-400, -400, W + 800, H + 800, P.ink), rect(80, 440, 30, 160, P.wood) + rect(500, 840, 130, 20, P.lapis_light) + g({ transform: tf(760, 700) }, rect(-60, -60, 120, 200, P.lapis_mist, { opacity: .5, rx: 10 }), rect(-60, 20, 120, 120, P.lapis_light, { opacity: .6, rx: 8 })),
        poly(pts3, P.gold_light, 7) + circ(pts3[pts3.length - 1][0], pts3[pts3.length - 1][1], 40, 'url(#glow)'), ''];
    }
    case 'rays_reverse': case 'rays_doubt': {
      const eye = g({ transform: tf(250, 800) }, pth('M-90 0 Q0 -70 90 0 Q0 70 -90 0Z', P.parchment), circ(10, 0, 32, P.lapis), circ(10, 0, 15, P.ink));
      const vase = g({ transform: tf(760, 820) }, pth('M-50 120 Q-80 20 -40 -40 L-30 -110 L30 -110 L40 -40 Q80 20 50 120Z', P.lapis_light), line(-30, -110, 30, -110, P.gold, 6));
      let rays = '';
      for (let i = 0; i < 5; i++) { const y1 = 720 + i * 40, off = ((lt * 120 * (name === 'rays_doubt' ? 1 : -1)) % 60 + 60) % 60;
        rays += line(340, 800, 700, y1, name === 'rays_doubt' ? P.parchment : P.gold, 5, { 'stroke-dasharray': '18 42', 'stroke-dashoffset': R(-off) }); }
      const cross = name === 'rays_doubt' && lt > 1.6 ? pth('M380 620 L640 980 M640 620 L380 980', 'none', { stroke: P.gold, 'stroke-width': 22, 'stroke-linecap': 'round', 'stroke-dasharray': 900, 'stroke-dashoffset': R(900 * (1 - seg(lt, 1.6, 2.4))) }) : '';
      return [DESKBG(), glow, pageSheet(110, 360, 760, 860, { lines: false }) + eye + vase, rays + cross]; }
    case 'eye_layers': { const k = u;
      return [DESKBG(), glow, pageSheet(110, 260, 760, 1060, { lines: false }), g({ transform: tf(475, 780) }, [220, 180, 140, 90].map((r, i) => circ(0, 0, r, 'none', { stroke: [P.gold, P.gold_dim, P.lapis, P.emerald][i], 'stroke-width': 8, 'stroke-dasharray': R(TAU * r), 'stroke-dashoffset': R(TAU * r * (1 - seg(k, i * .2, i * .2 + .4))) })).join('') + circ(0, 0, 40, P.ink, { opacity: k }),
        [['القرنية', -300, -200], ['العدسة', 300, -120], ['الشبكية', -300, 200]].map(([s, x, y], i) => label(x, y, s, 36, P.lapis) + line(x * .5, y * .5, x * .78, y * .9, P.gold_dim, 3)).join(''))]; }
    case 'optics_row': return [DESKBG(), glow, book(700, 1000, { open: 1 }), ['lens', 'eye', 'mirror'].map((k, i) => g({ transform: tf(220 + i * 250, lerp(1500, 720, E.back(seg(lt, .2 + i * .4, 1 + i * .4)))) }, icon(k))).join('')];
    case 'herbs': return [DESKBG(), glow, pageSheet(110, 260, 760, 1060, { lines: false }),
      [icon('herb'), icon('mortar'), icon('herb')].map((s, i) => g({ transform: tf(250 + i * 230, 620), opacity: seg(lt, .3 + i * .5, .8 + i * .5) }, s)).join('') + ['١', '٢', '٣'].map((d, i) => txt(750, 900 + i * 90, d, { 'font-family': 'Reem Kufi', 'font-size': 52, fill: P.gold, opacity: seg(lt, 1.5 + i * .3, 1.8 + i * .3) }) + textLines(240, 700, 890 + i * 90, 1, P.ink_soft, seg(lt, 1.5 + i * .3, 1.8 + i * .3))).join('')];
    case 'second_volume': return [DESKBG(), glow, rect(80, 1060, 820, 30, P.wood) + g({ transform: tf(380, 870) }, paper('M-90 -190 L90 -190 L90 190 L-90 190Z', P.emerald, 8), rect(-70, -120, 140, 12, P.gold)),
      g({ transform: tf(lerp(1300, 580, E.io(seg(lt, .4, 1.6))), 870) }, paper('M-90 -190 L90 -190 L90 190 L-90 190Z', P.lapis, 8), rect(-70, -120, 140, 12, P.gold))];
    case 'pages_bind': { const k = E.io(seg(lt, .2, 1.4)), pop = E.back(seg(lt, 1.6, 2.6)); let s = '';
      for (let i = 0; i < 8; i++) s += g({ transform: tf(lerp(200 + (i % 4) * 190, 475, k), lerp(500 + Math.floor(i / 4) * 360, 860 - i * 6, k), 1, lerp((i - 4) * 9, 0, k)) }, paper('M-120 -160 L120 -160 L120 160 L-120 160Z', i % 2 ? P.parchment : P.parchment_dim, 6));
      s += g({ transform: tf(475, 860), opacity: seg(lt, 1.3, 1.6) }, paper('M-140 -180 L140 -180 L140 180 L-140 180Z', P.wood, 10), rect(-120, -160, 240, 320, 'none', { stroke: P.gold, 'stroke-width': 5 }));
      s += [[-190, -100], [190, -60], [-170, 150], [180, 140]].map(([x, y], i) => g({ transform: tf(475 + x, 860 + y, pop * .5) }, i % 2 ? house(-40, 0, 80, 70, P.parchment) + dome(0, -70, 60, 40, P.emerald) : rect(-50, -40, 100, 40, P.gold_dim) + pth('M-60 -40 L0 -80 L60 -40Z', P.emerald))).join('');
      return [DESKBG(), glow, '', s]; }
    case 'harbour_chain': return [sky('day', t), sea(900, t, { y1: H + 400 }), pth('M-400 900 L-400 560 L220 600 L300 900Z M1500 900 L1500 560 L760 620 L700 900Z', P.parchment_dim) + rect(220, 900, 480, 8, P.gold),
      pth(`M260 930 Q475 ${R(1000 + 10 * Math.sin(t))} 720 930`, 'none', { stroke: P.ink, 'stroke-width': 18, 'stroke-dasharray': '26 10', 'stroke-dashoffset': R(-900 * (1 - E.io(seg(lt, .2, 1.6)))) }) + towerSq(250, 900, 90, 220, P.parchment) + towerSq(710, 900, 90, 220, P.parchment)];
    case 'purse': return [DESKBG(), circ(475, 800, 500, 'url(#glow_soft)', { opacity: .4 }), rect(60, 700, 860, 520, P.wood, { rx: 12 }),
      g({ transform: tf(380, 930) }, paper('M-110 90 Q-140 -20 -60 -60 L60 -60 Q140 -20 110 90Z', P.parchment_dim, 8), pth('M-60 -60 Q0 -20 60 -60', 'none', { stroke: P.wood_dark, 'stroke-width': 8 })) +
        g({ transform: tf(640, 1000) }, ell(0, 8, 50, 18, P.paper_shadow, { opacity: .3 }), ell(0, 0, 50, 18, P.gold), ell(0, -4, 44, 14, P.gold_light), circ(0, -4, 60, 'url(#glow_soft)', { opacity: .5 + .5 * Math.sin(t * 2) }))];
    case 'ledge_lamp': { const L = ERAS.libya.f(t, { sky: 'dusk' }); return [L[0], L[1], L[2] + paper('M300 1060 L650 1060 L630 1110 L320 1110Z', P.parchment_dim, 8) + pth('M320 1110 L630 1110 L600 1160 L350 1160Z', P.wood), lampDesk(475, 985, t, .9, .7) + rect(-400, 0, W + 800, H, P.lapis_deep, { opacity: R(.25 * seg(lt, 0, dur)) })]; }
    default: return [DESKBG(), glow, pageSheet(110, 260, 760, 1060), ''];
  }
}
function icon(k) {
  const G = P.gold, s = { stroke: G, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' };
  switch (k) {
    case 'scale': return pth('M0 -90 L0 80 M-70 -60 L70 -60 M-70 -60 L-100 10 L-40 10Z M70 -60 L40 10 L100 10Z M-50 80 L50 80', 'none', s);
    case 'field': return pth('M-90 -60 L90 -60 L90 70 L-90 70Z M-90 0 L90 0 M0 -60 L0 70 M-90 -30 L0 -30 M0 35 L90 35', 'none', s);
    case 'scroll': return pth('M-70 -80 L70 -80 L70 80 L-70 80Z M-70 -80 Q-90 -80 -90 -60 Q-90 -40 -70 -40 M-40 -40 L40 -40 M-40 0 L40 0 M-40 40 L20 40', 'none', s);
    case 'lens': return circ(0, -20, 60, 'none', s) + line(40, 25, 90, 90, G, 12) + circ(-15, -35, 16, P.gold_light, { opacity: .5 });
    case 'eye': return pth('M-90 0 Q0 -70 90 0 Q0 70 -90 0Z', 'none', s) + circ(0, 0, 28, G);
    case 'mirror': return ell(0, -20, 50, 70, P.lapis_mist, { stroke: G, 'stroke-width': 7 }) + line(0, 50, 0, 100, G, 8) + line(-40, 100, 40, 100, G, 8);
    case 'herb': return pth('M0 100 L0 -90 M0 -40 Q-50 -60 -60 -100 Q-20 -90 0 -60 M0 0 Q50 -20 60 -60 Q20 -50 0 -20 M0 40 Q-50 20 -60 -10 Q-20 0 0 30', 'none', s);
    case 'mortar': return pth('M-80 -20 L80 -20 Q70 80 0 90 Q-70 80 -80 -20Z M30 -30 L90 -110', 'none', s);
    case 'flask': return pth('M-20 -90 L20 -90 M-14 -90 L-14 -30 L-70 70 Q-74 90 -50 90 L50 90 Q74 90 70 70 L14 -30 L14 -90', 'none', s);
    case 'ruler': return rect(-100, -24, 200, 48, 'none', s) + [...Array(9)].map((_, i) => line(-80 + i * 20, -24, -80 + i * 20, i % 2 ? -8 : 4, G, 4)).join('');
    default: return circ(0, 0, 50, 'none', s);
  }
}

// ─── الإطار المذهّب وشعارات الدروس ───────────────────────────────────────
function frameIllum(u, x = 70, y = 190, w = 810, h = 1200) {
  const L = 2 * (w + h), dash = { 'stroke-dasharray': L, 'stroke-dashoffset': R(L * (1 - u)) };
  const corner = (cx, cy) => g({ transform: tf(cx, cy, E.back(seg(u, .6, 1))) }, circ(0, 0, 44, P.lapis_deep, { stroke: P.gold, 'stroke-width': 5 }), pth('M0 -34 L10 -10 L34 0 L10 10 L0 34 L-10 10 L-34 0 L-10 -10Z', P.gold), circ(0, 0, 8, P.emerald));
  return once('frameP' + x, () => paper(`M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h}Z`, P.parchment, 12)) +
    rect(x + 20, y + 20, w - 40, h - 40, 'none', { stroke: P.gold, 'stroke-width': 10, ...dash }) + rect(x + 40, y + 40, w - 80, h - 80, 'none', { stroke: P.lapis, 'stroke-width': 4, ...dash }) +
    g({ opacity: seg(u, .3, .8) }, rect(x + 60, y + 60, w - 120, 110, P.lapis), rect(x + 60, y + 60, w - 120, 110, 'url(#geo)', { opacity: .9 }), circ(x + w / 2, y + 115, 40, P.gold)) +
    corner(x + 20, y + 20) + corner(x + w - 20, y + 20) + corner(x + 20, y + h - 20) + corner(x + w - 20, y + h - 20);
}
function lesson(name, lt, dur, t) {
  const u = E.io(seg(lt, .6, Math.max(1.4, dur - .5))), cx = 475, cy = 830;
  let e;
  switch (name) {
    case 'compass_map': { const k = u; e = g({ transform: tf(cx - 140 * (1 - k), cy) }, paper('M-160 -200 L160 -200 L160 200 L-160 200Z', P.parchment_dim, 8), pth('M-120 -120 Q-20 -40 40 60 T120 150', 'none', { stroke: P.lapis, 'stroke-width': 6, 'stroke-dasharray': '12 10' })) +
      g({ transform: tf(cx + 150 * (1 - k), cy, 1 - .2 * k) }, circ(0, 0, 130, P.gold_dim), circ(0, 0, 110, P.parchment), pth('M0 -90 L18 0 L0 90 L-18 0Z', P.lapis, { transform: `rotate(${R(30 * Math.sin(t))})` }), circ(0, 0, 10, P.gold)); break; }
    case 'steps': { const k = seg(lt, .8, 2.4); e = [...Array(5)].map((_, i) => g({ transform: tf(lerp(cx, cx - 240 + i * 120, k), lerp(cy, cy + 180 - i * 90, k)) }, paper(`M-${R(lerp(160, 55, k))} -${R(lerp(160, 40, k))} L${R(lerp(160, 55, k))} -${R(lerp(160, 40, k))} L${R(lerp(160, 55, k))} ${R(lerp(160, 40, k))} L-${R(lerp(160, 55, k))} ${R(lerp(160, 40, k))}Z`, k > .9 ? P.gold : P.lapis, 6))).join(''); break; }
    case 'lens': { const x = lerp(cx - 300, cx + 320, E.io(seg(lt, .6, dur - .4))); e = g({ transform: tf(x, cy) }, paper('M-70 -50 L70 -50 L70 50 L-70 50Z', P.parchment, 6), textLines(-50, 50, -20, 3, P.lapis, 1, 20)) + g({ transform: tf(cx, cy, 1.4) }, icon('lens')) + (x > cx ? pth(`M${R(x + 80)} ${cy} l40 -20 l0 40Z`, P.emerald) : ''); break; }
    case 'stitch': e = g({ transform: tf(cx, cy) }, paper('M-220 -220 L220 -220 L220 220 L-220 220Z', P.parchment, 8), pth('M-120 -140 L-40 -40 L-80 20 L10 120', 'none', { stroke: P.ink_soft, 'stroke-width': 8 }),
      pth('M-100 -110 L-60 -120 M-70 -60 L-30 -70 M-80 10 L-40 0 M-30 80 L10 70', 'none', { stroke: P.gold, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-dasharray': 400, 'stroke-dashoffset': R(400 * (1 - u)) })); break;
    case 'icons': e = ['flask', 'eye', 'ruler', 'scale'].map((k, i) => g({ transform: tf(cx + (i % 2 ? 150 : -150), cy + (i < 2 ? -150 : 150)), opacity: .35 + .65 * (lt > .8 + i * .6 ? 1 : 0) }, icon(k), lt > .8 + i * .6 ? circ(0, 0, 110, 'url(#glow_soft)') : '')).join(''); break;
    case 'bridge': e = [...Array(6)].map((_, i) => g({ transform: tf(cx - 300 + i * 120, cy + 60 - 70 * Math.sin(Math.PI * i / 5), E.back(seg(lt, .6 + i * .25, 1 + i * .25))) }, pth('M-60 -30 Q-30 -46 0 -30 Q30 -46 60 -30 L60 30 Q30 16 0 30 Q-30 16 -60 30Z', P.gold, { stroke: P.gold_dim, 'stroke-width': 3 }))).join(''); break;
    case 'scale': { const tilt = 18 * Math.cos(lt * 2.5) * Math.exp(-lt * .7); e = g({ transform: tf(cx, cy) }, line(0, -200, 0, 220, P.gold, 12), line(-120, 220, 120, 220, P.gold, 14),
      g({ transform: `rotate(${R(tilt)} 0 -170)` }, line(-220, -170, 220, -170, P.gold, 10), pth('M-220 -170 L-270 -40 L-170 -40Z M220 -170 L170 -40 L270 -40Z', 'none', { stroke: P.gold, 'stroke-width': 6 }), ell(-220, -40, 60, 10, P.gold_dim), ell(220, -40, 60, 10, P.gold_dim),
        g({ transform: tf(-220, -54) }, pth('M-40 0 Q0 -20 40 -6', 'none', { stroke: P.wood, 'stroke-width': 5 }), ell(-20, -12, 16, 7, P.emerald), ell(12, -18, 16, 7, P.emerald)))); break; }
    case 'door': e = g({ transform: tf(cx, cy) }, paper('M-110 160 L-110 -100 Q0 -200 110 -100 L110 160Z', P.wood, 8), circ(60, 20, 10, P.gold), rect(-110, 160, 220, 16, P.wood_dark),
      pth('M-300 260 Q-300 -60 -150 -240 Q0 -340 150 -240 Q300 -60 300 260', 'none', { stroke: P.gold, 'stroke-width': 14, 'stroke-linecap': 'round', 'stroke-dasharray': 1600, 'stroke-dashoffset': R(1600 * (1 - u)) })); break;
    case 'bind': { const k = E.io(seg(lt, .8, 2.4)); e = [...Array(8)].map((_, i) => { const a = i / 8 * TAU; return g({ transform: tf(cx + Math.cos(a) * 280 * (1 - k), cy + Math.sin(a) * 280 * (1 - k), 1 - .3 * k, (i - 4) * 10 * (1 - k)) }, paper('M-60 -80 L60 -80 L60 80 L-60 80Z', [P.parchment, P.lapis_mist, P.emerald_light, P.parchment_dim][i % 4], 4), rect(-40, -60, 80, 120, 'url(#geo)', { opacity: .6 })); }).join('') +
      (k > .95 ? g({ transform: tf(cx, cy) }, paper('M-90 -120 L90 -120 L90 120 L-90 120Z', P.gold, 8), rect(-70, -100, 140, 200, 'none', { stroke: P.gold_light, 'stroke-width': 5 })) : ''); break; }
    case 'olive_roots': e = g({ transform: tf(cx, cy + 120) }, pth('M0 0 Q-40 80 -140 130 M0 0 Q10 90 30 170 M0 0 Q50 70 150 110 M-60 60 Q-90 120 -70 180', 'none', { stroke: P.gold, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-dasharray': 300, 'stroke-dashoffset': R(300 * (1 - u)) }), line(-300, 0, 300, 0, P.wood, 6), olive(0, 0, 2.2 + .02 * Math.sin(t * 3), t * 2.5)) +
      [0, 1, 2].map(i => line(-100 + ((t * 300 + i * 260) % 1100), cy - 300 + i * 90, -20 + ((t * 300 + i * 260) % 1100), cy - 300 + i * 90, P.lapis_light, 5, { opacity: .6 })).join(''); break;
    default: e = qmark(cx, cy, .8, u);
  }
  return e;
}
