/* =========================================================
   Shot 10 (47 to 53s), layout B: "No surprise bills." with the supporting
   line "Every request costed and capped, with budgets set per team or per
   account." in the cost tint.
   Cost, in muted rose. Each team's cost meter rises where its lane
   leaves the platform, beside its trays: a frame with a segmented
   column inside and a solid stop bar fixed at its budget. The spend
   so far drops in, then every request of that team that passes adds
   one segment, sliding in from the cube itself. The front lane's team
   reaches its limit: the stop bar turns coral and that team's
   requests wait in a short queue in front of the meter, while the
   other teams carry on. Label: Budget. Tracker: Cost resolves at 51.0.
   ========================================================= */
const COST = (() => {
  const { L, ev, CAP, prefill, tUp, tCap, BL } = STATION;
  const s10 = shotAt(10), R = COL.cost;
  const B = { w: 0.5, h: G }, SEG = { w: 0.38, h: 0.16, gap: 0.035 }, PITCH_S = SEG.h + SEG.gap, POST = 0.05;
  const FRAME = 13;                                            // segments the frame could hold; each budget sits lower
  const HF = B.h + 0.03 + FRAME * PITCH_S + 0.06;
  const T = { rise: [s10 + 0.5, s10 + 1.2], fill: [s10 + 0.75, tUp], feed: 0.35 };
  const at = L.lanes.map(z => ({ x: L.meterX, z: z + L.meterDz, lane: z }));
  const segY = j => B.h + 0.03 + j * PITCH_S;
  const capY = k => segY(CAP[k]) - SEG.gap * 0.5;

  const base = KIT.parts(KIT.box(B.w, B.h, B.w), KIT.boxSegs(B.w, B.h, B.w), 3);
  const posts = KIT.parts(KIT.box(POST, HF, POST), null, 12, { cast: true });
  const tops = KIT.parts(KIT.box(B.w, 0.04, B.w), KIT.boxSegs(B.w, 0.04, B.w), 3);   // closes the frame
  const caps = KIT.parts(KIT.box(B.w + 0.12, 0.09, B.w + 0.12), KIT.boxSegs(B.w + 0.12, 0.09, B.w + 0.12), 3);
  // Each meter's segments: the spend so far, then one for each request of that team that passes
  const segs = at.map((_, k) => [
    ...Array.from({ length: prefill[k] }, (_, j) => ({ t: lerp(T.fill[0], T.fill[1], (j + 0.5) / Math.max(prefill[k], 1)), fed: false })),
    ...ev.meter[k].map(t => ({ t, fed: true })),
  ].slice(0, CAP[k]));
  const offset = [0, 1, 2].map(k => segs.slice(0, k).reduce((a, s) => a + s.length, 0));
  const parts = KIT.parts(KIT.box(SEG.w, SEG.h, SEG.w), KIT.boxSegs(SEG.w, SEG.h, SEG.w), Math.max(1, offset[2] + segs[2].length), { cast: true });
  const SEG_EDGE = mixHex(R[4], COL.ink, 0.4);
  const cA = new THREE.Color(), cB = new THREE.Color();
  const mixC = (a, b, u) => '#' + cA.set(a).lerp(cB.set(b), clamp(u)).getHexString();
  const full = tCap + T.feed;                                  // the limited meter's last segment lands

  FRAME_START.push(t => {
    if (!KIT.group.visible) return;
    at.forEach((m, k) => {
      const u = ease.crit(range(t, T.rise[0] + k * 0.1, T.rise[1] + k * 0.1));
      base.set(k, m.x, 0, m.z, u, u, u, R[2], R[3]);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], j) =>
        posts.set(k * 4 + j, m.x + sx * (B.w / 2 - POST / 2), B.h * u, m.z + sz * (B.w / 2 - POST / 2), u, u, u, R[3]));
      tops.set(k, m.x, (B.h + HF) * u, m.z, u, u, u, R[2], R[3]);
      const hit = k === BL ? ease.inOutSine(range(t, full, full + 0.25)) : 0;
      caps.set(k, m.x, capY(k) * u, m.z, u, u, u, mixC(R[3], COL.coral, hit), mixC(mixHex(R[3], COL.ink, 0.35), mixHex(COL.coral, COL.ink, 0.35), hit));
      segs[k].forEach((s, j) => {
        const i = offset[k] + j, y = segY(j);
        if (t < s.t) { parts.set(i, 0, 0, 0, 0, 0, 0); return; }
        if (!s.fed) {   // the spend so far drops into place
          const p = range(t, s.t, s.t + 0.3);
          parts.set(i, m.x, y + (1 - ease.crit(p)) * 0.4, m.z, 1, 1, 1, R[4], SEG_EDGE);
        } else {        // slides in from the request as it passes, and up into its slot
          const p = ease.outCubic(range(t, s.t, s.t + T.feed)), sc = lerp(0.55, 1, p);
          parts.set(i, m.x, lerp(0.2, y, p), lerp(m.lane, m.z, p), sc, sc, sc, R[4], SEG_EDGE);
        }
      });
    });
    [base, posts, tops, caps, parts].forEach(p => p.commit());
  });
  OBJECTS.push(() => {
    if (!KIT.group.visible || FRAME_T < T.rise[0]) return [];
    return at.map((m, k) => ({ id: 'meter-' + k, rect: projectedBox(m.x - B.w / 2 - 0.04, 0, m.z - B.w / 2 - 0.04, m.x + B.w / 2 + 0.04, HF * ease.crit(range(FRAME_T, T.rise[0] + k * 0.1, T.rise[1] + k * 0.1)), m.z + B.w / 2 + 0.04) }));
  });
  return { at, capY, HF, T, full };
})();

/* The whole station in view, the meters and the waiting requests at the left with room below them for the label; the
   camera rises to orbit from here */
const COST_SHOT = isoFit([...STATION.view.platform, ...STATION.view.governance, ...STATION.view.compliance,
  [MONITOR.P.x1, 0, MONITOR.P.z + 0.55], [MONITOR.P.x1, 0, MONITOR.P.z - 0.55], ...MONITOR.SCR.map(s => [s.a, P_TOP(s), MONITOR.P.z - 0.2]),
  ...COST.at.map(m => [m.x - 0.3, COST.HF, m.z - 0.3])], [1000, 130, 1785, 905]);
LABEL_SLOTS.budget = (() => {
  // A fixed slot below the limited meter, on open ground in front of the platform
  WORLD.setShot(orbitShot(COST_SHOT));
  const m = COST.at[STATION.BL], a = [m.x, COST.capY(STATION.BL) + 0.07, m.z];
  const base = WORLD.project(KIT.worldOf(m.x, 0, m.z + 1.6));
  return { x: snap8(base.x - 24), top: snap8(base.y + 56), anchor: () => a };
})();
if (RECORD) console.log('budget label slot', JSON.stringify([LABEL_SLOTS.budget.x, LABEL_SLOTS.budget.top]));

const S10 = scene({
  name: SHOTS[9][1], start: shotAt(10), dur: SHOT_LEN[9],
  orbit: lt => mixOrbit(VIS_SHOT, COST_SHOT, ease.inOutCubic(range(lt, 0, 2.0))),
  build(root) {
    this.text = answerBlock(root, { id: 's10', tint: COL.tint.cost, head: ['No surprise bills.'],
      sup: ['Every request costed and capped,', 'with budgets set per team or per account.'] });
    this.label = diagramLabel(root, { id: 'label-budget', text: 'Budget', slot: LABEL_SLOTS.budget, anchor: LABEL_SLOTS.budget.anchor });
  },
  render(lt) {
    const out = this.dur - 0.5;
    this.text.play(lt, 0.5, out);
    this.label.play(lt, 1.5, out);   // as the meters stand
  },
});
