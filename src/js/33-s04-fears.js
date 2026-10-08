/* =========================================================
   Shot 4 (10 to 14s), layout A, then the tracker.
   The five reasons land under "Why?" one per beat in a stacked column
   at headline size, each in white and then turning to the coral
   problem colour. Once all five are coral they shrink and slide down
   into the tracker row, where each one becomes its label with a coral
   outline marker.
   ========================================================= */
const S04 = scene({
  name: SHOTS[3][1], start: shotAt(4), dur: SHOT_LEN[3], post: 1.6,   // the move into the tracker finishes at about 15.4
  orbit: lt => planetDrift(shotAt(4) + lt),   // still turning, as in the opening
  build(root) {
    const T = CHROME.tracker;
    this.b = textBlock(root, {
      id: 's4-fears', slot: 'A.list', style: 'headline', x: LAYOUT.A.x, top: WHY.listTop,
      lines: T.words.map(w => [[w, null], ['.', null]]),
    });
    // Each line flies on its own, so it must not be clipped by its reveal mask
    this.b.lines.forEach((sp, k) => {
      sp.dataset.group = 'trk-' + k;
      sp.parentNode.style.clipPath = 'none';
      sp.style.transformOrigin = `0 ${TYPE.headline.base}px`;
    });
  },
  render(lt, t) {
    const b = this.b, M = MOTION, T = CHROME.tracker, F = T.form;
    const first = 0.0;                                   // first reason lands at 10.0; the full list then holds until 14.0
    const ink = hexRGB(COL.ink), coral = hexRGB(COL.coral), muted = hexRGB(COL.muted);
    const n = T.words.length, end = F.start + F.shrink + (n - 1) * F.stagger + F.drop + F.swap;
    setClass(b.el, 'on', lt >= first && t < end);
    const s1 = ease.inOutCubic(range(t, F.start, F.start + F.shrink));     // shrink and spread across
    const sc = lerp(1, TYPE.label.size / TYPE.headline.size, s1);
    let vis = 0;
    b.lines.forEach((sp, k) => {
      const tin = first + k * BEAT;
      const p = ease.outExpoSoft(range(lt, tin, tin + M.dur));
      const dk = F.start + F.shrink + k * F.stagger;
      const s2 = ease.inOutCubic(range(t, dk, dk + F.drop));               // drop into the row
      const sw = ease.inOutSine(range(t, dk + F.drop, dk + F.drop + F.swap));
      // Baselines: in the column, then a compact stack just above the row, then the row
      const b0 = b.o.top + k * TYPE.headline.lh + TYPE.headline.base, b1 = T.base - (n - k) * F.pitch;
      const dy = lerp(b0, b1, s1) + (T.base - b1) * s2 - b0 + (1 - p) * M.rise;
      const dx = (TRACKER.wordX(k) - LAYOUT.A.x) * s1;
      const op = ease.inOutSine(range(lt, tin, tin + M.fade)) * (1 - sw);
      setStyle(sp, 'opacity', op.toFixed(3));
      setStyle(sp, 'transform', `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) scale(${sc.toFixed(4)})`);
      // Lands white, turns coral once it has settled, then goes to the tracker's secondary colour as it moves
      const c = ease.inOutSine(range(lt, tin + 0.8, tin + 1.2));
      setStyle(sp, 'color', `rgb(${ink.map((v, i) => Math.round(lerp(lerp(v, coral[i], c), muted[i], s1) * 255)).join(',')})`);
      setStyle(sp.lastChild, 'opacity', (1 - range(s1, 0, 0.5)).toFixed(3));   // the full stop drops away first
      vis = Math.max(vis, op);
    });
    b.vis = vis;
  },
});
