/* =========================================================
   Text layer
   Text is only ever placed through a layout slot. Motion is the same
   everywhere: lines rise 24px through a mask over 0.6s (exponential
   ease-out, 0.1s apart) and leave by fading while rising 8px over 0.3s.
   ========================================================= */
const TEXT_BLOCKS = [];   // every block, for the layout check

/** Top of a layout A block, so its optical centre (first cap top to last baseline) sits at y 500 */
function topA(style, n) {
  const s = TYPE[style];
  return snap8(LAYOUT.A.opticalY - s.base + (s.cap - (n - 1) * s.lh) / 2);
}
/** Layout B stack: headline at y 216, supporting 32px below it, figure 48px below that */
function stackB(headLines, supLines = 0) {
  const h = TYPE.headline, s = TYPE.supporting;
  const headTop = LAYOUT.B.headTop;
  const supTop = headTop + headLines * h.lh + LAYOUT.B.supGap;
  const figTop = (supLines ? supTop + supLines * s.lh : headTop + headLines * h.lh) + LAYOUT.B.figGap;
  return { headTop, supTop, figTop };
}

/**
 * A text block.
 * o: { id, slot, style, lines, x?, top, align?, color?, role?, gap?, stagger? }. align 'right' sets the block's right edge at x.
 * A line is a string, or an array of [text, colour] runs. gap: extra space between lines (px);
 * stagger: seconds between line entrances, for a list that enters one line per beat.
 */
function textBlock(root, o) {
  const s = TYPE[o.style];
  const el = document.createElement('div');
  el.className = 'tb ' + s.cls + (o.align === 'center' ? ' center' : '');
  el.dataset.slot = o.slot; el.dataset.role = o.role || 'text'; el.dataset.id = o.id;
  if (o.align === 'center') { el.style.left = '0px'; el.style.width = W + 'px'; }
  else if (o.align === 'right') { el.style.right = (W - o.x) + 'px'; el.style.textAlign = 'right'; }
  else el.style.left = o.x + 'px';
  el.style.top = o.top + 'px';
  const color = o.color || COL.ink;
  el.style.color = color;
  const lines = o.lines.map(ln => {
    const d = document.createElement('div'); d.className = 'ln';
    const sp = document.createElement('span'); sp.className = 'lt';
    if (Array.isArray(ln)) ln.forEach(([txt, c]) => { const k = document.createElement('span'); k.textContent = txt; if (c) k.style.color = c; sp.appendChild(k); });
    else sp.textContent = ln;
    d.appendChild(sp); el.appendChild(d);
    return sp;
  });
  if (o.gap) [...el.children].slice(0, -1).forEach(d => { d.style.marginBottom = o.gap + 'px'; });
  root.appendChild(el);
  const b = { el, lines, o, color, vis: 0 };
  TEXT_BLOCKS.push(b);
  return b;
}

/**
 * An answer section's text (shots 6 to 10), the same in all five: one white headline in the layout B column, and one
 * supporting line (up to three lines) 32px below it in the section's tint. play() enters the supporting line 0.3s
 * after the headline, with the film's usual text motion. o: { id, head: [lines], sup: [lines], tint }
 */
function answerBlock(root, o) {
  const st = stackB(o.head.length, o.sup.length);
  const head = textBlock(root, { id: o.id + '-head', slot: 'B.head', style: 'headline', x: LAYOUT.B.x, top: st.headTop, lines: o.head });
  const sup = textBlock(root, { id: o.id + '-sup', slot: 'B.sup', style: 'supporting', x: LAYOUT.B.x, top: st.supTop, lines: o.sup, color: o.tint });
  return { head, sup, play(t, tin, tout) { playBlock(head, t, tin, tout); playBlock(sup, t, tin + 0.3, tout); } };
}

/**
 * Play a block: enter at tin, leave at tout. mode 'rise' (default), 'fade' (no rise: for a block on the safe area's
 * bottom edge, which a rise would carry past it) or 'slam' (once in the film, on "Why?").
 * Returns its visibility, 0 to 1.
 */
function playBlock(b, t, tin, tout = Infinity, mode = 'rise') {
  const M = MOTION;
  const out = range(t, tout, tout + M.exitDur);
  const on = t >= tin && out < 1;
  setClass(b.el, 'on', on);
  if (!on) { b.vis = 0; return 0; }
  let minOp = 1;
  b.lines.forEach((sp, i) => {
    let op, y = 0, sc = 1;
    if (mode === 'slam') {
      const p = range(t, tin, tin + M.slamDur);
      sc = lerp(M.slamFrom, 1, ease.outExpo(p));
      op = clamp(p * 5);
      setStyle(sp, 'transformOrigin', '0 50%');
    } else {
      const t0 = tin + i * (b.o.stagger ?? M.stagger);
      const p = ease.outExpoSoft(range(t, t0, t0 + M.dur));
      y = mode === 'fade' ? 0 : (1 - p) * M.rise; op = ease.inOutSine(range(t, t0, t0 + M.fade));
    }
    minOp = Math.min(minOp, op);
    setStyle(sp, 'opacity', op.toFixed(3));
    setStyle(sp, 'transform', sc !== 1 ? `scale(${sc.toFixed(4)})` : `translateY(${y.toFixed(2)}px)`);
  });
  const oe = ease.outCubic(out);
  setStyle(b.el, 'opacity', (1 - ease.inOutSine(out)).toFixed(3));
  setStyle(b.el, 'translate', `0 ${(-oe * M.exitRise).toFixed(2)}px`);
  b.vis = minOp * (1 - out);
  return b.vis;
}

/**
 * A picture placed and animated like a one-line text block, so it obeys every text rule (the logo, the QR code).
 * o: { id, slot, el, top, x?, align? }
 */
function imageBlock(root, o) {
  const el = document.createElement('div');
  el.className = 'tb' + (o.align === 'center' ? ' center' : '');
  el.dataset.slot = o.slot; el.dataset.role = 'text'; el.dataset.id = o.id;
  if (o.align === 'center') { el.style.left = '0px'; el.style.width = W + 'px'; } else el.style.left = o.x + 'px';
  el.style.top = o.top + 'px'; el.style.color = COL.ink;
  const ln = document.createElement('div'); ln.className = 'ln';
  const inner = document.createElement('span'); inner.className = 'lt lockup';
  inner.appendChild(o.el);
  ln.appendChild(inner); el.appendChild(ln); root.appendChild(el);
  const b = { el, lines: [inner], o, color: COL.ink, vis: 0 };
  TEXT_BLOCKS.push(b);
  return b;
}
/**
 * The official stacked Jezero AI logo (assets/jezero-ai-logo-full.svg) as a text block, height h.
 * Used only at the logo reveal and on the end card. o: { id, slot, h, top, x?, align? }
 */
const lockupBlock = (root, o) => imageBlock(root, Object.assign({}, o, { el: fullLogoEl(o.h) }));
