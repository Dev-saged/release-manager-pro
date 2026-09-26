'use strict';
// خرائط رقّية: سواحل مبسّطة (طول، عرض) لبحار العالم القديم، ومسارات ذهبية منقّطة تُرسم تدريجياً مع علامات ومسافرين

const SEAS = {
  atlantic: [-60, 75, 10, 75, 5, 62, 5, 58, 8, 57, 8.5, 54, 4.5, 52.5, 2.5, 51.1, 1.6, 50.2, -1.5, 49.6, -4.7, 48.5, -1.2, 46.2, -1.8, 43.4, -8, 43.7, -9.4, 39, -8.9, 37, -6.3, 36.5, -5.6, 36.05,
    -5.9, 35.8, -6.8, 34, -7.6, 33.6, -9.6, 30.4, -13.2, 27.7, -16, 23.7, -17, 21, -17.4, 14.7, -13.7, 9.5, -7.5, 4.4, -1, 5, 3.4, 6.4, 9.7, 4, 9.3, 0, 12.2, -6, 13.2, -8.8, 11.8, -17, 14.5, -22.9, 18.4, -34.3, 20, -45, -60, -45],
  indian: [20, -45, 18.4, -34.3, 26, -33.8, 31, -29.9, 32.6, -25.9, 35.5, -21, 40.5, -15, 39.3, -6.8, 39.7, -4, 45.3, 2, 51.2, 11.8, 43.5, 11.6, 43.3, 12.8, 45, 12.8, 52, 15.6, 55, 17, 59.8, 22.5, 58.6, 23.6, 56.3, 26.4,
    54.4, 24.4, 51.6, 24.2, 51.5, 25.9, 50.8, 24.7, 50, 26.5, 47.9, 29.4, 48, 30, 50.3, 29.9, 51, 28.5, 54, 26.8, 56.3, 27.2, 61.6, 25.2, 67, 24.8, 69, 22.4, 72.8, 21.1, 72.8, 19, 73.8, 15.4, 76.3, 9.9, 77.5, 8.1,
    80.3, 13.1, 82.3, 16.9, 86.9, 20.3, 88.3, 21.8, 91.8, 22.3, 94.3, 16, 97.6, 16.5, 98.4, 8, 100.3, 5.4, 103.8, 1.3, 105, -10, 115, -45],
  pacific: [103.8, 1.3, 103.4, 4.5, 100.9, 13.4, 102.3, 12.2, 105, 8.6, 109.2, 12.2, 108.2, 16, 106.7, 20.7, 109.5, 21.5, 113.3, 22.2, 116.7, 23.3, 118.6, 24.9, 121.5, 28.5, 121.8, 31.2, 120.3, 34.3, 119.2, 35,
    122.5, 37.4, 118, 38.5, 117.7, 39, 121.5, 40.9, 124.3, 39.9, 126.3, 34.5, 129.3, 35.3, 129.5, 38, 128.4, 41, 130.7, 42.3, 135, 45, 142, 52, 160, 60, 180, 60, 180, -45, 115, -45, 105, -10],
  med: [-5.6, 36, -4.4, 36.7, -2.4, 36.8, -1, 37.6, -0.3, 39.5, 2.2, 41.4, 3.5, 43.3, 5.4, 43.3, 8.9, 44.4, 10.3, 43.5, 12.3, 41.7, 14.3, 40.8, 15.6, 38, 17.2, 40.4, 18.5, 40.1, 16.9, 41.1, 13.5, 43.6, 12.3, 45.4,
    13.8, 45.6, 16.4, 43.5, 18.1, 42.6, 19.4, 41, 20.5, 39.3, 21.7, 36.8, 22.9, 36.4, 23.7, 37.9, 22.9, 40.6, 26.4, 40.1, 27.1, 38.4, 27.4, 37, 30.7, 36.9, 32.5, 36.1, 34.6, 36.8, 36.2, 36.6, 35.8, 35.5, 35.5, 33.9,
    35, 32.8, 34.4, 31.5, 32.3, 31.3, 29.9, 31.2, 23.9, 32.1, 20.1, 32.1, 19, 30.4, 16.6, 31.2, 13.2, 32.9, 10.1, 33.9, 10.8, 34.7, 11, 37.1, 9.9, 37.3, 7.8, 36.9, 3.1, 36.8, -0.6, 35.7, -2.9, 35.3, -5.3, 35.9],
  black: [29, 41.2, 28, 42.5, 28.7, 44.2, 30.7, 46.5, 33.5, 44.5, 35.5, 45.3, 37.8, 44.7, 41.6, 41.6, 39.7, 41, 36.3, 41.3, 35.1, 42, 31.5, 41.2],
  caspian: [47, 44.6, 49.5, 46.5, 51.5, 47, 53, 45.3, 51.3, 44.2, 52.8, 42, 53.9, 40.7, 53, 39, 54, 37.3, 51.5, 36.8, 49, 37.6, 49.4, 40.3, 47.8, 42.5],
  red: [32.5, 29.9, 34.3, 27.8, 35, 29.5, 39.1, 21.5, 42.8, 15, 43.4, 12.6, 39.5, 15.5, 37.2, 19.6, 35.6, 23.9, 33.9, 26.9],
  baltic: [9.5, 54.5, 12, 54.2, 14, 54, 18, 54.8, 21, 55, 21, 57, 24, 57.5, 24, 59.5, 30, 60, 23, 60.3, 21, 61, 17.5, 60.5, 18.5, 59.3, 16.5, 57, 14.5, 56, 12.5, 56, 10.5, 57.5],
  aral: [58.3, 46.5, 61.5, 46.7, 61.9, 45, 60.5, 43.8, 58.5, 44.2, 58.2, 45.5],
};
const ISLES = [
  [-5.7, 50, 1.4, 51.2, 1.7, 52.7, 0.1, 53.5, -1.6, 55.6, -2, 57.7, -5, 58.6, -6.2, 56.3, -4.9, 54.8, -3, 53.4, -4.7, 52.8, -5.3, 51.7],
  [-10, 51.6, -6, 52.2, -6, 54.2, -8.2, 55.2, -10, 54],
  [12.4, 38.1, 15.6, 38.3, 15.1, 36.7, 12.5, 37.6], [8.4, 39, 9.8, 39.2, 9.7, 41.1, 8.2, 40.9], [8.6, 41.4, 9.5, 41.4, 9.4, 43, 8.6, 42.5],
  [23.5, 35.3, 26.3, 35.3, 26, 35, 23.6, 35.1], [32.3, 35, 34.6, 35.7, 33.9, 34.6, 32.4, 34.7],
  [80, 9.8, 81.8, 7.5, 80.6, 5.9, 79.8, 7], [44, -12, 50.4, -15.5, 47, -25, 43.3, -22],
];
const RIVERS = [
  [31.2, 31.4, 31.2, 30, 31, 27, 32.9, 24.1, 33, 22, 30.5, 19.5, 32.5, 15.6],
  [48, 30, 47, 31, 45.8, 32.5, 44.4, 33.3, 43.7, 34.6, 43.1, 36.3, 42.5, 37.3],
  [47, 31, 45, 32, 43.5, 33.4, 41, 34.4, 38.6, 36, 38.3, 37.5],
  [60.3, 43.7, 61, 41.9, 62.4, 40.6, 64, 39.3, 65.5, 37.9, 67.8, 37.2, 68.9, 37.3],
  [-10.5, 12, -7.5, 13.5, -4, 15.5, -3, 16.8, -0.5, 16.3, 1.5, 14, 3.4, 11.8, 6.7, 7.8, 6.4, 4.5],
  [-6.3, 36.8, -5.9, 37.4, -4.8, 37.9, -3.6, 38], [-9.2, 38.7, -6.9, 39.5, -4, 39.86, -2.5, 40.4],
];
const REGIONS = { cairo: [25, 31.5, 34, 31.5, 35, 28, 33, 22, 25, 22], damascus: [35, 36.8, 42, 37, 41, 32, 35.2, 31, 34.3, 31.5] };
const SHEET = [70, 230, 830, 1080];

function mapProj(places, tags) {
  const pts = places.map(p => PL.places[p]).filter(Boolean);
  let lo0 = Math.min(...pts.map(p => p[0])), lo1 = Math.max(...pts.map(p => p[0])), la0 = Math.min(...pts.map(p => p[1])), la1 = Math.max(...pts.map(p => p[1]));
  if (!pts.length || tags.includes('world') || tags.includes('many_markers')) [lo0, lo1, la0, la1] = [-18, 122, 5, 55];
  if (tags.includes('north_africa')) [lo0, lo1, la0, la1] = [-14, 16, 26, 44];
  if (tags.includes('ships_approach')) [lo0, lo1, la0, la1] = [8, 28, 26, 40];
  const pad = Math.max(4, (lo1 - lo0) * .12), cl = Math.max(12, lo1 - lo0 + 2 * pad), ca = Math.max(10, la1 - la0 + 2 * pad);
  const mlo = (lo0 + lo1) / 2, mla = (la0 + la1) / 2, cosl = Math.cos(mla * RAD);
  const k = Math.min((SHEET[2] - 80) / (cl * cosl), (SHEET[3] - 120) / ca);
  const cx = SHEET[0] + SHEET[2] / 2, cy = SHEET[1] + SHEET[3] / 2;
  return (lon, lat) => [cx + (lon - mlo) * k * cosl, cy - (lat - mla) * k];
}
const polyD = (arr, pr) => { let d = ''; for (let i = 0; i < arr.length; i += 2) { const [x, y] = pr(arr[i], arr[i + 1]); d += (i ? 'L' : 'M') + R(x) + ' ' + R(y); } return d + 'Z'; };

// مسار منحنٍ بين المدن مع أخذ عيّنات لرسمه تدريجياً
function routePts(places, pr) {
  const P0 = places.map(p => pr(...PL.places[p])), out = [];
  for (let i = 0; i < P0.length - 1; i++) {
    const [a, b] = [P0[i], P0[i + 1]], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
    const c = [mx - dy * .18 * (i % 2 ? -1 : 1), my + dx * .18 * (i % 2 ? -1 : 1)];
    for (let k = 0; k < 40; k++) { const u = k / 40, v = 1 - u; out.push([v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1], i + u]); }
  }
  if (P0.length) out.push([...P0[P0.length - 1], P0.length - 1]);
  return out;
}
function mapShot(d, lt, dur, t) {
  const tags = d.tags || [], places = d.places || [], pr = mapProj(places.length ? places : ['cairo'], tags);
  const [sx, sy, sw, sh] = SHEET, clip = `<clipPath id="mapclip"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}"/></clipPath>`;
  const base = paper(`M${sx - 20} ${sy - 20} L${sx + sw + 20} ${sy - 20} L${sx + sw + 20} ${sy + sh + 20} L${sx - 20} ${sy + sh + 20}Z`, P.parchment, 12);
  let geo = rect(sx, sy, sw, sh, P.parchment);
  for (const k in SEAS) geo += pth(polyD(SEAS[k], pr), 'url(#hatch)', { stroke: P.gold_dim, 'stroke-width': 3 });
  for (const a of ISLES) geo += pth(polyD(a, pr), P.parchment, { stroke: P.gold_dim, 'stroke-width': 3 });
  for (const a of RIVERS) { let dd = ''; for (let i = 0; i < a.length; i += 2) { const [x, y] = pr(a[i], a[i + 1]); dd += (i ? 'L' : 'M') + R(x) + ' ' + R(y); } geo += pth(dd, 'none', { stroke: P.lapis_light, 'stroke-width': 4, 'stroke-linejoin': 'round' }); }
  if (tags.includes('graticule')) { const u = seg(lt, .4, 2); for (let lon = -30; lon <= 150; lon += 15) { const [x0, y0] = pr(lon, -10), [x1, y1] = pr(lon, 70); geo += line(x0, lerp(y1, y0, u), x1, y1, P.gold, 2, { opacity: .6 }); }
    for (let lat = 0; lat <= 60; lat += 15) { const [x0, y0] = pr(-30, lat), [x1] = pr(150, lat); geo += line(x0, y0, lerp(x0, x1, u), y0, P.gold, 2, { opacity: .6 }); } }
  if (tags.includes('stitch')) {
    const k = E.io(seg(lt, .3, 1.8)), [ax] = pr(31, 30), [bx] = pr(38, 34);
    geo += g({ transform: `translate(${R(-60 * (1 - k))} 0)` }, pth(polyD(REGIONS.cairo, pr), P.gold_light, { opacity: .55, stroke: P.gold, 'stroke-width': 4 })) +
      g({ transform: `translate(${R(60 * (1 - k))} 0)` }, pth(polyD(REGIONS.damascus, pr), P.emerald_light, { opacity: .55, stroke: P.emerald, 'stroke-width': 4 }));
    if (k > .9) { const [x0, y0] = pr(34.6, 31.3), [x1, y1] = pr(35.2, 33.5); let z = `M${R(x0)} ${R(y0)}`; for (let i = 1; i <= 8; i++) z += `L${R(lerp(x0, x1, i / 8) + (i % 2 ? 14 : -14))} ${R(lerp(y0, y1, i / 8))}`;
      geo += pth(z, 'none', { stroke: P.gold, 'stroke-width': 6, 'stroke-dasharray': 600, 'stroke-dashoffset': R(600 * (1 - seg(lt, 1.8, 2.8))) }); }
  }
  // المسار: نقاط ذهبية حتى رأسٍ متوهّج
  let route = '', head = null;
  const draw = tags.includes('route') || tags.includes('hops') || tags.includes('caravan') || tags.includes('book') || tags.includes('digits');
  if (draw && places.length > 1) {
    const pts = routePts(places, pr), prior = d.prior ? routePts(d.prior, pr) : [];
    for (let i = 0; i < prior.length; i += 3) route += circ(prior[i][0], prior[i][1], 5, P.gold_dim);
    const u = E.io(seg(lt, .3, Math.max(1.2, dur - .8))), n = Math.floor(u * (pts.length - 1));
    for (let i = 0; i <= n; i += 3) route += circ(pts[i][0], pts[i][1], 6, P.gold);
    head = pts[n];
    route += circ(head[0], head[1], 40, 'url(#glow)') + circ(head[0], head[1], 9, P.gold_light);
    const who = tags.includes('caravan') ? 'caravan' : tags.includes('rider') ? 'rider' : tags.includes('digits') ? 'digits' : tags.includes('book') ? 'book' : null;
    if (who) { const hd = pts[Math.min(pts.length - 1, n + 2)], f = hd[0] >= head[0] ? 1 : -1;
      route += who === 'caravan' ? camel({ x: head[0], y: head[1] - 6, s: .32, ph: t * 5, facing: f, load: true }) + camel({ x: head[0] - 40 * f, y: head[1] - 2, s: .28, ph: t * 5 + 1, facing: f })
        : who === 'rider' ? horse({ x: head[0], y: head[1] - 4, s: .34, ph: t * 7, rider: true, facing: f })
          : who === 'digits' ? txt(head[0], head[1] - 26, '١٢٣', { 'font-family': 'Reem Kufi', 'font-size': 44, fill: P.lapis })
            : g({ transform: tf(head[0], head[1] - 30) }, rect(-22, -28, 44, 56, P.lapis, { rx: 4 }), rect(-16, -22, 32, 44, 'none', { stroke: P.gold, 'stroke-width': 3 })); }
  }
  // العلامات: تتوهّج حين يبلغها المسار أو بالتتابع
  let marks = '';
  const seq = tags.includes('many_markers') || !draw;
  places.forEach((p, i) => {
    if (!PL.places[p] || !PL.places[p][2]) return;
    const [x, y] = pr(PL.places[p][0], PL.places[p][1]);
    const on = seq ? seg(lt, .4 + i * (places.length > 4 ? .25 : .5), .8 + i * (places.length > 4 ? .25 : .5)) : (head && head[2] >= i - .02 ? 1 : 0);
    if (!on) return;
    const s = E.back(on);
    marks += circ(x, y, 46 * s, 'url(#glow)', { opacity: .8 }) + circ(x, y, 12 * s, P.gold, { stroke: P.lapis_deep, 'stroke-width': 3 }) +
      (places.length <= 6 || i % 2 === 0 ? label(x, y - 24, PL.places[p][2], 28, P.lapis_deep) : '');
  });
  if (tags.includes('circle') && places[0]) { const [x, y] = pr(...PL.places[places[0]]), L = TAU * 110;
    marks += circ(x, y, 110, 'none', { stroke: P.gold, 'stroke-width': 10, 'stroke-dasharray': R(L), 'stroke-dashoffset': R(L * (1 - E.io(seg(lt, .4, 1.8)))) }); }
  if (tags.includes('ships_approach')) { const k = E.io(seg(lt, .2, dur - .3)), [bx, by] = pr(20.07, 32.12);
    marks += [0, 1, 2].map(i => g({ transform: tf(lerp(bx - 200 + i * 120, bx - 60 + i * 60, k), lerp(sy + 120 + i * 40, by - 80, k), .22) }, ship({ x: 0, y: 0, t, hull: P.ink, sail: P.ink_soft }))).join(''); }
  if (tags.includes('north_africa')) marks += label(...pr(0, 30), 'شمال إفريقيا', 40, P.wood);
  const rose = g({ transform: tf(sx + sw - 90, sy + sh - 100, 1, 12 * Math.sin(t * .4)) }, circ(0, 0, 54, P.parchment_dim, { stroke: P.gold, 'stroke-width': 4 }), pth('M0 -50 L10 0 L0 50 L-10 0Z', P.lapis), pth('M-50 0 L0 10 L50 0 L0 -10Z', P.gold_dim));
  const frame = rect(sx, sy, sw, sh, 'none', { stroke: P.gold, 'stroke-width': 8 }) + rect(sx + 14, sy + 14, sw - 28, sh - 28, 'none', { stroke: P.gold_dim, 'stroke-width': 2 });
  return [DESKBG(), circ(475, 780, 800, 'url(#glow_soft)', { opacity: .5 }) + base, clip + g({ 'clip-path': 'url(#mapclip)' }, geo, route, marks) + frame + rose, ''];
}
