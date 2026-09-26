'use strict';
// ربط الصفحة: التعريفات الثابتة، حبيبات الورق، frame(t) للعارض، وفحص الألوان ومناطق الأمان للاختبار

document.getElementById('defs').innerHTML = defs();
// تحميل الخطّين قبل أول إطار: الساعة الافتراضية لا تُنهي فترة الحجب وحدها
// ثم خَبز المجموعات الثابتة: إطار لكل نوع لقطة يسجّل ما يحتاجه قبل الخَبز
window.fontsReady = Promise.all([document.fonts.load('700 100px "Reem Kufi"', 'أبطال'), document.fonts.load('500 30px "Readex Pro"', 'أبطال')])
  .then(async () => { const seen = new Set(); SH.forEach((s, i) => { if (!seen.has(s.type)) { seen.add(s.type); frameSVG((s.start + s.end) / 2); } }); await bakeAll(); return [...document.fonts].filter(f => f.status !== 'loaded').map(f => f.family); });
(() => {
  const c = document.getElementById('grain'), x = c.getContext('2d'), img = x.createImageData(c.width, c.height), r = rng('grain');
  const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)), lite = hex(P.parchment), dark = hex(P.ink);
  for (let i = 0; i < img.data.length; i += 4) { const v = r(), col = v > .5 ? lite : dark; img.data.set([...col, Math.floor(18 * Math.abs(v - .5) * 2)], i); }
  x.putImageData(img, 0, 0);
})();
const STAGE_EL = document.getElementById('s');
window.frame = t => { STAGE_EL.innerHTML = frameSVG(t); };
window.shotAtTime = t => { const i = shotAt(t); return { i, id: SH[i].id, type: SH[i].type }; };
// بصمة الهيكلين بوضع قياسي: يجب أن تتطابق في كل الحلقات
window.rigHash = () => hash(faris({ x: 0, y: 0, p: { ...FP0 }, t: 0, blink: 0, mouth: { v: 0 } }) + grandpa({ x: 0, y: 0, p: { ...GP0 }, t: 0, blink: 0, mouth: { v: 0 } })).toString(16);

// كل لون حرفي في الإطار يجب أن يكون من لوحة النظام؛ والشخصيات والنصوص داخل صندوق الأمان
window.audit = t => {
  window.frame(t);
  const svg = STAGE_EL.innerHTML + document.getElementById('defs').innerHTML, allowed = new Set(Object.values(P).map(v => v.toLowerCase()));
  const bad = [...new Set((svg.match(/#[0-9a-fA-F]{6}\b/g) || []).map(v => v.toLowerCase()).filter(v => !allowed.has(v)))];
  const named = [...new Set((svg.match(/(?:fill|stroke|stop-color|flood-color)="(?!none|url\(|#)([^"]+)"/g) || []))];
  const out = [];
  for (const el of STAGE_EL.querySelectorAll('[data-safe], text')) {
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1 || b.right < 0 || b.bottom < 0 || b.left > W || b.top > H) continue;
    if (b.right > SAFE.x1 + 1 || b.bottom > SAFE.y1 + 1) out.push({ el: el.getAttribute('data-safe') || el.textContent.slice(0, 16), right: Math.round(b.right), bottom: Math.round(b.bottom) });
  }
  return { bad, named, unsafe: out, shot: SH[shotAt(t)].id };
};
