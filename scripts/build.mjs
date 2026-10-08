// Inlines src/, assets/ and the libraries into one self-contained, offline HTML file.
// Usage: node scripts/build.mjs   ->   jezero-ai-launch-film.html
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const here = p => new URL(p, new URL('../', import.meta.url));   // paths are relative to the project root
const read = p => readFileSync(here(p), 'utf8');
const b64 = p => readFileSync(here(p)).toString('base64');

const js = readdirSync(here('./src/js/')).filter(f => f.endsWith('.js')).sort()
  .map(f => `/* ---- ${f} ---- */\n` + read('./src/js/' + f)).join('\n');

// Fonts: Geist and Geist Mono woff2 from the geist package, embedded as base64
const FONT_DIR = './node_modules/geist/dist/fonts/';
const face = (family, weight, file) =>
  `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;` +
  `src:url(data:font/woff2;base64,${b64(FONT_DIR + file)}) format("woff2")}`;
const fonts = [
  face('Geist', 400, 'geist-sans/Geist-Regular.woff2'),
  face('Geist', 600, 'geist-sans/Geist-SemiBold.woff2'),
  face('Geist Mono', 500, 'geist-mono/GeistMono-Medium.woff2'),
].join('\n');

// Logos: load from assets/ if present; never drawn by hand
const markSvg = existsSync(here('./assets/jezero-ai-logo.svg'))
  ? read('./assets/jezero-ai-logo.svg').trim().replace(/<svg /, '<svg class="mark" aria-label="Jezero AI" ')
  : '';
const fullSvg = existsSync(here('./assets/jezero-ai-logo-full.svg'))
  ? read('./assets/jezero-ai-logo-full.svg').trim().replace(/<svg /, '<svg class="full" aria-label="Jezero AI" ')
  : '';
const caci = existsSync(here('./assets/caci-logo.svg'))
  ? 'data:image/svg+xml;base64,' + b64('./assets/caci-logo.svg')
  : existsSync(here('./assets/caci-logo.png')) ? 'data:image/png;base64,' + b64('./assets/caci-logo.png') : '';

// The AWS Premier Tier Partner badge, embedded byte for byte as supplied (never recoloured or redrawn)
const aws = existsSync(here('./assets/aws-premier-tier-badge.png')) ? 'data:image/png;base64,' + b64('./assets/aws-premier-tier-badge.png') : '';

const three = 'data:text/javascript;base64,' + b64('./node_modules/three/build/three.module.min.js');

const out = read('./src/shell.html')
  .replace('/*@FONTS@*/', () => fonts)
  .replace('/*@CSS@*/', () => read('./src/style.css'))
  .replace('@@THREE@@', () => three)
  .replace('<!--@MARK@-->', () => markSvg)
  .replace('<!--@FULL@-->', () => fullSvg)
  .replace('@@CACI@@', () => caci)
  .replace('@@AWS@@', () => aws)
  .replace('/*@QR@*/', () => read('./node_modules/qrcode-generator/qrcode.js'))
  .replace('/*@JS@*/', () => js);

// Guard: nothing may load over the network at runtime (the QR target URL and licence comments are fine)
if (/(?:src|href)\s*=\s*["']https?:|url\(\s*["']?https?:|\bfetch\(|from\s+["']https?:/.test(out)) console.warn('Warning: a runtime network reference was found in the output');
if (/Math\.random\(|Date\.now\(/.test(js)) console.warn('Warning: non-deterministic call found in src/js');
writeFileSync(here('./jezero-ai-launch-film.html'), out);
console.log(`jezero-ai-launch-film.html written (${(out.length / 1024).toFixed(0)} KB)`);
