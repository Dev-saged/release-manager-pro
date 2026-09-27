'use strict';
// بطاقات التركيب: عنوان الحلقة، الخاتمة (الشعار، التوقيع، «تابعونا»)، والغلاف — تُرسم بمحرّك المشاهد نفسه فوق خطة بطاقة واحدة

const CD = PL.card;
const arDigits = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
function logo(x, y, s, lt) {
  const star = [...Array(32)].map((_, k) => { const a = k / 32 * TAU - Math.PI / 2, r = k % 2 ? 250 : 330; return [Math.cos(a) * r, Math.sin(a) * r]; });
  return g({ transform: tf(x, y, s, 6 * lt) }, pth(pts(star), P.gold_dim), pth(pts(star.map(([a, b]) => [a * .9, b * .9])), 'url(#goldm)'),
    circ(0, 0, 220, P.lapis_deep), circ(0, 0, 204, 'none', { stroke: P.gold, 'stroke-width': 6 }), circ(0, 0, 190, 'url(#geo)', { opacity: .7 })) +
    g({ transform: tf(x, y, s) }, qmark(0, 0, .5, 1));
}
function titleCard(lt, t) {
  const u = E.out(seg(lt, 0, .8)), L = eraLayers(PL.era, t);
  return layers({ x: FX, y: FY, z: 1.03 + .02 * lt }, L) + rect(0, 0, W, H, P.lapis_deep, { opacity: .35 }) +
    g({ transform: `translate(0 ${R(40 * (1 - u))})`, opacity: R(u) }, frameIllum(E.io(seg(lt, .1, 1.2)), 90, 330, 770, 930)) +
    logo(475, 440, .26, lt) + inkText(475, 598, CD.series, 44, seg(lt, .2, .9), { col: P.lapis }) +
    g({ opacity: R(seg(lt, .4, .9)) }, rect(335, 626, 280, 64, P.lapis, { rx: 32 }), label(475, 670, `الحلقة ${arDigits(CD.number)}`, 38, P.parchment)) +
    inkText(475, 830, CD.title, 104, seg(lt, .5, 1.6), { col: P.lapis_deep }) +
    line(lerp(475, 230, E.io(seg(lt, 1, 1.8))), 895, lerp(475, 720, E.io(seg(lt, 1, 1.8))), 895, P.gold, 5) +
    g({ opacity: R(seg(lt, 1.3, 1.9)) }, label(475, 985, CD.era, 44, P.wood), label(475, 1060, CD.place, 36, P.lapis)) +
    dust(t, 475, 800, 420, 520, 34, 'carddust');
}
function outroCard(lt, t) {
  const pulse = 1 + .05 * Math.sin(Math.max(0, lt - 2.2) * 5.5);
  return layers({ x: FX, y: FY, z: 1.05 }, eraLayers(PL.era, t, { sky: 'night' })) + rect(0, 0, W, H, P.ink, { opacity: .72 }) + circ(475, 560, 560, 'url(#glow_soft)', { opacity: .6 }) +
    logo(475, 520, .55 * E.back(seg(lt, 0, .7)), lt) +
    inkText(475, 880, PL.series_title, 112, seg(lt, .4, 1.3)) +
    g({ opacity: R(seg(lt, 1.1, 1.7)) }, label(475, 990, CD.credit, 42, P.parchment)) +
    g({ transform: tf(475, 1170, E.back(seg(lt, 1.7, 2.3)) * pulse) }, rect(-200, -62, 400, 124, P.gold, { rx: 62 }), rect(-190, -52, 380, 104, 'none', { stroke: P.gold_light, 'stroke-width': 3, rx: 52 }),
      txt(34, 26, CD.follow, { 'font-family': 'Reem Kufi', 'font-weight': 700, 'font-size': 66, fill: P.lapis_deep }),
      g({ transform: 'translate(-128 0)' }, circ(0, 0, 34, P.lapis_deep), pth('M-4 -18 L6 -18 L6 -4 L20 -4 L20 6 L6 6 L6 20 L-4 20 L-4 6 L-18 6 L-18 -4 L-4 -4Z', P.gold))) +
    dust(t, 475, 800, 420, 620, 40, 'outrodust');
}
function coverCard(t) {
  const L = eraLayers(PL.era, t), fp = { ...FP0, hA: [...FP0.hA], hB: [70, -610], handB: 'point', turn: .15, look: [.2, -.8], mouth: 'grin', eyes: 'wide', brow: 1, lean: 0, tilt: -6 };
  return layers({ x: FX, y: FY - 60, z: 1.08 }, L) + rect(0, 0, W, H, 'url(#fade_b)', { opacity: .55 }) + circ(475, 560, 520, 'url(#glow_soft)', { opacity: .7 }) +
    logo(475, 330, .36, 0) + inkText(475, 560, PL.series_title, 64, 1) +
    g({}, rect(335, 610, 280, 64, P.lapis_deep, { rx: 32, opacity: .9 }), label(475, 654, `الحلقة ${arDigits(CD.number)}`, 38, P.gold_light)) +
    txt(475, 810, CD.title, { 'font-family': 'Reem Kufi', 'font-weight': 700, 'font-size': 126, fill: P.paper_shadow, opacity: .5, transform: 'translate(0 8)' }) +
    txt(475, 810, CD.title, { 'font-family': 'Reem Kufi', 'font-weight': 700, 'font-size': 126, fill: P.gold }) +
    pth('M-60 1430 Q260 1400 540 1446 Q820 1400 1140 1430 L1140 1980 L-60 1980Z', 'url(#parch)') + line(540, 1446, 540, 1980, P.gold_dim, 4) +
    textLines(40, 460, 1520, 5, P.ink_soft, 1, 40) + textLines(620, 1040, 1520, 5, P.ink_soft, 1, 40) +
    qmark(740, 1150, .55, 1) + faris({ x: 290, y: 1470, s: .9, p: fp, t: 0, blink: 0, mouth: { v: 0 } });
}
RENDER.card = (i, t) => {
  const lt = t - SH[i].start;
  return CD.kind === 'title' ? titleCard(lt, t) : CD.kind === 'outro' ? outroCard(lt, t) : coverCard(t);
};
