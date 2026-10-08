/* =========================================================
   Shot 8 (34 to 41s), layout B: "Proven, not promised." with the
   supporting line "Real-time compliance, tested against live
   infrastructure on every change, not slow, costly manual audits." in
   the compliance tint.
   Compliance, in blue. The camera returns to the whole platform. An
   upright plate in the compliance blue draws in just above the trays at the platform's front
   edge and sweeps across the grid to the back like a scanner; each
   tray floor lights blue as the plate passes over it. At the far
   corner a neat stack of thin plates grows, one plate for each row of
   trays swept: the evidence.
   Label: Evidence. Tracker: Compliance resolves at 39.0.
   ========================================================= */
const SCAN = (() => {
  const s8 = shotAt(8);
  const T = {
    pad: [s8 + 0.6, s8 + 1.4],                                 // the stack's base plate rises
    rise: [s8 + 0.9, s8 + 1.5], sweep: [s8 + 1.5, s8 + 4.5], sink: [s8 + 4.5, s8 + 5.0],
    reset: [shotAt(9), shotAt(9) + 0.8],                       // floors ease back as shot 9 begins
    z0: SITE.origin.z + SITE.gridSize.z + 0.1,                 // just in front of the front row
    z1: SITE.origin.z + 0.05,                                  // over the back row's far wall
  };
  const RAMP = 0.15;                                           // share of the sweep spent speeding up and slowing down
  /** Sweep progress 0..1: constant speed, with short eased ends */
  const progress = t => {
    const u = range(t, ...T.sweep), v = 1 / (1 - RAMP);
    if (u < RAMP) return v * u * u / (2 * RAMP);
    if (u > 1 - RAMP) return 1 - v * (1 - u) * (1 - u) / (2 * RAMP);
    return v * (u - RAMP / 2);
  };
  const pOf = z => (z - T.z0) / (T.z1 - T.z0);
  const timeOf = p => { let a = T.sweep[0], b = T.sweep[1]; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (progress(m) < p) a = m; else b = m; } return (a + b) / 2; };

  /* Parts */
  // The plate hovers one unit above the tray walls, clear of the cubes in the lanes, so it never cuts through anything
  const PL = { w: SITE.gridSize.x, h: 4 * G, d: G, y: KIT.TH + G };
  const plate = KIT.parts(KIT.box(PL.w, PL.h, PL.d), KIT.boxSegs(PL.w, PL.h, PL.d), 1);
  // The stack sits one pitch out from the far corner, on the diagonal
  // Sheets are spaced by a hairline gap so each one reads on its own
  const S = { x: SITE.origin.x - 0.75, z: SITE.origin.z - 0.75, pad: 8 * G, sheet: 7 * G, th: G, gap: 0.5 * G, drop: 0.6, dur: 0.5 };
  const pad = KIT.parts(KIT.box(S.pad, G, S.pad), KIT.boxSegs(S.pad, G, S.pad), 1);
  // One sheet lands as the plate clears each row of trays (front row first)
  const rows = SITE.rows.slice().sort((a, b) => b - a);
  const land = rows.map(r => timeOf(pOf(siteZ(r) - 0.5)) + 0.1);
  const sheets = KIT.parts(KIT.box(S.sheet, S.th, S.sheet), KIT.boxSegs(S.sheet, S.th, S.sheet), rows.length);
  const B = COL.comp, LIT_EDGE = mixHex(B[4], COL.ink, 0.45);

  /** Height of the top of the stack at time t */
  const top = t => G + land.reduce((h, l, k) => h + (S.th + (k ? S.gap : 0.5 * S.gap)) * ease.crit(range(t, l - S.dur, l)), 0);

  FRAME_START.push(t => {
    if (!KIT.group.visible) return;
    // The scanner plate: draws out from its centre, sweeps front to back, draws back in
    const len = ease.outCubic(range(t, ...T.rise)) * (1 - ease.inOutCubic(range(t, ...T.sink)));
    const z = lerp(T.z0, T.z1, progress(t));
    plate.set(0, SITE.centre.x, PL.y, z, len, 1, 1, B[4], LIT_EDGE);
    // The evidence stack
    const up = ease.crit(range(t, ...T.pad));
    pad.set(0, S.x, 0, S.z, up, up, up, B[2], B[3]);
    land.forEach((l, k) => {
      const p = range(t, l - S.dur, l);
      const s = p <= 0 ? 0 : ease.outCubic(range(p, 0, 0.45));
      sheets.set(k, S.x, G + 0.5 * S.gap + k * (S.th + S.gap) + (1 - ease.crit(p)) * S.drop, S.z, s, s, s, B[4], LIT_EDGE);
    });
    [plate, pad, sheets].forEach(p => p.commit());
  });

  // Each tray floor lights blue as the plate crosses it, and eases back at the start of shot 9
  TRAYS.floorLit.push((o, t) => t < T.sweep[0] || t > T.reset[1] ? 0
    : ease.inOutSine(range(progress(t), pOf(o.z + 0.5), pOf(o.z - 0.5))) * (1 - ease.inOutSine(range(t, ...T.reset))));

  // Objects labels must keep clear of
  OBJECTS.push(() => {
    if (!KIT.group.visible || FRAME_T < T.pad[0]) return [];
    const out = [{ id: 'evidence', rect: projectedBox(S.x - S.pad / 2, 0, S.z - S.pad / 2, S.x + S.pad / 2, top(FRAME_T), S.z + S.pad / 2) }];
    if (FRAME_T > T.rise[0] && FRAME_T < T.sink[1]) {
      const z = lerp(T.z0, T.z1, progress(FRAME_T));
      // In eight pieces: the plate runs diagonally across the screen, so one box would cover empty space
      const len = PL.w * ease.outCubic(range(FRAME_T, ...T.rise)) * (1 - ease.inOutCubic(range(FRAME_T, ...T.sink))), x0 = SITE.centre.x - len / 2;
      for (let k = 0; k < 8; k++) out.push({ id: 'scanner-' + k, rect: projectedBox(x0 + len * k / 8, PL.y, z - PL.d / 2, x0 + len * (k + 1) / 8, PL.y + PL.h, z + PL.d / 2) });
    }
    return out;
  });
  return { T, S, land, top, progress };
})();

/* The camera returns to the platform's resting framing from shot 6 */
const PLATFORM_SHOT = isoAfterDescent(shotAt(7));
LABEL_SLOTS.evidence = (() => {
  // A fixed slot right of the finished stack, level with its top
  WORLD.setShot(orbitShot(PLATFORM_SHOT));
  const S = SCAN.S, h = SCAN.top(Infinity);
  const a = WORLD.project(KIT.worldOf(S.x + 0.18, h, S.z - 0.18));
  const right = WORLD.project(KIT.worldOf(S.x + S.pad / 2, 0, S.z - S.pad / 2));
  return { x: snap8(right.x + 48), top: snap8(a.y - TYPE.label.lh / 2), anchor: () => [S.x + 0.18, SCAN.top(FRAME_T), S.z - 0.18] };
})();
if (RECORD) console.log('evidence label slot', JSON.stringify([LABEL_SLOTS.evidence.x, LABEL_SLOTS.evidence.top]));

const S08 = scene({
  name: SHOTS[7][1], start: shotAt(8), dur: SHOT_LEN[7],
  orbit: lt => mixOrbit(GATE_SHOT, PLATFORM_SHOT, ease.inOutCubic(range(lt, 0, 1.8))),
  build(root) {
    this.text = answerBlock(root, { id: 's8', tint: COL.tint.comp, head: ['Proven, not promised.'],
      sup: ['Real-time compliance, tested against', 'live infrastructure on every change,', 'not slow, costly manual audits.'] });
    this.label = diagramLabel(root, { id: 'label-evidence', text: 'Evidence', slot: LABEL_SLOTS.evidence, anchor: LABEL_SLOTS.evidence.anchor });
  },
  render(lt) {
    const out = this.dur - 0.5;
    this.text.play(lt, 0.5, out);
    this.label.play(lt, 2.0, out);   // with the first sheet on the stack
  },
});
