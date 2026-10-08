// Final export: the film as one MP4, 3840 x 2160 at 60fps, near-lossless H.264.
//
//   node scripts/build.mjs && node scripts/render.mjs         the whole loop -> jezero-ai-launch-film-4k.mp4
//   node scripts/render.mjs --from 19 --to 21 --out test.mp4   a stretch, for testing
//
// Every frame is rendered by Chrome at a real device scale factor of 2 (1920 x 1080 CSS pixels, so the text,
// logos and SVG are drawn at 4K, not upscaled) and the world at ?record&scale=2 (a 3840 x 2160 backing store).
//
// Motion blur: each frame is the average of --sub subframes spread evenly over a --shutter degree shutter centred on
// the frame's time, blended in linear light. Where nothing moves the subframes are identical and the frame is the
// browser's render byte for byte (a whole still frame is copied, not averaged; a still pixel in a moving frame comes
// back to its exact value), so only moving things are blurred.
//
// Phase 1 writes the blended frames as lossless PNGs to --frames (default render-frames/), in order, one browser per
// --workers lane. It can be stopped and resumed: finished frames are kept and each lane re-plays a second of the film
// before the first frame it still needs. Phase 2 encodes them: libx264, yuv420p (BT.709, limited range), --crf 10,
// --preset veryslow. The frames are deleted after a successful encode unless --keep-frames is given.
//
// Options: --fps 60  --sub 8  --shutter 180  --crf 10  --preset veryslow  --workers 3  --frames render-frames
//          --preroll 1 (seconds re-played before a lane's first frame)  --keep-frames  --encode-only
//          --ffmpeg /path/to/ffmpeg (default: ffmpeg-static)
import { chromium } from 'playwright';
import sharp from 'sharp';
import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const flag = n => argv.includes('--' + n);
const root = fileURLToPath(new URL('../', import.meta.url));
const FPS = +opt('fps', 60), SUB = +opt('sub', 8), SHUTTER = +opt('shutter', 180);
const PREROLL = +opt('preroll', 1);
const CRF = opt('crf', '10'), PRESET = opt('preset', 'veryslow'), WORKERS = +opt('workers', 3);
const OUT = opt('out', 'jezero-ai-launch-film-4k.mp4');
const DIR = resolve(root, opt('frames', 'render-frames'));
const FFMPEG = opt('ffmpeg', ffmpegStatic);
const CSS_W = 1920, CSS_H = 1080, DSF = 2, PX_W = CSS_W * DSF, PX_H = CSS_H * DSF;
const FILM = join(root, 'jezero-ai-launch-film.html');
const URL_ = pathToFileURL(FILM).href + '?record&scale=2';

// Recording only: text lines carry will-change: transform for live playback, which makes Chrome keep a line's raster
// from mid-animation (a scale or sub-pixel offset) and resample it once the line has settled, a touch softer than a
// fresh render. Without the hint every frame's text is drawn exactly as a direct render of that moment.
const RECORD_CSS = '.tb .lt{will-change:auto !important}';

/* ---------- Linear-light blending, exact for still pixels ---------- */
const toLin = v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const toSrgb = l => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
const Q = 65535;
const DEC = Float32Array.from({ length: 256 }, (_, v) => toLin(v));
const ENC = Uint8Array.from({ length: Q + 1 }, (_, i) => Math.round(255 * toSrgb(i / Q)));
for (let v = 0; v < 256; v++) if (ENC[Math.round(DEC[v] * Q)] !== v) throw new Error('blend tables are not exact at ' + v);

/** Subframe times for frame f: SUB samples evenly over the open shutter, centred on f / FPS */
const subTimes = f => Array.from({ length: SUB }, (_, k) => f / FPS + ((k + 0.5) / SUB - 0.5) * (SHUTTER / 360) / FPS);
const framePath = f => join(DIR, String(f).padStart(5, '0') + '.png');

async function openFilm() {
  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', `--force-device-scale-factor=${DSF}`, `--window-size=${CSS_W},${CSS_H + 200}`],
  });
  const ctx = await browser.newContext({ viewport: null });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const cdp = await ctx.newCDPSession(page);
  // Size the window so the page itself is exactly 1920 x 1080 CSS pixels (the window's frame takes some height)
  await page.goto('about:blank');
  const { windowId } = await cdp.send('Browser.getWindowForTarget');
  const frame = await page.evaluate(() => [outerWidth - innerWidth, outerHeight - innerHeight]);
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: CSS_W + frame[0], height: CSS_H + frame[1] } });
  await page.goto(URL_, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 }).catch(() => { throw new Error('the film did not start: ' + (errors.join('; ') || 'no page errors')); });
  await page.evaluate(() => window.__ready);
  await page.addStyleTag({ content: RECORD_CSS });
  const env = await page.evaluate(() => { const c = document.getElementById('world'); return { w: innerWidth, h: innerHeight, dpr: devicePixelRatio, cw: c.width, ch: c.height, dur: window.DURATION }; });
  if (env.w !== CSS_W || env.h !== CSS_H || env.dpr !== DSF || env.cw !== PX_W || env.ch !== PX_H)
    throw new Error('wrong render setup: ' + JSON.stringify(env));
  const capture = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })).data, 'base64');
  let retries = 0;
  const film = {
    browser, duration: env.dur, errors,
    get retries() { return retries; },
    seek: t => page.evaluate(t => window.seek(t), t),
    /** The rendered page at time t, captured until two captures agree (a capture can land before new text is painted) */
    async shot(t) {
      await film.seek(t);
      let a = await capture();
      for (let k = 0; k < 8; k++) { const b = await capture(); if (b.equals(a)) return a; retries++; a = b; }
      throw new Error(`the render at ${t}s never settled`);
    },
  };
  await film.shot(0);   // the first capture after loading can be stale; settle it before any real frame
  return film;
}

const decode = async png => {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== PX_W || info.height !== PX_H) throw new Error(`capture is ${info.width} x ${info.height}`);
  return data;
};

/**
 * One frame's blend. Each capture is decoded and added in linear light as it arrives (while the browser renders the
 * next subframe). A frame whose captures are all identical is the capture itself.
 */
function blender() {
  const pngs = [];
  let acc = null, chain = Promise.resolve();
  return {
    add(png) {
      pngs.push(png);
      chain = chain.then(async () => {
        const d = await decode(png);
        acc ||= new Float32Array(d.length);
        for (let i = 0; i < d.length; i++) acc[i] += DEC[d[i]];
      });
    },
    async result() {
      await chain;
      if (pngs.every(p => p.equals(pngs[0]))) return { png: pngs[0], still: true };
      const out = Buffer.allocUnsafe(acc.length), s = Q / pngs.length;
      for (let i = 0; i < acc.length; i++) out[i] = ENC[(acc[i] * s + 0.5) | 0];
      return { raw: out, still: false };
    },
  };
}

async function writeFrame(f, b) {
  const tmp = framePath(f) + '.tmp';
  if (b.png) writeFileSync(tmp, b.png);
  else await sharp(b.raw, { raw: { width: PX_W, height: PX_H, channels: 3 } }).png({ compressionLevel: 2 }).toFile(tmp);
  renameSync(tmp, framePath(f));
}

/* ---------- Phase 1: frames ---------- */
async function renderFrames(f0, f1) {
  mkdirSync(DIR, { recursive: true });
  const meta = { film: statSync(FILM).mtimeMs, fps: FPS, sub: SUB, shutter: SHUTTER, size: [PX_W, PX_H], css: RECORD_CSS };
  const metaPath = join(DIR, 'meta.json');
  if (existsSync(metaPath) && readFileSync(metaPath, 'utf8') !== JSON.stringify(meta))
    throw new Error(`${DIR} holds frames from another build or other settings; delete it or pass --frames <new dir>`);
  writeFileSync(metaPath, JSON.stringify(meta));
  const todo = [];
  for (let f = f0; f < f1; f++) if (!existsSync(framePath(f))) todo.push(f);
  console.log(`${f1 - f0} frames, ${todo.length} still to render (${SUB} subframes each, ${SHUTTER} degree shutter, ${WORKERS} lanes)`);
  if (!todo.length) return;
  // Contiguous runs, dealt to lanes in order, so each lane plays the film forwards
  const per = Math.ceil(todo.length / WORKERS);
  const lanes = Array.from({ length: WORKERS }, (_, w) => todo.slice(w * per, (w + 1) * per)).filter(l => l.length);
  const t0 = Date.now(); let done = 0, still = 0;
  const report = () => {
    const el = (Date.now() - t0) / 1000, rate = done / el;
    process.stdout.write(`\r${done}/${todo.length} frames  ${(100 * done / todo.length).toFixed(1)}%  ${rate.toFixed(2)} fps  ` +
      `eta ${((todo.length - done) / rate / 60).toFixed(0)} min  (still ${still})   `);
  };
  await Promise.all(lanes.map(async frames => {
    const film = await openFilm();
    let prev = -Infinity, pending = Promise.resolve();
    for (const f of frames) {
      // Before a gap (a lane's start, or a resume), play the second of film before this frame
      if (f !== prev + 1) for (let g = Math.max(0, f - Math.round(PREROLL * FPS)); g < f; g++) await film.shot(g / FPS);
      const bl = blender();
      for (const t of subTimes(f)) bl.add(await film.shot(t));
      const b = await bl.result();
      await pending;               // keep at most one PNG write in flight per lane
      pending = writeFrame(f, b);
      prev = f; done++; if (b.still) still++;
      if (done % 10 === 0) report();
    }
    await pending;
    if (film.errors.length) console.log('\npage errors:', film.errors.join('; '));
    if (film.retries) console.log(`\n${film.retries} captures were retaken before they settled`);
    await film.browser.close();
  }));
  report();
  console.log(`\nFrames done in ${((Date.now() - t0) / 60000).toFixed(1)} min; ${still} of ${done} were still (copied, not blended)`);
}

/* ---------- Phase 2: encode ---------- */
function encode(f0, count) {
  return new Promise((res, rej) => {
    const args = [
      '-y', '-hide_banner', '-loglevel', 'error', '-stats',
      '-framerate', String(FPS), '-start_number', String(f0), '-i', join(DIR, '%05d.png'), '-frames:v', String(count),
      // RGB to BT.709 limited-range YUV; chroma averaged down to 4:2:0 with a sharp filter
      '-vf', 'zscale=matrix=709:range=limited:filter=spline36,format=yuv420p',
      '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF, '-profile:v', 'high', '-level:v', '5.2', '-pix_fmt', 'yuv420p',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
      '-r', String(FPS), '-movflags', '+faststart', resolve(root, OUT),
    ];
    console.log(`Encoding ${count} frames: libx264 -preset ${PRESET} -crf ${CRF}, yuv420p`);
    const ff = spawn(FFMPEG, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    ff.on('close', code => (code === 0 ? res() : rej(new Error('ffmpeg exited with ' + code))));
  });
}

const film = await openFilm(); const D = film.duration; await film.browser.close();
const f0 = Math.round(+opt('from', 0) * FPS), f1 = Math.round(+opt('to', D) * FPS);
console.log(`Jezero AI launch film: ${f0 / FPS} to ${f1 / FPS}s at ${FPS}fps, ${PX_W} x ${PX_H} -> ${OUT}`);
const T = Date.now();
if (!flag('encode-only')) await renderFrames(f0, f1);
const missing = []; for (let f = f0; f < f1; f++) if (!existsSync(framePath(f))) missing.push(f);
if (missing.length) throw new Error(`${missing.length} frames missing, starting at ${missing[0]}`);
await encode(f0, f1 - f0);
const mb = statSync(resolve(root, OUT)).size / 1e6;
console.log(`\n${OUT}: ${(f1 - f0) / FPS}s, ${f1 - f0} frames, ${mb.toFixed(0)} MB, in ${((Date.now() - T) / 60000).toFixed(1)} min`);
if (!flag('keep-frames')) {
  for (let f = f0; f < f1; f++) rmSync(framePath(f));
  if (readdirSync(DIR).every(n => n === 'meta.json')) rmSync(DIR, { recursive: true });
}
