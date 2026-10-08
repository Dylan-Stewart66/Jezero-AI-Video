/* =========================================================
   The station: one layout for everything the later sections add to
   the platform, and the request traffic they all watch.
   Planned as one design, so the pull-back reads as a single station.
   Requests enter at the front right (governance: three sources, the
   gateway with its holding bay and log rail), cross the platform in
   three lanes, one beside each team's trays, and leave at the back
   left, where each team's cost meter stands on its own lane and a
   collector carries approved requests into the model hub. The
   monitoring area (visibility) stands behind the far edge at the back
   right; the evidence stack (compliance) holds the back corner.
   Every request is one cube on a fixed schedule, so the gateway's log,
   the dashboards, the model hub and the meters react to the same
   events. All of it is a function of time.
   ========================================================= */
const STATION = (() => {
  const x0 = SITE.origin.x, z0 = SITE.origin.z, x1 = x0 + SITE.gridSize.x, z1 = z0 + SITE.gridSize.z;
  const s7 = shotAt(7), s10 = shotAt(10), BL = 2;               // BL: the team whose budget runs out
  const lanes = SITE.lanes.map(siteZ);                         // back, middle, front: one beside each team group
  const L = {
    x0, z0, x1, z1, lanes,
    gx: x1 + 0.6,                                                // the gateway slab spans x from gx to gx + 0.5
    src: [1.1, 2.4, 3.7].map(d => x1 + 1.1 + d),                // sources, staggered so each label has its own row
    xc: x0 - 0.55,                                               // the collector, along the platform's back-left edge
    hubX: [x0 - 1.9, x0 - 3.3], hubDz: 0.8,                      // model blocks either side of the trunk
    meterX: siteX(0) + 0.12, meterDz: -0.45,                     // each team's meter stands in its lane, beside its trays
    bayDz: 0.95,                                                 // the holding bay, beside each lane at the gateway
  };
  L.mid = L.gx + 0.25;
  L.idX = L.gx + 0.85;                                           // identity check: at the gateway's entrance
  L.mdlX = L.gx - 0.3;                                           // model check: at its exit
  L.zs = [lanes[0] - 0.75, lanes[2] + 1.6];                      // the slab's ends (room for the last bay)
  // Models A and B on the first pair, C at the trunk's end; D, not approved, beside C with no track to it
  L.models = [[L.hubX[0], -1], [L.hubX[0], 1], [L.hubX[1], -1], [L.hubX[1], 1]].map(([x, s]) => ({ x, z: lanes[0] + s * L.hubDz, side: s }));
  L.UNAPPROVED = 3;

  /* ---------- The schedule ---------- */
  const V = 3.2, EVERY = 0.9, BRAKE = 0.6;
  const flow = [s7 + 0.6, shotAt(11)];
  // Phase each lane so the three streams interleave where they merge on the collector (a third of a period apart)
  const toJunction = k => (L.src[k] - L.xc) + Math.abs(lanes[k] - lanes[0]);
  const reqs = [];
  for (let k = 0; k < 3; k++) {
    const ph = (((k * EVERY / 3 - toJunction(k) / V) % EVERY) + EVERY) % EVERY;
    for (let s = flow[0] + ph; s < flow[1]; s += EVERY) reqs.push({ lane: k, spawn: s, tGate: s + (L.src[k] - L.idX) / V });
  }
  reqs.sort((a, b) => a.tGate - b.tGate);

  /* Rejections: about one request in six or seven, across all three lanes, of two kinds: stopped at the entrance
     (identity not allowed) or at the exit (asked for a model that isn't approved). Three are placed in shot 7. */
  const near = (lane, t) => reqs.filter(r => r.lane === lane).reduce((a, r) => Math.abs(r.tGate - t) < Math.abs(a.tGate - t) ? r : a);
  [[2, s7 + 2.0, 'id'], [0, s7 + 3.4, 'model'], [1, s7 + 4.9, 'id']].forEach(([k, t, kind]) => { near(k, t).fate = kind; });
  const HOLD = 4.0, lastRej = [-99, -99, -99];
  reqs.filter(r => r.fate).forEach(r => { lastRej[r.lane] = Math.max(lastRej[r.lane], r.tGate); });
  let since = 0, kind = 'model', gap = 6;
  reqs.forEach(r => {
    if (r.tGate < s7 + 7) { if (r.fate) since = 0; else since++; return; }
    since++;
    if (since < gap || r.tGate - lastRej[r.lane] < HOLD + 1.6 || (r.lane === BL && r.tGate > s10 - 1)) return;
    r.fate = kind; lastRej[r.lane] = r.tGate; since = 0; kind = kind === 'id' ? 'model' : 'id'; gap = gap === 6 ? 7 : 6;
  });
  // Approved requests go to an approved model: A, B or C
  const pick = rng(31);
  reqs.forEach(r => { r.fate = r.fate || 'ok'; if (r.fate === 'ok') { const u = pick(); r.model = u < 0.4 ? 0 : u < 0.75 ? 1 : 2; } });

  /* Paths: polylines in site x, z with cumulative lengths */
  const path = pts => { const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, len, total: len[len.length - 1] }; };
  const at = (p, s) => {
    s = clamp(s, 0, p.total);
    let i = 1; while (i < p.len.length - 1 && p.len[i] < s) i++;
    const u = (s - p.len[i - 1]) / Math.max(p.len[i] - p.len[i - 1], 1e-9);
    return [lerp(p.pts[i - 1][0], p.pts[i][0], u), lerp(p.pts[i - 1][1], p.pts[i][1], u)];
  };
  const ABSORB = 0.3;                                            // the cube runs this far into its model block as it shrinks
  reqs.forEach(r => {
    const k = r.lane, z = lanes[k], pts = [[L.src[k], z]];
    if (r.fate === 'id') pts.push([L.idX, z]);
    else if (r.fate === 'model') pts.push([L.mdlX, z]);
    else {
      const m = L.models[r.model];
      pts.push([L.xc, z]);
      if (k > 0) pts.push([L.xc, lanes[0]]);
      pts.push([m.x, lanes[0]], [m.x, m.z - m.side * (0.45 - ABSORB)]);
    }
    r.path = path(pts);
    r.stopS = r.fate === 'ok' ? null : r.path.total;              // where it brakes to a stop
    r.sMdl = L.src[k] - L.mdlX;                                   // arc length at the model check
    r.sMeter = L.src[k] - L.meterX;
  });

  /* The budget: one team's meter (the front lane's, where the queue shows clearly along the front edge) reaches its
     limit during shot 10, and its requests then wait in a short queue in front of the meter. The meters stand from tUp; each approved request passing a meter adds one
     segment. The prefill (spend so far) is set so the limit lands about 3.8s into the shot. */
  const CAP = [11, 12, 6], tUp = s10 + 1.3, CAP_AT = s10 + 3.8;
  const passTime = r => r.spawn + r.sMeter / V;
  const passes = (k, until = Infinity) => reqs.filter(r => r.lane === k && r.fate === 'ok' && passTime(r) > tUp && passTime(r) < until).map(passTime).sort((a, b) => a - b);
  const p1 = passes(BL);
  const nCap = p1.reduce((b, t, i) => Math.abs(t - CAP_AT) < Math.abs(p1[b] - CAP_AT) ? i : b, 0);
  const prefill = [0, 0, 0]; prefill[BL] = Math.max(1, CAP[BL] - (nCap + 1));
  const tCap = p1[CAP[BL] - prefill[BL] - 1];
  let q = 0;
  reqs.filter(r => r.lane === BL && r.fate === 'ok' && passTime(r) > tCap + 1e-6).sort((a, b) => a.spawn - b.spawn).forEach(r => {
    r.fate = 'queue'; r.queueIdx = q++;
    r.stopS = r.sMeter - 0.42 - r.queueIdx * 0.52;
    r.path = path([[L.src[BL], lanes[BL]], [L.src[BL] - r.stopS, lanes[BL]]]);
  });
  // The other meters stay at least two segments below their limits while the station is in view (it is gone about
  // 3.2s into the ascent)
  [0, 1, 2].filter(k => k !== BL).forEach(k => { prefill[k] = Math.max(1, CAP[k] - passes(k, shotAt(11) + 3.5).length - 2); });

  /** Arc length along a request's path at time t: constant speed, braking evenly to a stop where it stops */
  function arcAt(r, t) {
    const s = V * (t - r.spawn);
    if (r.stopS == null) return s;
    const sb = r.stopS - BRAKE;
    if (s <= sb) return s;
    const tau = (s - sb) / V, ts = 2 * BRAKE / V;
    return tau >= ts ? r.stopS : sb + V * tau - (V * V / (4 * BRAKE)) * tau * tau;
  }
  const stopTime = r => r.spawn + (r.stopS - BRAKE) / V + 2 * BRAKE / V;

  /* Events every section reads */
  const ev = { gate: [], hub: [], meter: [[], [], []], log: [], modelReject: [] };
  reqs.forEach(r => {
    const tm = r.spawn + r.sMdl / V;
    if (r.fate === 'ok' || r.fate === 'queue') { ev.gate.push({ t: tm, lane: r.lane }); ev.log.push({ t: tm, ok: true }); }
    if (r.fate === 'ok') {
      ev.hub.push({ t: r.spawn + r.path.total / V, lane: r.lane, model: r.model });
      const tp = passTime(r);
      if (tp > tUp && (r.lane !== BL || tp <= tCap + 1e-6)) ev.meter[r.lane].push(tp);
    }
    if (r.fate === 'id' || r.fate === 'model') { r.tStop = stopTime(r); ev.log.push({ t: r.tStop, ok: false }); }
    if (r.fate === 'model') ev.modelReject.push(r.tStop);
  });
  ['gate', 'hub', 'log'].forEach(k => ev[k].sort((a, b) => a.t - b.t));
  ev.meter.forEach(a => a.sort((a, b) => a - b));

  /**
   * Request r at time t: site position, scale, colour, and (for rejected ones) how far it has moved aside into the bay.
   * White until the gateway decides; mint once approved; coral when stopped.
   */
  const cA = new THREE.Color(), cB = new THREE.Color();
  const mixC = (a, b, u) => '#' + cA.set(a).lerp(cB.set(b), clamp(u)).getHexString();
  function cubeAt(r, t) {
    if (t < r.spawn) return null;
    const s = arcAt(r, t), [x, z] = at(r.path, s);
    let scale = ease.outCubic(range(t, r.spawn, r.spawn + 0.25)), col = COL.ink, dz = 0;
    if (r.fate === 'ok' || r.fate === 'queue') {
      col = mixC(COL.ink, COL.mint, range(s, r.sMdl - 0.12, r.sMdl + 0.12));
      if (r.fate === 'ok') { scale *= 1 - range(s, r.path.total - ABSORB, r.path.total); if (s >= r.path.total) return null; }
    } else {
      const ts = r.tStop;
      col = mixC(COL.ink, COL.coral, range(t, ts, ts + 0.25));
      dz = L.bayDz * ease.inOutCubic(range(t, ts + 0.45, ts + 0.95));
      scale *= 1 - ease.inOutCubic(range(t, ts + 0.95 + HOLD, ts + 1.45 + HOLD));
      if (t > ts + 1.45 + HOLD) return null;
    }
    return { x, z: z + dz, s: scale, col };
  }

  /** Points that must be in view for each stage of the station (site x, y, z), for isoFit */
  const view = {
    platform: [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]],
    governance: [
      [L.xc - 0.1, 0, lanes[2] + 0.2],
      [L.hubX[1] - 0.45, 0.85, lanes[0] - 1.25], [L.hubX[1] - 0.45, 0.85, lanes[0] + 1.25], [L.hubX[0] + 0.45, 0.85, lanes[0] - 1.25],
      [L.gx + 0.7, 1.15, L.zs[0]], [L.gx + 0.7, 0, L.zs[1]],
      ...lanes.map((z, k) => [L.src[k] + 0.5, 0, z - 0.5]), ...lanes.map((z, k) => [L.src[k] + 0.5, 0, z + 0.5]),
    ],
    compliance: [[x0 - 1.25, 1.4, z0 - 1.25]],
  };
  return { L, V, EVERY, reqs, ev, cubeAt, BL, CAP, prefill, tUp, tCap, flow, view, CUBE: 3 * G };
})();
if (RECORD) console.log('station', JSON.stringify({
  shot7: (() => { const a = STATION.reqs.filter(r => r.tGate > shotAt(7) && r.tGate < shotAt(8)); return { atGate: a.length, rejected: a.filter(r => r.fate === 'id' || r.fate === 'model').length }; })(),
  all: (() => { const a = STATION.reqs.filter(r => r.tGate < shotAt(11)); return { atGate: a.length, rejected: a.filter(r => r.fate === 'id' || r.fate === 'model').length }; })(),
  tCap: +STATION.tCap.toFixed(2), prefill: STATION.prefill, queued: STATION.reqs.filter(r => r.fate === 'queue').length,
  firstHub: STATION.ev.hub.slice(0, 4).map(e => +e.t.toFixed(2)),
}));
