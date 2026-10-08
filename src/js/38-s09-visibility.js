/* =========================================================
   Shot 9 (41 to 47s), layout B: "See everything, live." with the
   supporting line "Live dashboards for usage, speed, errors and cost
   across every team." in the visibility tint.
   Visibility, in amber. A monitoring area rises behind the platform's
   far edge: four screens of different sizes on one plinth, each a
   different chart, single-weight lines and flat fills only, no text:
   tokens per team as bars, response time as a line under a dashed
   target, errors as a sparkline that stays flat near zero, and
   requests per account and model as a grid of cells. They watch the
   station live: a team's bar grows the moment one of its requests
   passes the gateway, and a cell lights the moment a request from
   that team reaches that model (the column for the model that isn't
   approved stays dark). Tracker: Visibility resolves at 45.0. The
   monitoring area stays, part of the station.
   ========================================================= */
const MONITOR = (() => {
  const { L, ev } = STATION;
  const s9 = shotAt(9), A = COL.vis;
  const P = { x0: L.x0 + 0.9, x1: L.x1 + 0.35, z: L.z0 - 1.45, d: 1.1, h: 2 * G };
  const SCR = [   // x from, x to (site), height; left to right along the far edge
    { id: 'grid', a: L.x0 + 1.2, b: L.x0 + 2.8, h: 1.45 },
    { id: 'bars', a: L.x0 + 3.15, b: L.x0 + 5.75, h: 1.9 },
    { id: 'line', a: L.x0 + 6.1, b: L.x0 + 8.3, h: 1.35 },
    { id: 'err', a: L.x0 + 8.65, b: L.x0 + 9.95, h: 0.8 },
  ];
  const SD = 0.12, ZS = P.z - 0.15, FACE = ZS + SD / 2 + 0.03, IN = 0.07;   // screen depth and centre; the dark face's front
  const T = {
    plinth: [s9 + 0.6, s9 + 1.3], screen: s9 + 0.8, stagger: 0.15, rise: 0.6,
    draw: { grid: s9 + 1.5, bars: s9 + 2.0, line: s9 + 2.5, err: s9 + 3.0 }, dur: 0.8,
  };
  const plinth = KIT.parts(KIT.box(P.x1 - P.x0, P.h, P.d), KIT.boxSegs(P.x1 - P.x0, P.h, P.d), 1);
  const frames = SCR.map(s => KIT.parts(KIT.box(s.b - s.a, s.h, SD), KIT.boxSegs(s.b - s.a, s.h, SD), 1));
  const faces = SCR.map(s => KIT.parts(KIT.box(s.b - s.a - 2 * IN, s.h - 2 * IN, 0.03), null, 1, { cast: false }));
  const S = Object.fromEntries(SCR.map(s => [s.id, s]));
  const up = (i, t) => ease.crit(range(t, T.screen + i * T.stagger, T.screen + i * T.stagger + T.rise));
  const y0 = P.h;                                              // screens stand on the plinth

  /* Bars: tokens per team. Each request that passes the gateway adds its tokens to its team's bar. */
  const fl = KIT.flats(3 + 12);
  const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const tok = ev.gate.map((e, i) => ({ ...e, n: 0.7 + 0.6 * hash(i, 3) }));
  const BASE = [0.34, 0.22, 0.28];
  const finalRaw = [0, 1, 2].map(k => BASE[k] + tok.filter(e => e.lane === k && e.t > T.draw.bars).reduce((a, e) => a + e.n, 0) * 0.05);
  const SCALE = 0.9 / Math.max(...finalRaw);
  const barVal = (k, t) => (BASE[k] + tok.reduce((a, e) => e.lane === k && e.t > T.draw.bars && e.t <= t ? a + e.n * 0.05 * ease.outCubic(range(t, e.t, e.t + 0.3)) : a, 0)) * SCALE;

  /* Grid: requests per account (row: team) and model (column). A cell lights as one of its requests arrives. */
  const counts = ev.hub;
  const cellCount = (k, mi, t) => counts.reduce((a, e) => e.lane === k && e.model === mi && e.t <= t ? a + 1 : a, 0);
  const cellFlash = (k, mi, t) => counts.reduce((p, e) => e.lane === k && e.model === mi && t >= e.t && t < e.t + 0.45 ? Math.max(p, 1 - (t - e.t) / 0.45) : p, 0);
  const cA = new THREE.Color(), cB = new THREE.Color();
  const mixC = (a, b, u) => '#' + cA.set(a).lerp(cB.set(b), clamp(u)).getHexString();

  /* Lines: response time under a dashed target; errors flat near zero. One reading per beat, scrolling. */
  const M = 48, SPAN = 12;
  const lines = makeLines({ curves: 2, segs: M, color: A[4], width: 1.5, parent: KIT.group, fade: KIT.fadeU });
  const DASH = 9, dashes = makeLines({ curves: DASH, segs: 1, color: A[3], width: 1.5, parent: KIT.group, fade: KIT.fadeU });
  const reading = [
    i => 0.42 + 0.06 * Math.sin(i * 0.9) + 0.1 * (hash(i, 1) - 0.5),
    i => 0.1 + 0.05 * hash(i, 2),
  ];
  const smooth = (f, x) => {
    const i = Math.floor(x), u = x - i, p0 = f(i - 1), p1 = f(i), p2 = f(i + 1), p3 = f(i + 2);
    return p1 + 0.5 * u * (p2 - p0 + u * (2 * p0 - 5 * p1 + 4 * p2 - p3 + u * (3 * (p1 - p2) + p3 - p0)));
  };
  const inner = s => ({ x0: s.a + IN + 0.1, x1: s.b - IN - 0.1, y0: y0 + IN + 0.12, y1: y0 + s.h - IN - 0.12 });
  const pts = Array.from({ length: M + 1 }, () => [0, 0, 0]);
  const TARGET = 0.72;
  {
    const b = inner(S.line), w = (b.x1 - b.x0) / DASH;
    for (let i = 0; i < DASH; i++) { const y = lerp(b.y0, b.y1, TARGET); dashes.set(i, [[b.x0 + i * w, y, FACE + 0.006], [b.x0 + (i + 0.55) * w, y, FACE + 0.006]]); }
    dashes.commit();
  }

  FRAME_START.push(t => {
    if (!KIT.group.visible) return;
    const pu = ease.crit(range(t, ...T.plinth));
    plinth.set(0, (P.x0 + P.x1) / 2, 0, P.z, 1, pu, 1, A[2], A[3]); plinth.commit();
    SCR.forEach((s, i) => {
      const u = up(i, t);
      frames[i].set(0, (s.a + s.b) / 2, y0, ZS, 1, u, 1, A[2], A[3]); frames[i].commit();
      faces[i].set(0, (s.a + s.b) / 2, y0 + IN * u, FACE - 0.015, 1, u, 1, A[0]); faces[i].commit();
    });
    const z = FACE + 0.004;
    // Bars
    const bb = inner(S.bars), gw = (bb.x1 - bb.x0) / 3, bw = gw * 0.55, bd = ease.outCubic(range(t, T.draw.bars, T.draw.bars + T.dur));
    for (let k = 0; k < 3; k++) fl.set(k, bb.x0 + gw * (k + 0.5), bb.y0, z, bw, (bb.y1 - bb.y0) * barVal(k, t) * bd, A[4]);
    // Grid: three teams by four models
    const gb = inner(S.grid), cw = (gb.x1 - gb.x0) / 4, ch = (gb.y1 - gb.y0) / 3, gd = range(t, T.draw.grid, T.draw.grid + T.dur);
    for (let k = 0; k < 3; k++) for (let mi = 0; mi < 4; mi++) {
      const appear = ease.outCubic(range(gd, (k * 4 + mi) / 16, (k * 4 + mi) / 16 + 0.4));
      const col = mi === L.UNAPPROVED ? A[1] : mixC(mixC(A[1], A[3], Math.min(1, cellCount(k, mi, t) / 6)), A[4], cellFlash(k, mi, t));
      fl.set(3 + k * 4 + mi, gb.x0 + cw * (mi + 0.5), gb.y1 - ch * (k + 1) + ch * 0.12, z, cw * 0.76 * appear, ch * 0.76 * appear, col);
    }
    fl.commit();
    // Response time and errors
    const now = (t - s9) / BEAT;
    [['line', 0], ['err', 1]].forEach(([id, c]) => {
      const p = ease.outCubic(range(t, T.draw[id], T.draw[id] + T.dur));
      lines.prog[c] = p; lines.alpha[c] = p > 0 ? 1 : 0;
      if (p <= 0) return;
      const b = inner(S[id]);
      for (let j = 0; j <= M; j++) {
        const v = clamp(smooth(reading[c], now - SPAN + SPAN * j / M), 0.02, 0.98), q = pts[j];
        q[0] = lerp(b.x0, b.x1, j / M); q[1] = lerp(b.y0, b.y1, v); q[2] = FACE + 0.006;
      }
      lines.set(c, pts);
    });
    lines.commit();
    const dp = ease.outCubic(range(t, T.draw.line, T.draw.line + T.dur));
    for (let i = 0; i < DASH; i++) { dashes.prog[i] = clamp(dp * DASH - i); dashes.alpha[i] = dp > 0 ? 1 : 0; }
  });
  OBJECTS.push(() => {
    if (!KIT.group.visible || FRAME_T < T.plinth[0]) return [];
    const out = [{ id: 'plinth', rect: projectedBox(P.x0, 0, P.z - P.d / 2, P.x1, P.h, P.z + P.d / 2) }];
    SCR.forEach((s, i) => { const u = up(i, FRAME_T); if (u > 0.01) out.push({ id: 'screen-' + s.id, rect: projectedBox(s.a, y0, ZS - SD / 2, s.b, y0 + s.h * u, ZS + SD / 2) }); });
    return out;
  });
  return { P, SCR, T };
})();

/* The station so far, fitted to the visual zone: the monitoring area above the far edge, the gateway and its lanes in view */
const P_TOP = s => 2 * G + s.h;
const VIS_SHOT = isoFit([...STATION.view.platform, ...STATION.view.governance, ...STATION.view.compliance,
  [MONITOR.P.x1, 0, MONITOR.P.z + 0.55], [MONITOR.P.x1, 0, MONITOR.P.z - 0.55], ...MONITOR.SCR.map(s => [s.a, P_TOP(s), MONITOR.P.z - 0.2])], [990, 130, 1785, 905]);

const S09 = scene({
  name: SHOTS[8][1], start: shotAt(9), dur: SHOT_LEN[8],
  orbit: lt => mixOrbit(PLATFORM_SHOT, VIS_SHOT, ease.inOutCubic(range(lt, 0, 2.0))),
  build(root) {
    this.text = answerBlock(root, { id: 's9', tint: COL.tint.vis, head: ['See everything, live.'],
      sup: ['Live dashboards for usage, speed,', 'errors and cost across every team.'] });
  },
  render(lt) {
    this.text.play(lt, 0.5, this.dur - 0.5);
  },
});
