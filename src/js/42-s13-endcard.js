/* =========================================================
   Shot 13 (71 to 80s), layout D: the end card, on the grid.
   The corner mark grows smoothly to 96px (and shrinks back for the
   loop). On the left, "The safe way to / say yes to AI." at display
   size, centred between the mark and the footer. One footer line just
   inside the safe area's bottom edge: the CACI logo (64px) and the AWS
   Premier Tier Partner badge (120px) bottom left, 64px apart; the QR
   code bottom right, with "Scan to find out more" to its left. The
   planet sits above the QR code on the right. The planet
   eases into columns 8 to 12, above the QR code, fully in frame, in calm
   half-light. All of it is settled by 73.4s and holds for 4.1 seconds
   while the mint points go out; then one camera move drifts round to
   the night side and runs straight into shot 1's opening drift,
   matching its position and speed at the loop point (see POST).
   ========================================================= */

/**
 * The QR code for CTA_URL: black modules on a clean white tile with an even four-module quiet zone. Modules are a
 * whole number of pixels, the tile as near `about` as that allows, so every module is the same size and the code
 * scans reliably from a distance.
 */
function qrEl(about) {
  const qr = qrcode(0, 'M'); qr.addData(CTA_URL); qr.make();
  const n = qr.getModuleCount(), q = 4, N = n + 2 * q, size = N * Math.max(1, Math.round(about / N));
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${N} ${N}`); svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.setAttribute('shape-rendering', 'crispEdges'); svg.setAttribute('aria-label', 'QR code: ' + CTA_URL);
  svg.style.display = 'block';
  svg.innerHTML = `<rect width="${N}" height="${N}" fill="#ffffff"/><path d="${d}" fill="#000000"/>`;
  return { svg, size };
}

/** The footer: the CACI logo and the AWS Premier Tier Partner badge (as supplied), centred on each other, side by side */
function footerEl(F) {
  const row = document.createElement('div');
  Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: F.gap + 'px', height: Math.max(F.caciH, F.awsH) + 'px' });
  [['tpl-caci', F.caciH], ['tpl-aws', F.awsH]].forEach(([id, h]) => {
    const img = document.getElementById(id).content.firstElementChild.cloneNode(true);
    Object.assign(img.style, { display: 'block', height: h + 'px', width: 'auto' });
    row.appendChild(img);
  });
  return row;
}

const S13 = scene({
  name: SHOTS[12][1], start: shotAt(13), dur: SHOT_LEN[12],
  orbit: lt => POST(shotAt(13) + lt),
  build(root) {
    const D = LAYOUT.D, d = TYPE.display, L = TYPE.label, F = D.footer, E = CHROME.mark.end;
    const qr = qrEl(D.qrSize), footerTop = F.bottom - Math.max(F.caciH, F.awsH);
    // The tagline, optically centred (first cap top to last baseline) between the corner mark and the footer logos
    const markBottom = E.y + E.h, span = (d.lh + d.base) - (d.base - d.cap);
    const lineTop = Math.round((markBottom + footerTop) / 2 - span / 2 - (d.base - d.cap));
    this.line = textBlock(root, { id: 's13-line', slot: 'D.line', style: 'display', x: D.x, top: lineTop, lines: ['The safe way to', 'say yes to AI.'] });
    // The footer line: logos bottom left; the QR code bottom right, its bottom level with the badge's; its label to its left
    const qrX = SAFE.x1 - qr.size, qrTop = F.bottom - qr.size;
    this.qr = imageBlock(root, { id: 's13-qr', slot: 'D.qr', x: qrX, top: qrTop, el: qr.svg });
    this.scan = textBlock(root, { id: 's13-scan', slot: 'D.scan', style: 'label', align: 'right', x: qrX - D.scanGap,
      top: Math.round(qrTop + (qr.size - L.lh) / 2), lines: ['Scan to find out more'] });
    this.footer = imageBlock(root, { id: 's13-footer', slot: 'D.footer', x: D.x, top: footerTop, el: footerEl(F) });
  },
  render(lt) {
    const out = 6.5;                           // all of it fully in by 2.4s (73.4), so it holds for 4.1s; then the loop move
    playBlock(this.line, lt, 0.5, out);
    playBlock(this.qr, lt, 0.9, out, 'fade');       // on the safe area's bottom edge: fades in, no rise
    playBlock(this.scan, lt, 1.0, out);
    playBlock(this.footer, lt, 1.2, out, 'fade');   // on the safe area's bottom edge: fades in, no rise
  },
});
