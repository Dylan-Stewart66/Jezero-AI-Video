// Automated layout check, run before every review stop.
//   node scripts/check-layout.mjs                      checks the built range every 0.1s, writes review/contact-sheet.png
//   node scripts/check-layout.mjs --from 0 --to 60     check a given range
//   node scripts/check-layout.mjs --frames 1,2.5,3.9   also save full-size frames to review/frames/
// Fails (exit code 1) with timestamps if text overlaps or sits closer than 24px, leaves the safe area,
// a label crowds a world object or more than 3 labels show, contrast falls below 4.5:1 against the
// rendered world, or two text blocks share a layout slot at the same moment.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const STEP = 0.1, MIN_GAP = 24, MIN_CONTRAST = 4.5;
const SAFE = { x0: 120, x1: 1800, y0: 96, y1: 984 };
const root = fileURLToPath(new URL('../', import.meta.url));
const url = pathToFileURL(root + 'jezero-ai-launch-film.html').href;

const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('page:', m.text()); });
await page.goto(url + '?check', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready, null, { timeout: 60000 }).catch(e => { console.log('The film did not start. Page errors:\n  ' + (pageErrors.join('\n  ') || 'none')); process.exit(1); });
await page.evaluate(() => window.__ready);
const built = await page.evaluate(() => window.BUILT);
const t0 = +opt('from', built[0]), t1 = +opt('to', built[1]);

/* ---------- Sample every frame in the page ---------- */
const frames = await page.evaluate(({ t0, t1, STEP }) => {
  const out = [];
  for (let k = 0; ; k++) {
    const t = +(t0 + k * STEP).toFixed(3);
    if (t > t1 + 1e-6) break;
    window.seek(t);
    const L = window.__layout();
    for (const b of L.blocks) if (b.vis >= 0.99) b.bg = b.lines.map(r => window.__bgLum(r.x, r.y, r.w, r.h));
    for (const c of L.chrome) if (c.text && c.vis >= 0.99) c.bg = window.__bgLum(c.rect.x, c.rect.y, c.rect.w, c.rect.h);
    out.push(L);
  }
  return out;
}, { t0, t1, STEP });

/* ---------- Rules ---------- */
const fails = [];
const fail = (t, rule, what) => fails.push({ t, rule, what });
const sep = (a, b) => Math.hypot(Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0), Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0));
const ratio = (fg, bg) => (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
for (const f of frames) {
  const t = +f.t.toFixed(2);
  const items = [
    ...f.blocks.map(b => ({ id: b.id, rects: b.lines })),
    ...f.chrome.map(c => ({ id: c.id, rects: [c.rect] })),
  ];
  // Spacing and overlap between different text elements
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    let d = Infinity;
    // A word crossfading into its own tracker label shares a group with it and is not a clash
    for (const a of items[i].rects) for (const b of items[j].rects) if (!(a.group && a.group === b.group)) d = Math.min(d, sep(a, b));
    if (d < MIN_GAP) fail(t, d === 0 ? 'overlap' : 'closer than 24px', `${items[i].id} / ${items[j].id} (${d.toFixed(0)}px)`);
  }
  // Safe area (persistent chrome is the agreed exception)
  for (const b of [...f.blocks, ...f.labels.map(l => ({ id: l.id, lines: [l.rect] }))])
    for (const r of b.lines)
      if (!r.group && (r.x < SAFE.x0 - 0.5 || r.y < SAFE.y0 - 0.5 || r.x + r.w > SAFE.x1 + 0.5 || r.y + r.h > SAFE.y1 + 0.5))
        fail(t, 'outside safe area', `${b.id} at ${r.x.toFixed(0)},${r.y.toFixed(0)} ${r.w.toFixed(0)}x${r.h.toFixed(0)}`);
  // Labels
  if (f.labels.length > 3) fail(t, 'more than 3 labels', f.labels.map(l => l.id).join(', '));
  for (const l of f.labels) for (const o of f.objects) {
    const d = sep(l.rect, o.rect);
    if (d < MIN_GAP) fail(t, 'label crowds an object', `${l.id} / ${o.id} (${d.toFixed(0)}px)`);
  }
  // Contrast against the rendered world
  for (const b of f.blocks) if (b.bg) b.bg.forEach((bg, i) => {
    const c = ratio(b.lum, bg.p95);
    if (c < MIN_CONTRAST) fail(t, 'contrast below 4.5:1', `${b.id} line ${i + 1}: ${c.toFixed(2)}:1`);
  });
  for (const c of f.chrome) if (c.bg) {
    const k = ratio(c.lum, c.bg.p95);
    if (k < MIN_CONTRAST) fail(t, 'contrast below 4.5:1', `${c.id}: ${k.toFixed(2)}:1`);
  }
  // One block per slot
  const slots = {};
  for (const b of f.blocks) (slots[b.slot] = slots[b.slot] || []).push(b.id);
  for (const [s, ids] of Object.entries(slots)) if (ids.length > 1) fail(t, 'slot shared', `${s}: ${ids.join(', ')}`);
}

/* ---------- Report ---------- */
const groups = new Map();
for (const x of fails) { const k = x.rule + ' | ' + x.what.replace(/\(.*\)|: [\d.]+:1|at .*$/, '').trim(); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); }
const spans = ts => { const out = []; let a = ts[0], p = ts[0]; for (const t of ts.slice(1)) { if (t - p > STEP * 1.5) { out.push([a, p]); a = t; } p = t; } out.push([a, p]); return out.map(([x, y]) => x === y ? `${x}s` : `${x}s to ${y}s`).join(', '); };
console.log(`Checked ${frames.length} frames from ${t0}s to ${t1}s.`);
if (pageErrors.length) console.log('Page errors:\n  ' + pageErrors.join('\n  '));
if (!fails.length) console.log('PASS: no layout problems.');
else {
  console.log(`FAIL: ${fails.length} problems`);
  for (const [k, xs] of groups) console.log(`  ${k}\n    ${spans(xs.map(x => x.t))}\n    e.g. ${xs[0].what}`);
}

/* ---------- Contact sheet: one frame per second ---------- */
mkdirSync(root + 'review/frames', { recursive: true });
const shots = [];
for (let s = Math.ceil(t0); s <= t1; s++) {
  await page.evaluate(t => window.seek(t), s);
  shots.push({ s, img: (await page.screenshot({ type: 'jpeg', quality: 82 })).toString('base64') });
}
for (const t of (opt('frames', '') || '').split(',').filter(Boolean).map(Number)) {
  await page.evaluate(x => window.seek(x), t);
  await page.screenshot({ path: `${root}review/frames/t-${t.toFixed(2)}.png` });
}
const cols = 6, tw = 320, th = 180;
const html = `<body style="margin:0;background:#0b0e15;font:500 15px/1 'Geist Mono',monospace;color:#9aa6bf">
  <div style="display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:0">${shots.map(x =>
  `<figure style="margin:0;padding:0 0 10px"><img src="data:image/jpeg;base64,${x.img}" style="display:block;width:${tw}px;height:${th}px">
   <figcaption style="padding:6px 8px 0">${x.s}s</figcaption></figure>`).join('')}</div></body>`;
await page.setViewportSize({ width: cols * tw, height: Math.max(1, Math.ceil(shots.length / cols)) * (th + 31) });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: root + 'review/contact-sheet.png', fullPage: true });
console.log(`Contact sheet: review/contact-sheet.png (${shots.length} frames)`);
await browser.close();
process.exit(fails.length || pageErrors.length ? 1 : 0);
