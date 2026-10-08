/* =========================================================
   Persistent chrome: the Jezero mark (top left), the CACI logo
   (bottom right) and the five-word tracker (bottom left).
   These are the only items allowed in the margins.
   ========================================================= */
const CHROME_ITEMS = [];   // for the layout check
const chromeRoot = document.createElement('div');
chromeRoot.id = 'chrome';
textRoot.appendChild(chromeRoot);

/** Visibility given windows when an item is hidden: fades out at a, back in at b */
function windowVis(hidden, t) {
  let v = 1;
  for (const [a, b] of hidden) v = Math.min(v, Math.max(1 - range(t, a, a + CHROME.fade), range(t, b, b + CHROME.fade)));
  return v;
}
/** A copy of the full stacked Jezero AI logo, height h. Gradient ids are made unique per copy. */
let fullN = 0;
function fullLogoEl(h) {
  const svg = document.getElementById('tpl-full').content.firstElementChild.cloneNode(true);
  const n = ++fullN;
  svg.querySelectorAll('[id]').forEach(el => {
    const id = el.id, nid = id + '-' + n; el.id = nid;
    svg.querySelectorAll('[fill="url(#' + id + ')"]').forEach(u => u.setAttribute('fill', 'url(#' + nid + ')'));
  });
  svg.removeAttribute('width'); svg.removeAttribute('height');
  svg.style.height = h + 'px'; svg.style.width = (h * 820 / 407).toFixed(2) + 'px'; svg.style.display = 'block';
  return svg;
}
/** A copy of the Jezero mark (an <svg>), height h */
function markEl(h) {
  const svg = document.getElementById('tpl-mark').content.firstElementChild.cloneNode(true);
  svg.removeAttribute('width'); svg.removeAttribute('height');
  svg.style.height = h + 'px'; svg.style.width = (h * 792 / 543).toFixed(2) + 'px';
  return svg;
}

const CORNER = (() => {
  const m = document.createElement('div'); m.className = 'chrome'; m.dataset.role = 'chrome'; m.dataset.id = 'mark';
  Object.assign(m.style, { left: CHROME.mark.x + 'px', top: CHROME.mark.y + 'px', height: CHROME.mark.h + 'px' });
  m.appendChild(markEl(CHROME.mark.h));
  chromeRoot.appendChild(m);

  const c = document.createElement('div'); c.className = 'chrome'; c.dataset.role = 'chrome'; c.dataset.id = 'caci';
  c.appendChild(document.getElementById('tpl-caci').content.firstElementChild.cloneNode(true));
  Object.assign(c.style, { right: (W - CHROME.caci.right) + 'px', top: (CHROME.caci.bottom - CHROME.caci.h) + 'px', height: CHROME.caci.h + 'px' });
  chromeRoot.appendChild(c);

  CHROME_ITEMS.push(m, c);
  // The end card's larger mark: height and top ease together, the left edge fixed; set as real sizes so the SVG stays crisp
  const svg = m.firstChild, E = CHROME.mark.end;
  FRAME_START.push(t => {
    const k = ease.inOutCubic(range(t, ...E.grow)) * (1 - ease.inOutCubic(range(t, ...E.shrink)));
    const h = lerp(CHROME.mark.h, E.h, k);
    setStyle(m, 'top', lerp(CHROME.mark.y, E.y, k).toFixed(2) + 'px'); setStyle(m, 'height', h.toFixed(2) + 'px');
    setStyle(svg, 'height', h.toFixed(2) + 'px'); setStyle(svg, 'width', (h * 792 / 543).toFixed(2) + 'px');
    setStyle(m, 'opacity', windowVis(CHROME.mark.hidden, t).toFixed(3));
    setStyle(c, 'opacity', windowVis(CHROME.caci.hidden, t).toFixed(3));
  });
  return { mark: m, caci: c };
})();

/* ---------- The five-word tracker ---------- */
const TRACKER = (() => {
  const T = CHROME.tracker, L = TYPE.label;
  const row = document.createElement('div'); row.className = 'tracker';
  Object.assign(row.style, { left: T.x + 'px', top: (T.base - L.base) + 'px', gap: T.gap + 'px' });
  const items = T.words.map((w, k) => {
    const it = document.createElement('div'); it.className = 'trk ' + L.cls;
    Object.assign(it.dataset, { role: 'chrome', id: 'tracker-' + w.toLowerCase(), text: '1', group: 'trk-' + k });
    it.style.paddingLeft = (T.mark + T.markGap) + 'px';
    const m = document.createElement('i');
    Object.assign(m.style, { width: T.mark + 'px', height: T.mark + 'px', top: (L.base - L.xh / 2 - T.mark / 2).toFixed(1) + 'px' });
    const f = document.createElement('b'); m.appendChild(f);
    const s = document.createElement('span'); s.textContent = w;
    it.append(m, s); row.appendChild(it);
    CHROME_ITEMS.push(it);
    return { it, m, f, s };
  });
  chromeRoot.appendChild(row);
  let xs = null;
  /** Stage x of word k's left edge (measured once the fonts are in) */
  function wordX(k) {
    if (!xs) {
      const was = row.style.display; row.style.display = 'flex';
      xs = items.map(({ it }) => T.x + it.offsetLeft + T.mark + T.markGap);
      row.style.display = was;
    }
    return xs[k];
  }
  FRAME_START.push(t => {
    const show = t >= T.show[0] && t < T.show[1] + CHROME.fade;
    setStyle(row, 'display', show ? 'flex' : 'none');
    if (!show) { items.forEach(o => { o.it.__vis = 0; }); return; }
    const leave = 1 - range(t, T.show[1], T.show[1] + CHROME.fade);
    items.forEach(({ it, m, f, s }, k) => {
      const F = T.form, land = F.start + F.shrink + k * F.stagger + F.drop;
      const label = ease.inOutSine(range(t, land, land + F.swap));         // crossfades in once its word has landed
      const mark = ease.outCubic(range(t, land, land + 0.3));
      const res = ease.inOutCubic(range(t, T.resolve[k], T.resolve[k] + 0.4));
      setStyle(it, 'opacity', leave.toFixed(3));
      setStyle(s, 'opacity', label.toFixed(3));
      setStyle(s, 'color', mixHex(COL.muted, COL.ink, res));
      setStyle(m, 'opacity', mark.toFixed(3));
      setStyle(m, 'transform', `scale(${lerp(0.5, 1, mark).toFixed(3)})`);
      setStyle(m, 'borderColor', mixHex(COL.coral, COL.mint, res));
      setStyle(f, 'transform', `scale(${res.toFixed(3)})`);
      it.__vis = label * leave;
    });
  });
  return { items, row, wordX };
})();
