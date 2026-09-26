// لقطة PNG لصفحة HTML محلية بمقاس محدّد بعد تحميل الخطوط
// node snap.js <playwright_dir> <html> <png> <width> <height>
const [pwDir, html, png, w, h] = process.argv.slice(2);
const { chromium } = require(pwDir);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const faces = await page.evaluate(() => [...document.fonts].map(f => `${f.family}:${f.status}`));
  await page.screenshot({ path: png });
  await browser.close();
  console.log(JSON.stringify({ faces, errors }));
})().catch(e => { console.error(e.message); process.exit(1); });
