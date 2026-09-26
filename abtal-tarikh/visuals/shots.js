'use strict';
// اللقطات: كل لقطة تُبنى من توجيهات إشارتها (PLAN.shots[i].d) وحالة المكتبة المتراكمة، ثم frame(t) يركّب الانتقالات

const SH = PL.shots;
const FA = { x: ST.faris[0], y: 1480 }, GA = { x: ST.grandpa[0], y: 1165 }, BK = { x: ST.book[0], y: ST.book[1] - 17 }, LP = { x: ST.lamp[0], y: ST.lamp[1] };
const toF = (x, y) => [x - FA.x, y - FA.y], toG = (x, y) => [x - GA.x, y - GA.y];
const pingpong = x => 1 - Math.abs(((x % 2) + 2) % 2 - 1);

// ─── أوضاع فارس ───────────────────────────────────────────────────────
const FP0 = { dx: 0, dy: 0, lean: 5, tilt: 0, nod: 0, turn: .45, hA: [80, -282], hB: [112, -282], bendA: 1, bendB: 1, handA: 'open', handB: 'open', nA: 0, nB: 0,
  legs: 'stand', phase: 0, brow: 0, browT: 0, eyes: 'open', look: [.6, .2], mouth: 'neutral', prop: null, propHand: 'B' };
const FPOSE = {
  lean: { lean: 17, hA: [100, -276], hB: [150, -262], tilt: 5, look: [.5, .6], turn: .6 },
  grip: { lean: 3, hA: [84, -284], hB: [116, -286], handA: 'fist', handB: 'fist' },
  sit_back: { legs: 'sit', lean: -9, hA: [30, -150], hB: [70, -146], look: [.4, -.1] },
  sit_up: { legs: 'sit', lean: 0, hA: [74, -150], hB: [106, -146], tilt: -2 },
  sit_edge: { legs: 'sit', lean: 14, hA: [96, -146], hB: [126, -142], look: [.6, 0], dx: 12 },
  cross_legged: { legs: 'cross', lean: 2, hA: [-70, -60], hB: [70, -60] },
  hug_knees: { legs: 'hug', lean: 12, hA: [72, -150], hB: [92, -140], bendA: -1, bendB: -1 },
  chin_hands: { lean: 16, hA: [88, -452], hB: [112, -448], handA: 'fist', handB: 'fist', look: [.4, .3] },
  chin_desk: { lean: 36, dy: 34, hA: [150, -262], hB: [182, -258], tilt: 8, look: [.5, .2] },
  tilt: { tilt: 14 }, proud: { lean: -5, tilt: -7, hA: [-58, -250], hB: [58, -250], bendA: -1, bendB: 1 },
  face: { turn: 0, look: [0, 0], lean: 0, tilt: 0, hA: [40, -250], hB: [96, -330] }, rest: {},
};
const FEXPR = {
  wow: { eyes: 'wide', mouth: 'wow', brow: 1 }, wide: { eyes: 'wide', brow: .8 }, tense: { browT: .8, eyes: 'wide', mouth: 'o' },
  puzzled: { brow: .4, browT: -.6, tilt: 8 }, think: { look: [.3, -.8], browT: -.3 }, smile: { mouth: 'smile' }, grin: { mouth: 'grin', eyes: 'happy' },
  delight: { mouth: 'grin', eyes: 'wide', brow: 1 }, squint: { eyes: 'squint', browT: -.8 }, brows: { brow: 1.2 }, breath: { mouth: 'breath', eyes: 'wide' },
  worried: { browT: 1, mouth: 'frown' }, frown: { browT: -1, mouth: 'frown' }, focus: { look: [.5, .5], brow: .2 }, down: { eyes: 'down', look: [.2, 1], tilt: 6 },
};
const FLOOK = { viewer: { turn: 0, look: [0, 0] }, grandpa: { turn: .7, look: [.8, -.6], tilt: -5 }, up: { look: [.3, -.9], tilt: -8 } };
const FHOLD = { phone: [90, -470], notebook: [80, -400], book: [90, -430], compass: [90, -440], ship: [90, -440], curtain: [-20, -600] };
const FGEST = {
  point: (p, lt) => { p.hB = [...toF(BK.x - 30 + 4 * Math.sin(lt * 6), BK.y - 8)]; p.handB = 'point'; p.lean = Math.max(p.lean, 14); p.look = [.5, .7]; },
  count: (p, lt) => { p.hB = [70, -440]; p.handB = 'count'; p.nB = 1 + Math.floor(lt / .55) % 5; p.look = [.2, .4]; p.tilt = 4; },
  trace: (p, lt) => { p.hB = [lerp(130, 240, E.sine(pingpong(lt / 2.4))), -262]; p.handB = 'point'; p.lean = 17; p.look = [.5, .7]; },
  tap: (p, lt) => { p.hB = [160, -262 - 16 * Math.max(0, Math.sin(lt * TAU * 2))]; p.handB = 'point'; p.lean = Math.max(p.lean, 12); },
  tap_tooth: (p, lt) => { p.hB = [34, -486 - 6 * Math.max(0, Math.sin(lt * TAU * 2.5))]; p.handB = 'point'; if (lt > 1) Object.assign(p, { eyes: 'happy', mouth: 'grin', nod: 4 * Math.sin(lt * 22) }); },
  draw_air: (p, lt) => { const a = -Math.PI / 2 + TAU * E.io(seg(lt, .3, 1.8)); p.hB = [96 + 52 * Math.cos(a), -500 + 52 * Math.sin(a)]; p.handB = 'point'; p.trail = seg(lt, .3, 1.8); p.look = [.4, -.4]; },
  pull: (p, lt) => { const k = E.io(seg(lt, .2, 1)); p.hB = [lerp(-40, 80, k), lerp(-230, -410, k)]; p.prop = 'notebook'; },
  cup_lamp: p => { p.hA = toF(LP.x - 34, LP.y + 12); p.hB = toF(LP.x + 30, LP.y + 6); p.lean = 12; p.eyes = 'happy'; p.mouth = 'smile'; p.lampBoost = 1; },
  mime_loaf: (p, lt) => { p.hA = [58, -400 + 3 * Math.sin(lt * 3)]; p.hB = [120, -400 + 3 * Math.sin(lt * 3)]; p.mouth = 'smile'; p.eyes = 'happy'; },
  mime_signal: (p, lt) => { if (Math.floor(lt / .9) % 2) { p.hA = [20, -560]; p.handA = 'flat'; } else { p.hB = [100, -560]; p.handB = 'flat'; } },
  peer: p => Object.assign(p, { turn: -.5, tilt: -10, look: [-.8, -.9], hB: [40, -560], handB: 'flat', eyes: 'squint' }),
  drag_book: (p, lt) => { const k = E.io(seg(lt, .2, 1.8)); p.hA = [lerp(250, 150, k), -250]; p.hB = [lerp(300, 200, k), -262]; p.lean = 20; p.dy = 4; },
  spin_globe: (p, lt) => { const w = lt * 3; p.hA = [70 + 50 * Math.cos(w + Math.PI), -430 + 26 * Math.sin(w + Math.PI)]; p.hB = [70 + 50 * Math.cos(w), -430 + 26 * Math.sin(w)]; p.eyes = 'happy'; p.mouth = 'grin'; },
  stretch: (p, lt) => { const k = E.out(seg(lt, .2, .9)); p.hA = [lerp(80, -190, k), lerp(-282, -470, k)]; p.hB = [lerp(112, 300, k), lerp(-282, -440, k)]; p.mouth = 'grin'; p.eyes = 'happy'; },
  fold_map: (p, lt) => { p.hB = [lerp(210, 150, bump(lt, .2, 1.4)), lerp(-262, -310, bump(lt, .2, 1.4))]; p.fold = seg(lt, .2, 1.4); },
  clap: (p, lt) => { const o = 55 * Math.abs(Math.cos(Math.PI * seg(lt, .2, .8))); p.hA = [70 - o, -420]; p.hB = [70 + o, -420]; p.eyes = 'happy'; p.mouth = 'grin'; },
  shake: (p, lt) => { p.turn = .1 + .35 * Math.sin(lt * 10) * bump(lt, 0, 1.4); },
  wipe_eyes: (p, lt) => { if (lt < 1.4) { p.hB = [44, -540 + 6 * Math.sin(lt * 8)]; p.eyes = 'closed'; } else Object.assign(p, FLOOK.grandpa, { eyes: 'down' }); },
  nod: (p, lt) => { p.nod = 7 * Math.sin(lt * TAU * 1.3) * bump(lt, 0, 1.6); },
  laugh: (p, lt) => { p.nod = 4 * Math.sin(lt * TAU * 4) * bump(lt, 0, 1.8); p.eyes = 'happy'; p.mouth = 'grin'; p.dy += 2 * Math.sin(lt * 25) * bump(lt, 0, 1.8); },
  look_around: (p, lt) => { const k = E.sine(pingpong(lt / 2.5)); p.turn = lerp(-.7, .8, k); p.look = [lerp(-.9, .9, k), -.5]; p.tilt = -6; },
  hug: p => { p.hA = [40, -390]; p.hB = [100, -380]; p.eyes = 'happy'; p.mouth = 'smile'; },
  hold_up: p => { p.hB = [90, -580]; },
  turn_page: (p, lt) => { const k = E.io(seg(lt, .2, 1.2)); p.hB = [lerp(250, 150, k), -262 - 40 * Math.sin(Math.PI * k)]; p.lean = 16; p.pageTurn = k; },
};

// ─── أوضاع الجدّ ──────────────────────────────────────────────────────
const GP0 = { dx: 0, dy: 0, lean: -3, tilt: 0, nod: 0, turn: -.45, hA: [-175, 30], hB: [-70, 26], bendA: -1, bendB: -1, handA: 'open', handB: 'open', nA: 0, nB: 0,
  brow: 0, browT: 0, eyes: 'open', look: [-.6, .2], mouth: 'neutral' };
const GB = toG(BK.x, BK.y);
const GGEST = {
  pat: (p, lt) => { p.hA = [GB[0] + 10, GB[1] - 30 - 16 * Math.max(0, Math.sin(lt * TAU * 1.6))]; },
  turn_book: (p, lt) => { p.hA = [GB[0] - 60, GB[1] - 10]; p.hB = [GB[0] + 70, GB[1] - 20]; p.bookRot = lerp(0, -22, E.io(seg(lt, .3, 1.5))); p.lean = -8; },
  make_room: (p, lt) => { p.hB = [lerp(-70, -230, bump(lt, .2, 1.6)), lerp(26, -80, bump(lt, .2, 1.6))]; p.dx = 30 * E.io(seg(lt, .2, 1)); p.lean = -8; p.mouth = 'smile'; },
  turn_page: (p, lt) => { const k = E.io(seg(lt, .2, 1.2)); p.hA = [lerp(-150, -260, k), 40 - 60 * Math.sin(Math.PI * k)]; p.pageTurn = k; p.lean = -8; },
  reach_lamp: (p, lt) => { const k = bump(lt, .2, 2.2), [lx, ly] = toG(LP.x + 30, LP.y - 10); p.hA = [lerp(-175, lx, k), lerp(30, ly, k)]; p.lean = -20 * k; },
  lift_cover: (p, lt) => { const k = E.io(seg(lt, .3, 1.5)); p.hA = [lerp(GB[0] - 130, GB[0] + 60, k), GB[1] - 80 * Math.sin(Math.PI * k)]; p.bookOpen = k; p.lean = -8; },
  ruffle: (p, lt) => { const [hx, hy] = toG(FA.x + 70, 900); p.hA = [hx + 10 * Math.sin(lt * 12) * seg(lt, .4, .6), hy]; p.lean = -24; p.eyes = 'happy'; p.mouth = 'smile'; },
  smooth: (p, lt) => { p.hA = [lerp(GB[0] - 110, GB[0] + 60, E.sine(pingpong(lt / 1.2))), GB[1] - 6]; p.lean = -10; },
  close_book: (p, lt) => { const k = E.io(seg(lt, .2, 1.3)); p.hA = [lerp(GB[0] - 130, GB[0] + 10, k), GB[1] - 60 * Math.sin(Math.PI * k)]; p.bookClose = k; p.glint = seg(lt, 1.3, 2.4); p.lean = -8; },
  tap: (p, lt) => { p.hB = [GB[0] + 60, GB[1] - 20 - 14 * Math.max(0, Math.sin(lt * TAU * 2))]; p.handB = 'point'; p.lean = -10; },
  rest_hand: p => { p.hA = [GB[0] + 50, GB[1] - 8]; p.eyes = 'happy'; p.mouth = 'smile'; },
  fold_map: (p, lt) => { const k = E.io(seg(lt, .2, 1.6)); p.hA = [lerp(-420, GB[0], k), 40]; p.hB = [lerp(100, GB[0] + 60, k), 36]; p.mapFold = k; },
  nod: (p, lt) => { p.nod = 6 * Math.sin(lt * TAU * 1.2) * bump(lt, 0, 1.8); },
};

function blendPose(a, b, u) {
  const o = {};
  for (const k in b) {
    const x = a[k], y = b[k];
    o[k] = typeof y === 'number' && typeof x === 'number' ? lerp(x, y, u) : Array.isArray(y) && Array.isArray(x) ? [lerp(x[0], y[0], u), lerp(x[1], y[1], u)] : u < .5 && x !== undefined ? x : y;
  }
  return o;
}
function farisRaw(sh, t) {
  const lt = t - sh.start, dur = sh.end - sh.start, a = sh.actors.faris || {};
  const p = { ...FP0, hA: [...FP0.hA], hB: [...FP0.hB] };
  if (!talking(t, 'faris') && talking(t, 'grandpa')) Object.assign(p, { turn: .6, look: [.8, -.4], tilt: -3 });
  if (sh.type === 'closing') Object.assign(p, FPOSE.face);
  Object.assign(p, FPOSE[a.pose] || {}, FEXPR[a.expr] || {}, FLOOK[a.look] || {});
  if (a.expr === 'think' && !a.gest && !a.hold) { p.hB = [70, -470]; p.handB = 'fist'; }
  if (a.hold) {
    p.prop = a.hold === 'bigbook' ? 'bigbook' : a.hold;
    if (a.hold === 'blank') { p.hA = [40, -420]; p.hB = [140, -420]; }
    else if (a.hold === 'bigbook') { p.hA = [30, -390]; p.hB = [100, -380]; }
    else if (FHOLD[a.hold] && !a.gest) p.hB = [...FHOLD[a.hold]];
  }
  if (a.gest && FGEST[a.gest]) FGEST[a.gest](p, lt, dur, t);
  if (a.move === 'closer') p.dx = 56 * E.io(seg(lt, .1, .9));
  if (a.walk === 'in') { const k = seg(lt, 0, 2.2); p.dx = -440 * (1 - E.out(k)); if (k < 1) { p.legs = 'walk'; p.phase = (p.dx + 440) / 30; p.turn = .85; } }
  if (a.walk === 'ladder') {
    const k1 = seg(lt, 0, 1.8), k2 = E.io(seg(lt, 1.8, 2.9));
    p.dx = lerp(-160, 0, k2); p.dy = -400 * (1 - k1);
    if (k1 < 1) { p.legs = 'walk'; p.phase = lt * 5; } else if (k2 < 1) { p.legs = 'walk'; p.phase = lt * 7; }
  }
  if (sh.actors.grandpa && sh.actors.grandpa.gest === 'ruffle') { p.dx = 70 * E.io(seg(lt, 0, .5)); p.eyes = 'happy'; p.mouth = 'grin'; p.tilt = -8; }
  return p;
}
function grandpaRaw(sh, t) {
  const lt = t - sh.start, dur = sh.end - sh.start, a = sh.actors.grandpa || {};
  const p = { ...GP0, hA: [...GP0.hA], hB: [...GP0.hB] };
  if (talking(t, 'faris')) Object.assign(p, { look: [-.8, .3], turn: -.55 });
  if (sh.type === 'closing') Object.assign(p, { mouth: 'smile', eyes: 'happy' });
  if (a.expr === 'smile') Object.assign(p, { mouth: 'smile', eyes: 'happy' });
  if (a.expr === 'brow') Object.assign(p, { brow: 1, browT: .5, mouth: 'smile' });
  if (a.look === 'shelves') Object.assign(p, { turn: .5, look: [.9, -.4] });
  if (talking(t, 'grandpa') && !a.gest) { const m = mouthAt(t, 'grandpa').v; p.hB = [-90 + 22 * Math.sin(lt * 1.7), -40 - 50 * m - 20 * Math.sin(lt * 1.1)]; }
  if (a.gest && GGEST[a.gest]) GGEST[a.gest](p, lt, dur, t);
  return p;
}
// تمهيد الوضع عند بداية اللقطة من وضع اللقطة السابقة في المكتبة
function poseOf(i, t, who) {
  const sh = SH[i], raw = who === 'faris' ? farisRaw : grandpaRaw, p = raw(sh, t), lt = t - sh.start;
  const pj = sh.prevLib;
  if (pj === null || pj === undefined || lt > .5) return p;
  return blendPose(raw(SH[pj], SH[pj].end), p, E.io(seg(lt, 0, .5)));
}

// ─── المكتبة ──────────────────────────────────────────────────────────
function libraryScene(i, t, o = {}) {
  const sh = SH[i], lt = t - sh.start, dur = sh.end - sh.start, st = sh.state, ns = sh.next;
  const fp = o.noActors ? null : poseOf(i, t, 'faris'), gp = o.noActors ? null : poseOf(i, t, 'grandpa');
  let lamp = st.lamp === 'dim' ? .14 : 1;
  if (ns.lamp !== st.lamp) lamp = lerp(lamp, ns.lamp === 'dim' ? .14 : 1, E.io(seg(lt, .8, 1.6)));
  if (o.dark) lamp = .16;
  const [L0, L1] = libraryBack(t, PL.era, { lamp: lamp < .5 ? 'dim' : 'on', curtain: ns.curtain || st.curtain });
  // الكتاب: فتح، إغلاق، قلب صفحة، تدوير، سحب
  const bo = { open: st.book === 'open' ? 1 : 0 };
  if (gp && gp.bookOpen !== undefined) bo.open = gp.bookOpen;
  if (gp && gp.bookClose !== undefined) bo.open = 1 - gp.bookClose;
  if (gp && gp.glint) bo.glint = gp.glint;
  if (gp && gp.bookRot) bo.rot = gp.bookRot;
  if ((gp && gp.pageTurn) || (fp && fp.pageTurn)) bo.turn = (gp && gp.pageTurn) || fp.pageTurn;
  if (st.pages === 'blank' || (sh.actors.faris && sh.actors.faris.hold === 'blank')) { bo.pages = 'blank'; bo.glow = sh.fx.includes('page_glow') ? E.io(seg(lt, .4, 1.6)) : .3; }
  let bx = BK.x, by = BK.y;
  if (fp && sh.actors.faris && sh.actors.faris.gest === 'drag_book') { bx = BK.x + lerp(120, 0, E.io(seg(lt, .2, 1.8))); bo.open = 0; }
  if (sh.mini !== null && bo.open > .9 && !o.noMini) bo.mini = miniCard(sh.mini, t);
  const mapOn = st.map === 'on' ? 1 - ((gp && gp.mapFold) || 0) : 0;
  const deskMap = mapOn > 0 ? g({ transform: tf(700, 1212, 1, 0, mapOn) }, pth('M-330 -60 L330 -60 L360 60 L-360 60Z', P.parchment), pth('M-330 -60 L330 -60 L360 60 L-360 60Z', 'url(#hatch)', { opacity: .25 }),
    pth('M-250 20 Q-100 -40 40 0 T260 -20', 'none', { stroke: P.gold, 'stroke-width': 4, 'stroke-dasharray': '8 8' }), line(-120, -60, -100, 60, P.parchment_dim, 2), line(120, -60, 140, 60, P.parchment_dim, 2)) : '';
  const glowK = 1 + .35 * ((fp && fp.lampBoost) || 0);
  let L2 = (gp ? grandpa({ x: GA.x, y: GA.y, p: gp, t, blink: blinkAt(t, 'grandpa'), mouth: mouthAt(t, 'grandpa') }) : '') + desk() + deskMap +
    lampDesk(LP.x, LP.y, t, lamp, glowK) + book(bx, by, bo);
  if (fp && fp.fold) L2 += pth(`M${BK.x + 200} ${BK.y - 10} l60 0 l-60 ${R(-50 * fp.fold)}Z`, P.parchment_dim);
  if (fp) {
    L2 += faris({ x: FA.x, y: FA.y, p: fp, t, blink: blinkAt(t, 'faris'), mouth: mouthAt(t, 'faris') });
    if (fp.trail) L2 += pth(`M${FA.x + 96} ${FA.y - 552} a52 52 0 1 1 -.1 0`, 'none', { stroke: P.gold, 'stroke-width': 6, 'stroke-dasharray': 330, 'stroke-dashoffset': R(330 * (1 - fp.trail)), opacity: .9, 'stroke-linecap': 'round' });
    if (fp.prop === 'curtain') L2 += pth(`M${FA.x - 20} ${FA.y - 600} L${FA.x - 60} ${FA.y - 1000} L${FA.x - 180} ${FA.y - 1000} L${FA.x - 150} ${FA.y - 560}Z`, P.lapis_deep, { opacity: .9 }) + circ(FA.x - 90, FA.y - 820, 5, P.gold_light);
  }
  let L3 = dust(t, LP.x + 60, LP.y - 120, 360, 300, sh.fx.includes('dust') ? 90 : 40, 'dust' + (sh.fx.includes('dust') ? 'x' : ''), P.gold_light) + embers(LP.x, LP.y - 40, t, 6, 'lampember', 120);
  L3 += once('libfg', () => pth(`M-400 ${H + 200} L-400 -200 L-120 -200 Q-40 400 -60 ${H + 200}Z`, P.ink, { opacity: .85 }) + g({ transform: tf(40, 1700) }, rect(-80, -60, 260, 60, P.lapis, { rx: 6 }), rect(-60, -120, 220, 60, P.emerald, { rx: 6 }), rect(-40, -170, 180, 50, P.wood, { rx: 6 })));
  let over = lamp < 1 ? rect(-100, -100, W + 200, H + 200, P.ink, { opacity: R(.62 * (1 - lamp)) }) : '';
  if (sh.fx.includes('beam') || (st.curtain === 'pinhole' && lamp < .5)) {
    const k = sh.fx.includes('beam') ? E.io(seg(lt, .3, 1.4)) : 1, [wx, wy] = [LIB.win[0] + LIB.win[2] * .62, LIB.win[1] + LIB.win[3] * .45];
    over += pth(`M${wx} ${wy} L${R(lerp(wx, 930, k))} ${R(lerp(wy, 760, k))} L${R(lerp(wx, 930, k))} ${R(lerp(wy, 1000, k))}Z`, 'url(#beam)', { opacity: .75 }) + circ(wx, wy, 30, 'url(#glow)');
  }
  if (o.dark) over += rect(-100, -100, W + 200, H + 200, P.ink, { opacity: .35 });
  return { L: [L0, L1, L2, L3], over, fp, gp };
}
function libCam(sh, lt, dur) {
  const f = sh.actors.faris || {}, gr = sh.actors.grandpa || {};
  let c = { x: FX, y: FY, z: 1 };
  const BOOKY = ['point', 'trace', 'tap', 'turn_page', 'drag_book', 'fold_map'], GBOOK = ['close_book', 'turn_page', 'lift_cover', 'pat', 'turn_book', 'smooth', 'rest_hand', 'tap'];
  if (sh.type === 'closing') c = { x: 380, y: 990, z: 1.16 };
  else if (sh.fx.includes('beam')) c = { x: 520, y: 760, z: 1.08 };
  else if (f.walk || gr.gest === 'ruffle' || gr.gest === 'make_room' || gr.gest === 'fold_map' || f.gest === 'stretch') c = { x: FX, y: FY + 40, z: 1 };
  else if (sh.subject === 'faris' && f.gest === 'cup_lamp') c = { x: 400, y: 1020, z: 1.34 };
  else if (sh.subject === 'faris' && (BOOKY.includes(f.gest) || sh.mini !== null)) c = { x: 420, y: 1060, z: 1.22 };
  else if (sh.subject === 'faris') c = { x: 335, y: 1000, z: 1.26 };
  else if (sh.subject === 'grandpa' && gr.gest === 'reach_lamp') c = { x: 520, y: 1000, z: 1.12 };
  else if (sh.subject === 'grandpa' && GBOOK.includes(gr.gest)) c = { x: 520, y: 1080, z: 1.3 };
  else if (sh.subject === 'grandpa') c = { x: 660, y: 910, z: 1.2 };
  const u = E.io(seg(lt, 0, Math.max(1, dur))), z = c.z * (1 + .035 * u);
  // الجدّ لا يدخل هامش اليمين، وقدما فارس فوق خط الأمان السفلي
  const x = Math.max(c.x + 10 * noise(lt * .3, 7), GA.x + 165 - (SAFE.x1 - FX) / z), y = Math.max(c.y + 6 * noise(lt * .3, 9), FA.y + 20 - (SAFE.y1 - FY) / z);
  return { x, y, z };
}
function libraryShot(i, t) {
  const sh = SH[i], lt = t - sh.start, dur = sh.end - sh.start, s = libraryScene(i, t);
  let out = layers(libCam(sh, lt, dur), s.L, false) + s.over;
  if (sh.type === 'closing') {
    const k = E.back(seg(lt, .9, 1.5)), bob = 8 * Math.sin(t * 2.2);
    out += g({ transform: tf(590, 640 + bob, k) }, paper('M-150 -110 Q-150 -170 -90 -170 L90 -170 Q150 -170 150 -110 L150 20 Q150 80 90 80 L-20 80 L-80 140 L-60 80 L-90 80 Q-150 80 -150 20Z', P.parchment, 10),
      g({ transform: 'translate(0 -48) scale(.36)' }, qmark(0, 0, 1, seg(lt, 1.2, 2.2))), [-50, 0, 50].map((x, j) => circ(x, 48, 9, P.gold, { opacity: R(.4 + .6 * bump((t * 1.5 + j * .3) % 1, 0, 1)) })).join(''));
  }
  return out;
}
// بطاقة صغيرة من آخر لقطة قصة في المشهد تقف على الكتاب
function miniCard(j, t) {
  const s = renderShot(j, Math.min(t, SH[j].end - .01), { mini: true });
  return `<clipPath id="minic"><path d="M-150 0 L-150 -170 Q-150 -250 0 -262 Q150 -250 150 -170 L150 0Z"/></clipPath>` +
    pth('M-156 4 L-156 -172 Q-156 -258 0 -270 Q156 -258 156 -172 L156 4Z', P.gold) + g({ 'clip-path': 'url(#minic)' }, g({ transform: 'translate(-162 -360) scale(.3)' }, s));
}

function hookShot(i, t) {
  const sh = SH[i], lt = t - sh.start, dur = sh.end - sh.start;
  const s = libraryScene(i, t, { noActors: true, dark: true, noMini: true });
  s.L[3] = dust(t, 475, 700, 420, 420, 50, 'hookdust');
  return layers({ x: FX, y: FY - 40, z: 1.06 + .05 * E.io(seg(lt, 0, dur)) }, s.L, false) + s.over + circ(475, 700, 520, 'url(#glow_soft)', { opacity: .55 }) + hookMotif(sh.d.motif, lt, dur, t);
}
function identShot(i, t) {
  const sh = SH[i], lt = t - sh.start, L = eraLayers(PL.era, t), u = E.out(seg(lt, .1, 1));
  const star16 = [...Array(32)].map((_, k) => { const a = k / 32 * TAU - Math.PI / 2, r = k % 2 ? 250 : 330; return [Math.cos(a) * r, Math.sin(a) * r]; });
  return layers({ x: FX, y: FY, z: 1.04 + .03 * lt }, L) + rect(0, 0, W, H, P.lapis_deep, { opacity: .62 }) +
    g({ transform: tf(475, 600, E.back(seg(lt, 0, .9)), 12 * lt) }, pth(pts(star16), P.gold_dim), pth(pts(star16.map(([x, y]) => [x * .9, y * .9])), 'url(#goldm)'), circ(0, 0, 220, P.lapis_deep), circ(0, 0, 204, 'none', { stroke: P.gold, 'stroke-width': 6 }),
      circ(0, 0, 190, 'url(#geo)', { opacity: .7 })) +
    g({ transform: tf(475, 600, E.back(seg(lt, .2, 1))) }, qmark(0, 0, .5, 1)) +
    inkText(475, 1010, PL.series_title, 104, seg(lt, .5, 1.6)) + inkText(475, 1170, PL.title, 84, seg(lt, 1.1, 2.2), { col: P.parchment }) +
    line(lerp(475, 200, u), 1070, lerp(475, 750, u), 1070, P.gold, 4);
}

// ─── مشاهد القصة المنبثقة ─────────────────────────────────────────────
const BASE = 1330;
const INTERIOR = ['scholar_write', 'hall', 'translators', 'circle', 'physician', 'optics_table', 'book_stack', 'library_rooms', 'ladder', 'scribe', 'prince_study', 'prince_books', 'chronicle', 'doorway', 'courtyard', 'arch_rows'];
function skyOf(d, tags) {
  if (tags.has('stars') || tags.has('campfire')) return 'night';
  const l = (d.layers || []).find(x => x.startsWith('sky_'));
  if (tags.has('dawn') || tags.has('sun_rise')) return 'dawn';
  return l ? l.slice(4) : null;
}
function envLayers(d, t, lt, dur, tags) {
  const city = d.city || ((d.layers || []).find(x => x.startsWith('city_')) || '').slice(5) || null, sk = skyOf(d, tags);
  const opt = { sky: sk || undefined };
  if (tags.has('gate_open')) opt.gateOpen = E.io(seg(lt, .8, 2.6));
  if (tags.has('harbour')) opt.chain = true;
  if (tags.has('sun_rise')) opt.sunY = lerp(GY - 60, 380, E.io(seg(lt, .3, dur)));
  if (city && ERA_CITY[city]) return eraLayers(city, t, opt);
  const k = sk || 'day', skyL = sky(k, t, { sunX: 700, sunY: opt.sunY });
  if (city && CITYSETS[city]) return [skyL, pth(ridge(GY - 170, 50, 'far' + city, 1), P.lapis_mist, { opacity: .8 }), CITYSETS[city](t, opt), rect(-400, GY + 20, W + 800, H, P.gold_dim) + [-120, 1100].map(x => palm(x, GY + 250, 380, t)).join('')];
  const L = d.layers || [];
  if (tags.has('cliffs') || L.includes('sea') || L.includes('strait_cliffs')) return eraLayers('andalus', t, { ...opt, white: city === 'tangier' });
  if (L.includes('green_mountains') || tags.has('green')) return [skyL, pth(ridge(GY - 240, 110, 'gm1', 1.1), P.emerald_deep), pth(ridge(GY - 120, 80, 'gm2', 1.4), P.emerald), pth(ridge(GY + 40, 50, 'gm3', 1.7), P.emerald_light) + rect(-400, GY + 160, W + 800, H, P.emerald)];
  if (L.includes('dunes')) return [skyL, pth(ridge(GY - 120, 40, 'dn1', .7), P.gold_dim, { opacity: .7 }), pth(ridge(GY - 20, 60, 'dn2', .9), P.gold), pth(ridge(GY + 120, 40, 'dn3', 1.2), P.gold_dim)];
  return [skyL, pth(ridge(GY - 220, 90, 'hl1', 1), P.lapis_mist), pth(ridge(GY - 90, 90, 'hl2', 1.3), P.emerald_deep) + (L.includes('lake') || tags.has('lake') ? pth(`M-400 ${GY - 20} Q540 ${GY - 60} 1500 ${GY - 20} L1500 ${GY + 80} Q540 ${GY + 120} -400 ${GY + 80}Z`, P.lapis_light) : '') +
    (L.includes('river') || tags.has('river') ? river(GY + 30, 70, t) : ''), pth(ridge(GY + 130, 50, 'hl3', 1.6), P.emerald) + rect(-400, GY + 200, W + 800, H, P.emerald_deep)];
}
function walkers(n, x0, x1, y, s, u, t, o = {}) {
  let r = '';
  for (let k = 0; k < n; k++) { const x = lerp(x0, x1, u) + k * (o.gap ?? 70) * Math.sign(x0 - x1 || 1); r += fig({ x, y: y + (k % 2) * 6, s: s * (1 - k * .04), pose: 'walk', ph: t * 6 + k * 1.7, facing: x1 > x0 ? 1 : -1, item: (o.items || [])[k % (o.items || [1]).length], col: o.col }); }
  return r;
}
function interior(d, t, lt, dur, tags) {
  const wall = baked('intwall', [-400, -400, W + 800, H + 800], () => rect(-400, -400, W + 800, H + 800, P.parchment_dim) + arcade(-300, 1150, 1680, 900, 6, P.gold_dim, P.parchment, P.lapis) + rect(-400, 1150, W + 800, H, P.wood));
  const lampAt = (x, y) => g({ transform: tf(x, y, .7) }, lampDesk(0, 0, t, 1, .8));
  let L1 = '', L2 = '', L3 = once('intfg', () => rect(-400, 1260, W + 800, H, P.lapis) + rect(-400, 1260, W + 800, H, 'url(#geo)', { opacity: .4 }) + pth(`M-400 -300 L-160 -300 L-160 ${H} L-400 ${H}Z M1480 -300 L1240 -300 L1240 ${H} L1480 ${H}Z`, P.wood_dark));
  const seated = (x, y, s, f, item, head) => fig({ x, y, s, pose: 'sit', facing: f, item, head });
  if (tags.has('arch_rows')) {
    L1 = [...Array(6)].map((_, k) => { const s = 1 - k * .14; return g({ transform: tf(475, 1250 - k * 60, s), opacity: R(seg(lt, k * .25, .4 + k * .25)) }, arcade(-700, 0, 1400, 900, 5, P.parchment_dim, P.parchment, P.gold)); }).reverse().join('');
    return [rect(-400, -400, W + 800, H + 800, P.ink), L1, '', L3];
  }
  if (tags.has('library_rooms')) {
    L1 = [...Array(5)].map((_, k) => { const s = 1 - k * .17; return g({ transform: `translate(475 ${1250 - k * 70}) scale(${s.toFixed(3)}) translate(-475 -1250)`, opacity: R(seg(lt, .2 + k * .35, .6 + k * .35)) },
      once('room' + k, () => shelves(-160, 300, 'lr' + k) + shelves(650, 1110, 'lr2' + k) + pth('M300 1280 L300 520 Q475 300 650 520 L650 1280', 'none', { stroke: P.gold, 'stroke-width': 14 }))); }).reverse().join('');
    return [rect(-400, -400, W + 800, H + 800, P.lapis_deep), L1, '', L3];
  }
  if (tags.has('courtyard')) L1 = sky('day', t, { noSun: true }) + arcade(-300, 1150, 1680, 520, 7, P.parchment_dim, P.parchment, P.emerald) + g({ transform: tf(475, 1200) }, pth('M-120 0 L-60 -40 L60 -40 L120 0 L60 40 L-60 40Z', P.lapis_light), circ(0, -10, 16, P.parchment, { opacity: .7 }));
  if (tags.has('hall')) { L1 = shelves(-300, 1400, 'hallsh'); L2 = [[260, 1180], [700, 1180], [150, 1300], [800, 1300]].map(([x, y], k) => seated(x, y, 1.5, k % 2 ? -1 : 1, 'book') + rect(x + (k % 2 ? -80 : 30), y - 50, 50, 40, P.wood)).join(''); }
  if (tags.has('translators')) { L2 = rect(80, 1150, 820, 40, P.wood) + [160, 330, 500, 670, 840].map((x, k) => seated(x, 1150, 1.3, k < 2 ? 1 : -1, 'scroll', ['turban', 'cap', 'turban', 'cap', 'turban'][k])).join('') + [240, 420, 600, 760].map(x => rect(x, 1128, 60, 20, P.parchment, { rx: 10 })).join(''); }
  if (tags.has('circle')) {
    const pos = [[240, 1150, 1], [700, 1150, -1], [160, 1290, 1], [800, 1290, -1], [470, 1080, 1]];
    L2 = pos.map(([x, y, f], k) => seated(x, y, k === 4 ? 1.1 : 1.4, f, tags.has('teacher_holds') && k === 4 ? null : 'book')).join('') + lampAt(475, 1230);
    if (tags.has('teacher_holds')) L2 += fig({ x: 470, y: 1120, s: 1.6, pose: 'stand', item: 'instrument' }) + g({ transform: tf(520, 780) }, rect(-50, -60, 100, 120, P.parchment), line(-30, -30, 30, 30, P.gold, 4));
  }
  if (tags.has('doorway')) { L1 += pth('M760 1150 L760 700 Q860 580 960 700 L960 1150Z', P.gold_light) + circ(860, 900, 240, 'url(#glow_soft)'); L2 += fig({ x: 860, y: 1150, s: 1.1, pose: 'stand', facing: -1 }); }
  if (tags.has('physician')) { L1 += rect(560, 400, 260, 420, P.lapis_light, { rx: 130 }) + circ(690, 600, 260, 'url(#glow_soft)'); L2 = rect(220, 1180, 520, 60, P.parchment, { rx: 8 }) + fig({ x: 200, y: 1180, s: 1.6, pose: 'kneel' }) +
    [...Array(6)].map((_, k) => line(290 + k * 70, 1195, 330 + k * 70, 1230, P.gold, 5, { opacity: R(seg(lt, .3 + k * .35, .6 + k * .35)) })).join(''); }
  if (tags.has('optics_table')) { L2 = rect(160, 1100, 660, 40, P.wood) + rect(200, 1140, 20, 150, P.wood_dark) + rect(760, 1140, 20, 150, P.wood_dark) + fig({ x: 120, y: 1290, s: 1.8, pose: 'stand' }) +
    g({ opacity: R(seg(lt, .3, .7)) }, lampAt(300, 1030)) + g({ opacity: R(seg(lt, 1, 1.4)) }, rect(470, 900, 20, 200, P.parchment_dim), rect(430, 920, 100, 160, P.parchment, { opacity: .8 })) +
    g({ opacity: R(seg(lt, 1.7, 2.1)) }, ell(700, 1000, 50, 70, P.lapis_mist, { stroke: P.gold, 'stroke-width': 6 }), line(700, 1070, 700, 1100, P.gold, 6)); }
  if (tags.has('scholar_write')) { const n = Math.min(10, 1 + Math.floor(lt / .6));
    L2 = rect(260, 1180, 200, 40, P.wood) + seated(200, 1250, 1.6, 1, 'pen') + rect(290, 1150, 110, 30, P.parchment) + lampAt(470, 1120) +
      [...Array(n)].map((_, k) => rect(600 + (k % 2) * 5, 1240 - k * 30, 150, 27, k === n - 1 && n > 8 ? P.gold : [P.lapis, P.emerald, P.wood][k % 3], { rx: 4, stroke: P.gold, 'stroke-width': 2 })).join(''); }
  if (tags.has('book_stack')) { const n = Math.min(9, 1 + Math.floor(lt / .35)); L2 = seated(360, 1250, 1.3, 1, null) + [...Array(n)].map((_, k) => rect(520 + (k % 2) * 6, 1240 - k * 34, 120, 30, [P.lapis, P.emerald, P.wood][k % 3], { rx: 4 })).join(''); }
  if (tags.has('ladder')) { const k1 = E.io(seg(lt, .2, dur * .45)), k2 = E.io(seg(lt, dur * .5, dur - .2));
    L1 = shelves(-300, 420, 'ldsh') + line(300, 400, 360, 1260, P.wood, 12) + line(380, 400, 440, 1260, P.wood, 12) + [...Array(8)].map((_, k) => line(306 + k * 7, 480 + k * 100, 386 + k * 7, 480 + k * 100, P.wood, 9)).join('') +
      pth('M620 1250 L620 700 Q760 520 900 700 L900 1250Z', P.lapis_deep) + g({ transform: tf(760, 1000, .6) }, dome(0, 0, 200, 150, P.parchment_dim), minaret(160, 90, 300, 40, 'round', P.parchment_dim, P.parchment_dim)) + g({ transform: tf(820, 760) }, circ(0, 0, 40, P.parchment), circ(18, -8, 36, P.lapis_deep));
    L2 = fig({ x: k2 > 0 ? lerp(400, 760, k2) : 370 - 30 * k1, y: k2 > 0 ? 1250 : lerp(1250, 800, k1), s: 1.3, pose: 'walk', ph: t * 5, facing: 1 }); }
  if (tags.has('scribe')) { L1 += pth('M620 1100 L620 600 Q740 480 860 600 L860 1100Z', P.lapis) + g({ transform: tf(740, 1080, .25) }, CITYSETS.fes(t)); const w = Math.sin(t * 3);
    L2 = seated(230, 1250, 1.5, 1, 'pen') + rect(300, 1190, 120, 60, P.parchment) + seated(720, 1250, 1.5, -1, null) + line(700, 1110, 640 + 20 * w, 1060 - 20 * w, P.ink, 10) + lampAt(475, 1180); }
  if (tags.has('prince_study') || tags.has('prince_books')) { L1 += arcade(80, 1200, 820, 800, 1, 'none', P.parchment, P.gold);
    L2 = seated(330, 1250, 1.2, 1, 'book', 'cap') + (tags.has('prince_study') ? seated(640, 1250, 1.6, -1, 'book') + rect(440, 1210, 100, 40, P.wood) : [...Array(6)].map((_, k) => rect(470, 1240 - k * 32, 130, 28, [P.lapis, P.emerald, P.wood][k % 3], { rx: 4 })).join('')); }
  if (tags.has('chronicle')) { const k = E.io(seg(lt, .2, 1.8)); L2 = g({ transform: tf(475, 700) }, rect(-320, -40, 640, 60, P.wood, { rx: 30 }), rect(-300, 0, 600, 900 * k, P.parchment), rect(-320, 900 * k - 30, 640, 60, P.wood, { rx: 30 }),
    [...Array(Math.floor(12 * k))].map((_, j) => pth(`M-240 ${60 + j * 70} q20 -20 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0`, 'none', { stroke: P.ink_soft, 'stroke-width': 4 })).join('') +
    (k > .8 ? line(-240, 60 + 7 * 70 + 18, lerp(-240, 200, seg(lt, 1.9, 2.6)), 60 + 7 * 70 + 18, P.gold, 8) : '')); L1 = ''; }
  return [wall, L1, L2, L3];
}
function popupElements(d, t, lt, dur, tags) {
  const T = d.text.toLowerCase(), add = ['', '', '', ''], u = seg(lt, 0, dur);
  if (tags.has('palace_gates')) { const k = E.io(seg(lt, .4, 1.8));
    add[3] += rect(250, GY - 420, 450, 660, P.parchment_dim) + pth(`M310 ${GY + 240} L310 ${GY - 180} Q475 ${GY - 400} 640 ${GY - 180} L640 ${GY + 240}Z`, P.gold_light) + circ(475, GY - 20, 260 * k, 'url(#glow_soft)') +
      rect(310, GY - 250, 165 * (1 - k), 490, P.wood) + rect(475 + 165 * k, GY - 250, 165 * (1 - k), 490, P.wood) + rect(240, GY - 440, 470, 30, P.gold) +
      fig({ x: lerp(475, 470, k), y: lerp(GY + 330, GY + 230, E.io(seg(lt, 1.2, dur))), s: lerp(1.4, 1, E.io(seg(lt, 1.2, dur))), pose: 'walk', ph: t * 5, facing: 1, item: 'book' }); }
  if (tags.has('commander')) add[3] += fig({ x: 170, y: GY + 20, s: 2.2, pose: 'stand', item: 'staff', facing: 1 });
  if (tags.has('ships') && !tags.has('rails') && !tags.has('procession') && !tags.has('harbour')) add[2] += [0, 1, 2].map(k => g({ transform: tf(lerp(-200 - k * 180, 520 - k * 160, E.io(u)), GY - 30 + k * 36, .55 - k * .08) }, ship({ x: 0, y: 0, t, sail: tags.has('sails_lapis') ? P.lapis : tags.has('sails_gold') ? P.gold : P.parchment }))).join('');
  if (tags.has('harbour')) add[3] += [0, 1, 2].map(k => g({ transform: tf(820 + k * 110, GY + 60 + k * 30, .45) }, ship({ x: 0, y: 0, t, sail: P.gold }))).join('');
  if (tags.has('boy_walk')) add[3] += fig({ x: lerp(900, 120, u), y: GY + 230, s: 1.2, pose: 'walk', ph: t * 6, facing: -1, head: 'cap' });
  if (tags.has('travelers') && !tags.has('look_back') && !tags.has('staff') && !tags.has('circle') && !tags.has('scribe')) {
    const out = /out (through|of)/.test(T), tg = 540;
    add[3] += walkers(3, out ? tg : -120, out ? 1000 : tg - 120, GY + 250, 1.3, E.io(u), t, { items: tags.has('bundles') ? ['bundle', 'staff', 'bundle'] : ['staff'] });
  }
  if (tags.has('staff') || tags.has('look_back')) { const x = lerp(420, 920, E.io(u)), back = tags.has('look_back') && lt > dur * .3 && lt < dur * .5;
    add[3] += fig({ x, y: GY + 240, s: 1.5, pose: back ? 'stand' : 'walk', ph: t * 6, facing: back ? -1 : 1, item: 'staff' }); }
  if (tags.has('caravan')) add[1] += [0, 1, 2, 3].map(k => camel({ x: lerp(1200, 700, u) + k * 90, y: GY - 150, s: .35, ph: t * 4 + k, facing: -1, load: k % 2 === 0 })).join('');
  if (tags.has('measure')) add[3] += pth(`M80 ${GY + 280} L140 ${GY + 160} L300 ${GY + 140} L380 ${GY + 280}Z`, P.wood) + fig({ x: 230, y: GY + 150, s: 1.8, pose: 'stand', item: 'rod' });
  if (tags.has('fortress') && !d.city) add[2] += g({ transform: tf(540, GY - 60, 1.2) }, pth('M-260 40 L-200 -140 L200 -140 L260 40Z', P.gold_dim), wallC(-190, 190, -140, 90, P.wood), towerSq(-180, -140, 70, 170, P.wood), towerSq(180, -140, 70, 170, P.wood));
  if (tags.has('riders')) add[3] += [0, 1, 2].map(k => horse({ x: lerp(1100, -200, u) + k * 130, y: GY + 230, s: .8, ph: t * 5 + k, rider: true, facing: -1, run: .5 })).join('');
  if (tags.has('banners_rise')) add[2] += [...Array(7)].map((_, k) => { const x = 60 + k * 140, s = E.back(seg(lt, .5 + k * .35, .9 + k * .35)); return g({ transform: tf(x, GY - 110 - 30 * Math.sin(k), s) }, line(0, 0, 0, -120, P.ink, 5), pth(`M0 -120 l50 ${R(8 + 4 * Math.sin(t * 4 + k))} l-8 14 l8 14 l-50 4Z`, P.gold)); }).join('');
  if (tags.has('banners_lower')) { const k = E.io(seg(lt, .5, 2.4)); add[2] += [320, 760].map(x => line(x, GY - 330, x, GY - 90, P.ink, 6) + pth(`M${x} ${R(lerp(GY - 330, GY - 150, k))} l70 10 l-10 18 l10 18 l-70 4Z`, P.gold)).join(''); }
  if (tags.has('road')) add[3] = pth(`M470 ${GY + 10} L610 ${GY + 10} L1000 ${H} L80 ${H}Z`, P.parchment_dim, { opacity: .9 }) + add[3];
  if (tags.has('dome_rock')) add[2] += circ(540, GY - 400, 140, 'url(#glow_soft)', { opacity: R(.5 + .5 * Math.sin(t * 2)) });
  if (tags.has('procession')) { const route = `M-100 ${GY + 60} Q300 ${GY - 60} 540 ${GY + 20} T1200 ${GY - 20}`;
    add[2] += pth(route, 'none', { stroke: P.gold, 'stroke-width': 8, 'stroke-dasharray': '16 14', 'stroke-dashoffset': R(-t * 40) }) +
      camel({ x: lerp(-150, 1250, seg(lt, 0, dur * .6)), y: GY + 40, s: .5, ph: t * 5, load: true }) + horse({ x: lerp(-150, 1250, seg(lt, dur * .2, dur * .8)), y: GY + 40, s: .5, ph: t * 7, rider: true }) +
      g({ transform: tf(lerp(-200, 1300, seg(lt, dur * .4, dur)), GY + 10, .4) }, ship({ x: 0, y: 0, t, sail: P.parchment })); }
  if (tags.has('rails')) { const k = E.io(u), hill = `M-400 ${GY + 200} Q200 ${GY - 180} 540 ${GY - 200} Q900 ${GY - 180} 1500 ${GY + 200}`;
    add[2] += pth(hill + `L1500 ${H} L-400 ${H}Z`, P.emerald_deep) + pth(hill, 'none', { stroke: P.wood, 'stroke-width': 10 }) + pth(hill, 'none', { stroke: P.wood_dark, 'stroke-width': 26, 'stroke-dasharray': '6 30', transform: 'translate(0 8)' }) +
      [0, 1].map(j => { const x = lerp(-100 - j * 260, 700 - j * 260, k), y = GY - 150 + Math.abs(x - 540) * .28 + (x < 540 ? 0 : 0); return g({ transform: tf(x, y - 40, .45, x < 540 ? -14 : 12) }, ship({ x: 0, y: 0, t: 0, sail: P.gold })); }).join('');
    add[3] += [...Array(5)].map((_, j) => fig({ x: lerp(300, 900, k) + j * 50, y: GY + 250, s: 1, pose: 'walk', ph: t * 4 + j, facing: 1, lean: 14 })).join('') + line(lerp(300, 900, k) - 60, GY + 150, lerp(300, 900, k) + 260, GY + 140, P.parchment_dim, 4); }
  if (tags.has('city_grow')) add[2] += [[140, 'stall'], [300, 'dome'], [460, 'school'], [640, 'stall'], [820, 'dome']].map(([x, k], j) => g({ transform: tf(x, GY + 20, E.back(seg(lt, .5 + j * .4, .9 + j * .4))) },
    k === 'stall' ? rect(-50, -60, 100, 60, P.wood) + pth('M-60 -60 L60 -60 L50 -90 L-50 -90Z', P.emerald) : k === 'dome' ? rect(-50, -70, 100, 70, P.parchment) + dome(0, -70, 100, 70, P.lapis_mist) : rect(-60, -110, 120, 110, P.parchment_dim) + iwan(0, 0, 90, 100, P.parchment_dim, P.lapis))).join('');
  if (tags.has('olive_school')) add[3] += olive(620, GY + 250, 2.6, t) + fig({ x: 520, y: GY + 250, s: 1.5, pose: 'sit', facing: -1, item: 'book' }) + [220, 330, 420].map((x, j) => fig({ x, y: GY + 260 + (j % 2) * 10, s: 1, pose: 'sit', facing: 1, item: 'board', head: 'cap' })).join('');
  if (tags.has('campfire')) add[3] += embers(475, GY + 170, t, 24, 'fire', 260) + g({ transform: tf(475, GY + 200) }, circ(0, 0, 260, 'url(#glow)', { opacity: .7 }), pth(`M-40 0 Q-30 -60 0 ${R(-110 - 15 * noise(t * 6, 1))} Q30 -60 40 0Z`, P.gold), pth('M-20 0 Q-12 -40 0 -70 Q12 -40 20 0Z', P.gold_light), line(-60, 10, 60, 0, P.wood, 10)) +
    [[270, 1, 'bread'], [690, -1, null], [360, 1, null], [600, -1, null]].map(([x, f, it], j) => fig({ x, y: GY + 250 + (j > 1 ? 40 : 0), s: j ? 1.3 : 1.5, pose: 'sit', facing: f, item: it })).join('') + [0, 1].map(j => horse({ x: 900 + j * 90, y: GY + 170, s: .6, ph: 0, run: 0, facing: -1 })).join('');
  if (tags.has('olive_grow')) add[3] += g({ transform: tf(620, GY + 240) }, olive(0, 0, 2.4 * E.back(seg(lt, .8, dur - .4)), t)) + rect(220, GY + 160, 240, 40, P.wood) + g({ transform: tf(340, GY + 90, .8) }, lampDesk(0, 0, t, 1, .6));
  if (tags.has('olives') || tags.has('green')) add[3] += [120, 380, 700, 920].map((x, j) => olive(x, GY + 260 + (j % 2) * 30, 1.4, t)).join('');
  if (tags.has('windows_glow')) add[2] += houses(-300, 1400, GY - 20, 'glowh', [P.parchment_dim], 40, 80, seg(lt, .8, 2.4));
  return add;
}
function globeSet(d, t, lt, dur, tags) {
  const r = 300, rot = lt * 20;
  let meridians = '';
  for (let k = 0; k < 8; k++) { const a = ((k * 22.5 + rot) % 180) * RAD, w = r * Math.cos(a); meridians += ell(475, 760, R(Math.abs(w)), r, 'none', { stroke: P.gold_dim, 'stroke-width': 3, opacity: .7 }); }
  const lands = [[-.3, -.2, .35], [.2, .1, .3], [.5, -.35, .2]].map(([x, y, s], k) => { const a = (x * 180 + rot) % 360 - 180, vis = Math.cos(a * RAD); return vis > 0 ? ell(475 + Math.sin(a * RAD) * r * .8, 760 + y * r, R(s * r * vis), R(s * r * .7), P.emerald_light, { opacity: .8 }) : ''; }).join('');
  let ringS = '';
  if (tags.has('globe_ring')) ringS = ell(475, 760, 420, 90, 'none', { stroke: P.gold_light, 'stroke-width': 8, 'stroke-dasharray': 1800, 'stroke-dashoffset': R(1800 * (1 - E.io(seg(lt, .4, 2)))) }) + circ(475 + 420 * Math.cos(lt * 2), 760 + 90 * Math.sin(lt * 2), 26, 'url(#glow)');
  if (tags.has('globe_thread')) for (let k = 0; k < 2; k++) ringS += ell(475, 760, 320, 120, 'none', { stroke: P.gold, 'stroke-width': 6, transform: `rotate(${-20 + k * 40} 475 760)`, 'stroke-dasharray': 1400, 'stroke-dashoffset': R(1400 * (1 - E.io(seg(lt, .4 + k * 1.2, 1.6 + k * 1.2)))) });
  return [rect(-400, -400, W + 800, H + 800, P.lapis_deep), circ(475, 760, 620, 'url(#glow_soft)', { opacity: .5 }),
    line(475, 1060, 475, 1240, P.wood, 16) + ell(475, 1250, 140, 30, P.wood) + circ(475, 760, r + 20, 'none', { stroke: P.gold_dim, 'stroke-width': 10 }) + circ(475, 760, r, P.lapis_light) + lands + meridians, ringS];
}
function pageSet(d, t, lt, dur, tags) {
  const u = E.io(seg(lt, .2, dur - .3));
  if (tags.has('map_spill')) { const k = Math.min(3, Math.floor(lt / .9)), grow = E.io(seg(lt % .9, 0, .7)), sc = [.3, .5, .75, 1][k] + (k < 3 ? .2 * grow : 0);
    const md = mapShot({ tags: ['world'], places: [] }, 5, 5, t); return [DESKBG(), md[1], g({ transform: `translate(475 780) scale(${sc.toFixed(3)}) translate(-475 -780)` }, md[2]), ''];
  }
  const p = pageSheet(90, 220, 800, 1080, { lines: !tags.has('drawings'), u });
  return [DESKBG(), circ(475, 760, 700, 'url(#glow_soft)', { opacity: .5 }), p + (tags.has('illumination') ? frameIllum(u, 130, 260, 720, 1000) : '') +
    (tags.has('drawings') ? [...Array(6)].map((_, k) => g({ transform: tf(250 + (k % 3) * 240, 560 + Math.floor(k / 3) * 360, 1, -30) }, pth('M-110 0 L110 0 M90 -14 L116 0 L90 14 M-110 0 Q-130 -20 -110 -30', 'none', { stroke: P.gold, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-dasharray': 300, 'stroke-dashoffset': R(300 * (1 - seg(lt, .4 + k * .4, 1 + k * .4))) }))).join('') : ''), ''];
}
function popupShot(i, t, o = {}) {
  const sh = SH[i], d = sh.d, lt = t - sh.start, dur = sh.end - sh.start, tags = new Set(d.tags);
  let L, outdoor = false;
  if (tags.has('globe')) L = globeSet(d, t, lt, dur, tags);
  else if (tags.has('map_spill') || tags.has('drawings') || tags.has('manuscript')) L = pageSet(d, t, lt, dur, tags);
  else if (INTERIOR.some(k => tags.has(k))) L = interior(d, t, lt, dur, tags);
  else { L = envLayers(d, t, lt, dur, tags); const a = popupElements(d, t, lt, dur, tags); L = L.map((x, k) => x + a[k]); outdoor = true; }
  if (sh.rise && !o.mini) L = L.map((x, k) => k ? g({ transform: `translate(0 ${BASE}) scale(1 ${E.back(seg(lt, .05 + .14 * k, .75 + .14 * k)).toFixed(4)}) translate(0 ${-BASE})` }, x) : x);
  const basePage = baked('popbase', [-400, BASE - 40, W + 800, H + 440 - BASE], () => pth(`M-400 ${BASE} Q200 ${BASE - 30} 540 ${BASE + 20} Q880 ${BASE - 30} 1480 ${BASE} L1480 ${H + 400} L-400 ${H + 400}Z`, 'url(#parch)') +
    line(540, BASE + 20, 540, H + 400, P.gold_dim, 4) + textLines(-100, 460, BASE + 90, 6, P.ink_soft, 1, 40) + textLines(620, 1180, BASE + 90, 6, P.ink_soft, 1, 40));
  if (!o.mini) L[3] += basePage;
  const sandOn = outdoor && ((d.layers || []).includes('dunes') || tags.has('caravan'));
  if (sandOn) L[3] += sand(t, 60, 'psand', 700, 1300);
  const c = { x: FX + 30 * Math.sin(lt * .25), y: FY, z: 1 + .05 * E.io(seg(lt, 0, dur)) };
  return layers(o.mini ? CAM0 : c, L, !o.mini);
}

// ─── الظلال الرمزية للمعارك: لا سلاح مرفوع ولا قتال ─────────────────────────
function silhouetteShot(i, t) {
  const sh = SH[i], lt = t - sh.start, dur = sh.end - sh.start, tags = new Set(sh.d.tags);
  const green = tags.has('ridges');
  const L0 = green ? sky('dusk', t, { sunX: 700, sunY: GY - 260 }) : rect(-400, -400, W + 800, GY + 600, 'url(#sky_gold)') + circ(475, GY - 120, 300, P.gold_light, { opacity: .9 }) + circ(475, GY - 120, 600, 'url(#glow_soft)');
  let L1 = '', L2 = '', L3 = '';
  if (green) { L1 = pth(ridge(GY - 160, 90, 'rg1', 1), P.emerald_deep); L2 = pth(ridge(GY - 20, 70, 'rg2', 1.3), P.emerald); L3 = pth(ridge(GY + 120, 40, 'rg3', 1.6), P.ink) +
    [0, 1, 2, 3].map(k => horse({ x: lerp(1200, -250, seg(lt, 0, dur)) + k * 150, y: GY + 150 - 20 * Math.sin(k), s: .9, ph: t * 9 + k, rider: true, facing: -1, item: k === 0 ? 'banner' : null })).join(''); }
  else L3 = pth(`M-400 ${GY + 40} Q540 ${GY} 1480 ${GY + 40} L1480 ${H + 400} L-400 ${H + 400}Z`, P.ink);
  if (tags.has('river') || tags.has('lake')) L2 += pth(`M-400 ${GY + 10} Q540 ${GY - 20} 1480 ${GY + 10} L1480 ${GY + 60} Q540 ${GY + 30} -400 ${GY + 60}Z`, P.gold_light, { opacity: .8 });
  if (tags.has('armies')) for (const [x0, f] of [[40, 1], [640, -1]]) for (let k = 0; k < 6; k++) {
    const x = x0 + k * 58 + (k % 2) * 12, s = E.back(seg(lt, .2 + k * .1, .7 + k * .1));
    L3 += fig({ x, y: GY + 60 + (k % 3) * 18, s: 1.25 * s, pose: 'stand', facing: f, item: k % 3 === 1 ? 'banner' : null, bannerCol: P.gold_dim });
  }
  if (tags.has('walls')) { const k = tags.has('gate_open') ? E.io(seg(lt, .8, dur - .3)) : 0;
    L2 += wallC(-400, 1480, GY + 20, 300, P.ink, 475, k) + [120, 830].map(x => towerSq(x, GY + 20, 120, 420, P.ink)).join('') + (k > 0 ? pth(`M430 ${GY + 20} L520 ${GY + 20} L900 ${H} L50 ${H}Z`, 'url(#glow_soft)', { opacity: R(k) }) : '');
    if (tags.has('banners')) L2 += [120, 830].map(x => g({ transform: tf(x, GY - 420, E.back(seg(lt, 1.6, 2.4))) }, line(0, 0, 0, -140, P.ink, 6), pth(`M0 -140 l70 ${R(8 + 5 * Math.sin(t * 4 + x))} l-10 18 l10 18 l-70 4Z`, P.gold))).join('');
  }
  if (tags.has('fortress_rise')) { let f = ''; for (let r = 0; r < 8; r++) { const k = seg(lt, .2 + r * .3, .5 + r * .3); if (k <= 0) break; for (let c = 0; c < 6 - Math.floor(r / 3); c++) f += rect(260 + c * 70 + (r % 2) * 35 + Math.floor(r / 3) * 35, GY - 20 - r * 50 - (1 - E.out(k)) * 80, 66, 46, P.ink, { opacity: R(k) }); }
    L2 += f + pth(`M-400 ${GY + 30} L1480 ${GY + 30} L1480 ${GY + 110} L-400 ${GY + 110}Z`, P.lapis_deep);
    if (tags.has('cannons')) L2 += [320, 520, 720].map(x => g({ transform: tf(x, GY - 20 - 8 * 50 + 30) }, rect(-40, -16, 80, 26, P.ink, { rx: 12 }), circ(-20, 14, 14, P.ink), circ(20, 14, 14, P.ink))).join(''); }
  L3 += sand(t, 40, 'silsand', 900, 1400, .8);
  return layers({ x: FX + 20 * Math.sin(lt * .3), y: FY, z: 1 + .06 * E.io(seg(lt, 0, dur)) }, [L0, L1, L2, L3]);
}

function objectShot(i, t) {
  const sh = SH[i], lt = t - sh.start, dur = sh.end - sh.start;
  return layers({ x: FX, y: FY, z: 1 + .07 * E.io(seg(lt, 0, dur)) }, obj(sh.d.object, lt, dur, t));
}
function lessonShot(i, t) {
  const sh = SH[i], lt = t - sh.start, dur = sh.end - sh.start;
  return layers({ x: FX, y: FY, z: 1 + .04 * E.io(seg(lt, 0, dur)) }, [DESKBG(), circ(475, 800, 800, 'url(#glow_soft)', { opacity: .7 }), frameIllum(E.io(seg(lt, 0, 1.2))), lesson(sh.d.emblem, lt, dur, t) + dust(t, 475, 800, 380, 560, 30, 'lessondust')]);
}
function mapShotR(i, t) {
  const sh = SH[i], lt = t - sh.start, dur = sh.end - sh.start;
  return layers({ x: FX, y: FY, z: 1 + .06 * E.io(seg(lt, 0, dur)) }, mapShot({ ...sh.d, prior: sh.prior }, lt, dur, t));
}

const RENDER = { hook: hookShot, library: libraryShot, closing: libraryShot, ident: identShot, popup: popupShot, silhouette: silhouetteShot, object: objectShot, lesson: lessonShot, map: mapShotR };
function renderShot(i, t, o = {}) { return RENDER[SH[i].type](i, t, o); }

function shotAt(t) { let lo = 0, hi = SH.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (SH[m].start <= t) lo = m; else hi = m - 1; } return lo; }
function frameSVG(t) {
  const i = shotAt(t), sh = SH[i], lt = t - sh.start, tr = sh.tr;
  let s;
  if (i > 0 && tr.kind !== 'cut' && lt < tr.dur) {
    const u = lt / tr.dur, a = renderShot(i - 1, t), b = renderShot(i, t);
    s = tr.kind === 'unfold' ? tUnfold(a, b, u, tr.ax, tr.ay) : tr.kind === 'fold' ? tFold(a, b, u, tr.ax, tr.ay) : tr.kind === 'turn' ? tTurn(a, b, u) : tr.kind === 'medallion' ? tMedallion(a, b, u) : tFade(a, b, u);
  } else s = renderShot(i, t);
  const fin = seg(t, 0, .5), fout = seg(t, PL.duration - 1.2, PL.duration);
  return s + rect(0, 0, W, H, 'url(#vignette)') + (fin < 1 ? rect(0, 0, W, H, P.ink, { opacity: R(1 - fin) }) : '') + (fout > 0 ? rect(0, 0, W, H, P.ink, { opacity: R(fout) }) : '');
}
