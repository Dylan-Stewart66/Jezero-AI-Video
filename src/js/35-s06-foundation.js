/* =========================================================
   Shot 6 (20 to 27s), layout B: "Days, not months." with the supporting
   line "A secure AWS foundation in about a day, built to scale with every
   new team." in the infrastructure tint (answerBlock).
   On the crater floor, 48 walled trays assemble row by row, each
   settling into place, in three team groups. A band two trays wide
   then lights tray by tray as the foundation completes.
   Tracker: Infrastructure resolves at 21.5.
   ========================================================= */
const TRAYS = (() => {
  const shells = KIT.parts(KIT.trayShell, KIT.trayEdges, SITE.cols * SITE.rows.length);
  const floors = KIT.parts(KIT.trayFloor, null, SITE.cols * SITE.rows.length, { cast: false });
  const list = [];
  SITE.rows.forEach((r, ri) => { for (let c = 0; c < SITE.cols; c++) list.push({ c, r, ri, x: siteX(c), z: siteZ(r) }); });
  const BUILD = { start: shotAt(6) + 1, row: 0.32, col: 0.035, dur: 0.55, drop: 0.9 };
  const BAND = { cols: [3, 4], start: shotAt(6) + 4, row: 0.14, col: 0.05, dur: 0.35 };
  const LIT_EDGE = mixHex(COL.lit, COL.ink, 0.45);
  const cA = new THREE.Color(), cB = new THREE.Color();
  const mixC = (a, b, t) => '#' + cA.set(a).lerp(cB.set(b), t).getHexString();
  // Floors lit by later shots (the compliance scan, in its own blue): functions of (tray, t) returning 0..1
  const floorLit = [];
  FRAME_START.push(t => {
    if (!KIT.group.visible) return;
    list.forEach((o, i) => {
      const ts = BUILD.start + o.ri * BUILD.row + o.c * BUILD.col;
      const p = range(t, ts, ts + BUILD.dur);
      const s = p <= 0 ? 0 : ease.outCubic(range(p, 0, 0.45));
      const y = (1 - ease.crit(p)) * BUILD.drop;
      const band = BAND.cols.includes(o.c) ? ease.inOutCubic(range(t, BAND.start + o.ri * BAND.row + (o.c - BAND.cols[0]) * BAND.col, BAND.start + o.ri * BAND.row + (o.c - BAND.cols[0]) * BAND.col + BAND.dur)) : 0;
      const scan = Math.max(0, ...floorLit.map(f => f(o, t)));
      shells.set(i, o.x, y, o.z, s, s, s, mixC(COL.plat[3], COL.lit, band), mixC(COL.plat[4], LIT_EDGE, band));
      floors.set(i, o.x, y, o.z, s, s, s, mixC(mixC(COL.plat[2], COL.lit, band), COL.comp[4], scan));
    });
    shells.commit(); floors.commit();
  });
  // Screen bounds of every tray, for the label check
  OBJECTS.push(() => KIT.group.visible ? list.map((o, i) => ({ id: 'tray-' + i, rect: projectedBox(o.x - 0.5, 0, o.z - 0.5, o.x + 0.5, KIT.TH, o.z + 0.5) })) : []);
  return { shells, floors, list, floorLit };
})();

/** Screen rect of a site-space box, for the layout check */
function projectedBox(x0, y0, z0, x1, y1, z1) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) {
    const p = WORLD.project(KIT.worldOf(x, y, z));
    a = Math.min(a, p.x); b = Math.min(b, p.y); c = Math.max(c, p.x); d = Math.max(d, p.y);
  }
  return { x: a, y: b, w: c - a, h: d - b };
}

/** The isometric camera after the descent: a barely visible push */
const isoAfterDescent = t => Object.assign({}, O_ISO, { frameH: ISO.frameH * (1 - 0.025 * ease.inOutSine(range(t, DIVE.dive[1], shotAt(7)))) });

const S06 = scene({
  name: SHOTS[5][1], start: shotAt(6), dur: SHOT_LEN[5],
  orbit: lt => { const t = shotAt(6) + lt; return t < DIVE.dive[1] ? DESCENT(t) : isoAfterDescent(t); },
  build(root) {
    this.text = answerBlock(root, { id: 's6', tint: COL.tint.infra, head: ['Days, not months.'],
      sup: ['A secure AWS foundation in about a day,', 'built to scale with every new team.'] });
  },
  render(lt) {
    this.text.play(lt, 1.0, this.dur - 0.5);
  },
});
