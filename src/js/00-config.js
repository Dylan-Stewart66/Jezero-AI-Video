/* =========================================================
   Jezero AI launch film: configuration
   The design system as data. Every text position, size and colour
   in the film comes from here; scenes never hand-place text.
   ========================================================= */

/** The end card's QR code links here (it is generated from this). */
const CTA_URL = 'https://www.caci.co.uk/solutions/redefine-technology/cloud-engineering-implementation-services/jezero-secure-ai-platform/';

/* ---------- Timeline ----------
   Shot lengths in seconds. Every time in the film is set relative to its shot's start, so a shot can be
   lengthened and everything after it follows. Shot 5 holds the logo reveal 2s longer than the brief
   (the user's request; the loop no longer has to be exactly 60s). */
// Shots 6 to 13 are each 2s longer than the brief, at the user's request. Shot 11 is 2s longer again: its text
// waits until the rising camera has cleared the planet from the text column, and still holds for over 2s a line.
// Shot 11 lost its second beat ("Fast. And secure.") and gave 1.5s to shot 12, whose list now has a line of detail per option.
const SHOT_LEN = [4, 4, 2, 4, 6, 7, 7, 7, 6, 6, 8.5, 9.5, 9];
const SHOT_AT = SHOT_LEN.map((_, i) => SHOT_LEN.slice(0, i).reduce((a, b) => a + b, 0));
/** Start of shot n (1 to 13) */
const shotAt = n => SHOT_AT[n - 1];
const DURATION = SHOT_LEN.reduce((a, b) => a + b, 0);   // one loop
const BEAT = 0.5;             // 120 BPM: every cut and text entrance lands on a multiple of this

/* ---------- Colour (sRGB, from the brief). Each colour has one job. ---------- */
const COL = {
  space: '#05070d',
  ink: '#f3f6fc',             // primary text
  muted: '#9aa6bf',           // secondary text, leader lines
  mars: ['#140a0c', '#3a1814', '#7a3322', '#b85a38', '#e2a27a'],
  plat: ['#0f2a2c', '#1b4547', '#2c6464', '#3f8582', '#5ea9a2'],
  // The station's sections, one colour each, as matching ramps: [dark, dim, top, edge, light]. Every step has the same
  // OKLCH lightness and chroma as the infrastructure teal (0.37, 0.47, 0.57, 0.68, 0.85; chroma about 0.07); only the
  // hue changes (teal 192, violet 304, blue 248, amber 72, rose 358). All sit well clear of coral and mint.
  gov: ['#453a53', '#615175', '#816d9a', '#a48ec0', '#d8c3f5'],    // governance: violet
  comp: ['#2c4257', '#3f5d79', '#557ba0', '#749ec7', '#a9d3fb'],   // compliance: blue
  vis: ['#4f3c24', '#6e5433', '#927147', '#b79264', '#ecc79a'],    // visibility: amber
  cost: ['#533640', '#754c59', '#9a6677', '#c18699', '#f6bbcd'],   // cost: muted rose
  // The supporting line in each answer section (shots 6 to 10): a light tint of that section's colour, OKLCH L 0.85 like
  // the ramps' light step (teal's added to match); about 8:1 against the crater floor
  tint: { infra: '#95ddda', gov: '#d8c3f5', comp: '#a9d3fb', vis: '#ecc79a', cost: '#f6bbcd' },
  // The four ways in (shot 12): each option's trajectory and index number. OKLCH L 0.82, chroma 0.11, hues 218, 268, 312
  // and 80: cyan, periwinkle, lilac and gold, at least 0.17 from coral
  ways: ['#65d5f3', '#a5c2ff', '#dcaff8', '#eabc6e'],
  lit: '#9fe3d6',             // lit or resolved platform state
  coral: '#f97362',           // problem state
  mint: '#7ef0c0',            // resolved state, live agents
  violet: '#8b5cf6',          // brand accent only
  violetLight: '#b69cff',     // the tagline at the logo reveal: a light brand violet, apart from the white wordmark
  silver: '#b8c0cc',          // the agent pins on the planet, set apart from the white text
};

/* ---------- Stage, safe area and grid ---------- */
const W = 1920, H = 1080;
const SAFE = { x0: 120, x1: 1800, y0: 96, y1: 984 };
const GRID = { cols: 12, colW: 118, gutter: 24 };
/** Left edge of column n (1 to 12) */
const colX = n => SAFE.x0 + (n - 1) * (GRID.colW + GRID.gutter);
/** Right edge of column n */
const colR = n => colX(n) + GRID.colW;
const snap8 = v => Math.round(v / 8) * 8;

/* ---------- Type scale: the only sizes allowed ---------- */
// base: baseline offset from the top of the line box. cap: cap height. Measured in Chrome with Geist 1.7.2.
const TYPE = {
  display:    { cls: 'ts-display',    size: 120, lh: 120, base: 103, cap: 85.2 },
  headline:   { cls: 'ts-headline',   size: 80,  lh: 88,  base: 72,  cap: 56.8 },
  tagline:    { cls: 'ts-tagline',    size: 60,  lh: 72,  base: 57,  cap: 42.6 },   // the tagline under the logo at the reveal
  supporting: { cls: 'ts-supporting', size: 40,  lh: 52,  base: 40,  cap: 28.4 },
  label:      { cls: 'ts-label',      size: 26,  lh: 32,  base: 25,  cap: 18.5, xh: 13.8 },
};

/* ---------- Layouts ---------- */
const LAYOUT = {
  /** A, statement: columns 1 to 7, optical centre of the block at y 500 */
  A: { x: colX(1), right: colR(7), opticalY: 500 },
  /** B, explain: text columns 1 to 6, visual zone columns 7 to 12 */
  B: {
    x: colX(1), right: colR(6), headTop: 216, supGap: 32, figGap: 48,
    zone: { x0: colX(7), x1: colR(12), y0: 96, y1: 920 },
  },
  /** C, hero: lockup centred, its centre at y 400; supporting line 40px below */
  // The official stacked lockup (assets/jezero-ai-logo-full.svg), set higher than the brief's y 400 at the user's request,
  // so the tagline stays at least 120px above the planet's top (133px at the closest, about 19.1s)
  C: { cx: W / 2, top: 184, h: 220, supGap: 40 },
  /** D, end card, on the grid. Left: the tagline at display size, centred between the corner mark (96px here,
      CHROME.mark.end) and the footer logos. One footer line just inside the safe area's bottom edge: bottom left, the
      CACI logo (64px) and the AWS Premier Tier Partner badge (120px, so its text reads), centred on each other, 64px
      apart; bottom right, the QR code, its right edge on the safe area and its bottom level with the badge's, with
      "Scan to find out more" right aligned to its left. The planet on the right, above the QR code, fully in frame. */
  D: {
    x: colX(1), right: colR(7), qrSize: 200, scanGap: 32,
    footer: { caciH: 64, awsH: 120, gap: 64, bottom: SAFE.y1 - 8 },   // 8px clear of the safe area's bottom edge
    planet: { cx: (colX(8) + colR(12)) / 2, cy: 410, r: 290 },   // y 120 to 700: 64px clear of the QR code
  },
};

/* ---------- Persistent chrome (the only items allowed outside the safe area) ---------- */
const CHROME = {
  // Stays through the end card, where it grows smoothly to 96px with its top on the safe area, and shrinks back as the
  // loop returns to the opening
  mark: { x: 120, y: 72, h: 48, hidden: [[shotAt(5) + 1, shotAt(6) - 0.5]],
    end: { h: 96, y: SAFE.y0, grow: [shotAt(13), shotAt(13) + 1.2], shrink: [DURATION - 2.4, DURATION - 0.8] } },
  caci: { right: 1800, bottom: 1008, h: 32, hidden: [[shotAt(13), shotAt(13) + 7]] },
  tracker: {
    x: 120, base: 1000, gap: 48, mark: 12, markGap: 12, show: [shotAt(4) + 3, shotAt(11)],
    words: ['Infrastructure', 'Governance', 'Compliance', 'Visibility', 'Cost'],
    resolve: [shotAt(6) + 4.5, shotAt(7) + 5, shotAt(8) + 5, shotAt(9) + 4, shotAt(10) + 4],   // each word switches to resolved with a 0.4s fill
    // The stacked fears become the row: shrink and spread across (each on its own line), drop into the row
    // in a cascade, then swap to the label face. Words never cross one another.
    form: { start: shotAt(4) + 4, shrink: 0.5, stagger: 0.05, drop: 0.45, swap: 0.25, pitch: 40 },
  },
  fade: 0.3,
};

/* ---------- Text motion ---------- */
// Slower than the brief's 0.6s in / 0.3s out, at the user's request after reviewing shots 1 and 2:
// lines rise over 1.2s and fade in over 0.9s, so they never snap on
const MOTION = { rise: 24, dur: 1.2, fade: 0.9, stagger: 0.12, exitRise: 8, exitDur: 0.5, slamFrom: 1.6, slamDur: 0.4 };

/* ---------- Diagram label slots (fixed screen positions, chosen per shot) ---------- */
const LABEL_SLOTS = {};

/* ---------- Shots, for the debug readout and arrow-key navigation ---------- */
const SHOTS = ['1 Everyone’s experimenting', '2 Few make it', '3 Why?', '4 Five fears', '5 Logo reveal and descent',
  '6 Infrastructure', '7 Governance', '8 Compliance', '9 Visibility', '10 Cost', '11 In production', '12 Ways in', '13 End card',
].map((name, i) => [SHOT_AT[i], name]);
/** The part of the film built so far (the layout check and contact sheet cover this range) */
const BUILT = [0, DURATION];
