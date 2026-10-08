/* =========================================================
   Diagram labels. Each sits in a fixed slot in the visual zone (label
   style, sentence case, 4 words or fewer) with a 1px leader in the
   secondary colour running to its object and ending in a 6px dot on it.
   Labels enter and leave with their object.
   ========================================================= */
const LEADERS = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  Object.assign(svg.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none', overflow: 'visible' });
  textRoot.appendChild(svg);
  return { svg, make(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; } };
})();

// Leaders live outside the scene roots, so hide them all at the start of every frame; a label's play() shows its
// own. Without this, jumping in time (scrubbing, ?t=, the loop) left a finished shot's leaders on screen.
FRAME_START.push(() => LABELS.forEach(L => { setAttr(L.line, 'opacity', '0'); setAttr(L.dot, 'opacity', '0'); L.vis = 0; }));
function setAttr(el, k, v) { const c = el.__a || (el.__a = {}); if (c[k] !== v) { c[k] = v; el.setAttribute(k, v); } }

/** o: { id, text, slot: { x, top }, anchor: () => site-space point [x, y, z] } */
function diagramLabel(root, o) {
  const b = textBlock(root, { id: o.id, slot: 'label:' + o.id, role: 'label', style: 'label', x: o.slot.x, top: o.slot.top, lines: [o.text] });
  const line = LEADERS.make('line', { stroke: COL.muted, 'stroke-width': 1, opacity: 0 });
  const dot = LEADERS.make('circle', { r: 3, fill: COL.muted, opacity: 0 });
  const L = { id: o.id, b, line, dot, textEl: b.lines[0], vis: 0 };
  LABELS.push(L);
  L.play = (t, tin, tout) => {
    const v = playBlock(b, t, tin, tout);
    L.vis = b.el.classList.contains('on') ? parseFloat(b.el.style.opacity || '1') * ease.inOutSine(range(t, tin, tin + MOTION.fade)) : 0;
    const a = WORLD.project(KIT.worldOf(...o.anchor()));
    const x0 = o.slot.x - 12, y0 = o.slot.top + TYPE.label.lh / 2;
    setAttr(line, 'x1', String(x0)); setAttr(line, 'y1', String(y0));
    setAttr(line, 'x2', a.x.toFixed(1)); setAttr(line, 'y2', a.y.toFixed(1));
    setAttr(dot, 'cx', a.x.toFixed(1)); setAttr(dot, 'cy', a.y.toFixed(1));
    setAttr(line, 'opacity', L.vis.toFixed(3)); setAttr(dot, 'opacity', L.vis.toFixed(3));
    return v;
  };
  return L;
}
