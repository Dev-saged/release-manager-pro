// قياس عرض النصوص بخطّ الترجمة في Chromium (تشكيل HarfBuzz) لتقطيع الأسطر داخل منطقة الأمان
// node measure.js <job.json>  →  {widths: [...]}
const fs = require('fs');
const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const { chromium } = require(job.playwright);
(async () => {
  const browser = await chromium.launch({ args: job.chromium_args });
  const page = await browser.newPage();
  const font = fs.readFileSync(new URL(job.font_url)).toString('base64');
  const widths = await page.evaluate(async ({ items, css, font }) => {
    const bin = Uint8Array.from(atob(font), c => c.charCodeAt(0));
    const face = new FontFace('M', bin.buffer);
    document.fonts.add(await face.load());
    const c = document.createElement('canvas').getContext('2d');
    c.font = css.replace('%f', 'M');
    c.direction = 'rtl';
    return items.map(s => c.measureText(s).width);
  }, { items: job.items, css: job.css, font });
  await browser.close();
  process.stdout.write(JSON.stringify({ widths }));
})().catch(e => { console.error(e.message); process.exit(1); });
