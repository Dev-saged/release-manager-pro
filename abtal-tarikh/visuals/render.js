// عارض حتمي: Chromium بساعة افتراضية مثبّتة، يرسم الإطارات [from, to) واحداً واحداً ويمرّر PNG إلى ffmpeg
// node render.js <job.json>
const fs = require('fs');
const { spawn } = require('child_process');
const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const { chromium } = require(job.playwright);

(async () => {
  const browser = await chromium.launch({ args: job.chromium_args, executablePath: job.chromium || undefined });
  const page = await browser.newPage({ viewport: { width: job.w, height: job.h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: 0 });
  await page.goto('file://' + job.page, { waitUntil: 'load' });
  const missing = await page.evaluate(() => window.fontsReady);
  if (missing.length) throw new Error('fonts not loaded: ' + missing.join(', '));
  const cdp = await page.context().newCDPSession(page);
  const out = [];
  let ff = null, done = null;
  if (job.video) {
    ff = spawn(job.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(job.fps), '-c:v', job.capture === 'png' ? 'png' : 'mjpeg', '-i', '-',
      '-c:v', job.vcodec, '-preset', job.preset, '-crf', String(job.crf), '-pix_fmt', job.pix_fmt, '-r', String(job.fps), '-g', String(job.fps * 2), job.video], { stdio: ['pipe', 'inherit', 'inherit'] });
    done = new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg exit ' + c)) : res())));
  }
  const t0 = Date.now();
  const list = job.list || Array.from({ length: job.to - job.from }, (_, k) => job.from + k);
  for (const f of list) {
    await page.clock.setFixedTime(Math.round(f * 1000 / job.fps));
    await page.evaluate(t => window.frame(t), f / job.fps);
    const shot = await cdp.send('Page.captureScreenshot', { format: job.capture, quality: job.capture === 'jpeg' ? 95 : undefined, optimizeForSpeed: true });
    const buf = Buffer.from(shot.data, 'base64');
    if (ff) { if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
    if (job.stills) { const p = job.stills.replace('%f', String(f).padStart(5, '0')); fs.writeFileSync(p, buf); out.push(p); }
    if (errors.length) break;
    if (!job.list && (f - job.from) % 150 === 149) process.stdout.write(JSON.stringify({ progress: f + 1, of: job.to, fps: +((f - job.from + 1) / ((Date.now() - t0) / 1000)).toFixed(2) }) + '\n');
  }
  if (ff) { ff.stdin.end(); await done; }
  const audit = job.audit ? await page.evaluate(ts => ts.map(t => window.audit(t)), job.audit) : null;
  const rig = job.rig ? await page.evaluate(() => window.rigHash()) : null;
  await browser.close();
  process.stdout.write(JSON.stringify({ done: true, frames: list.length, errors, stills: out, audit, rig, seconds: (Date.now() - t0) / 1000 }) + '\n');
  if (errors.length) process.exit(2);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
