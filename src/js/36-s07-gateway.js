/* =========================================================
   Shot 7 (27 to 34s), layout B: "Every AI request checked." with the
   supporting line "One gateway for every team, app and agent. Approved
   models only, every prompt logged." in the governance tint.
   Governance, in violet. Requests from three sources (agents, apps,
   teams) come to one gateway across the platform's front edge, where
   each is checked twice: who is asking, at the entrance, and whether
   the model it asks for is approved, at the exit. Approved requests
   turn mint, cross the platform in their lanes and run on, by a
   collector along the back edge, into a cluster of model blocks; the
   fourth block, a model that isn't approved, stands dimmed with no
   track to it. About one request in six or seven is stopped, across
   all three lanes: turned coral and moved aside into the holding bay.
   Every request leaves a mark on the log rail along the gateway, so
   the audit trail builds up. Labels: Agents, Apps, Teams.
   The traffic itself is planned in STATION (35a-station.js).
   ========================================================= */
const GATE = (() => {
  const { L, reqs, ev, cubeAt, CUBE } = STATION;
  const s7 = shotAt(7), z = L.lanes, C = COL.gov;
  const T = { rise: [s7, s7 + 1], draw: [s7 + 0.2, s7 + 1.2], back: [s7 + 0.9, s7 + 1.6], hub: [s7 + 0.7, s7 + 1.7] };
  const cA = new THREE.Color(), cB = new THREE.Color();
  const mixC = (a, b, u) => '#' + cA.set(a).lerp(cB.set(b), clamp(u)).getHexString();

  /* The gateway: a slab on four columns across the front edge, and the log rail along its outer face */
  const SL = { w: 4 * G, h: 3 * G, y: 6 * G, d: L.zs[1] - L.zs[0], cz: (L.zs[0] + L.zs[1]) / 2 };
  const slab = KIT.parts(KIT.box(SL.w, SL.h, SL.d), KIT.boxSegs(SL.w, SL.h, SL.d), 1);
  const colZ = [L.zs[0] + G, (z[0] + z[1]) / 2, (z[1] + z[2]) / 2, L.zs[1] - G];
  const col = KIT.parts(KIT.box(2 * G, SL.y, 2 * G), KIT.boxSegs(2 * G, SL.y, 2 * G), colZ.length);
  const RAIL = { x: L.gx + SL.w + 0.09, y: SL.y + 0.5 * G, w: G, h: 0.6 * G };
  const rail = KIT.parts(KIT.box(RAIL.w, RAIL.h, SL.d), KIT.boxSegs(RAIL.w, RAIL.h, SL.d), 1);
  // One thin mark per request, in order along the rail: a barcode that grows, not a stack
  const N = ev.log.length, MP = (SL.d - 0.3) / N;
  const marks = KIT.parts(KIT.box(RAIL.w * 0.8, 2.2 * G, Math.min(0.05, MP * 0.5)), null, N, { cast: false });
  // The two checks, as thin strips across each lane: who is asking, at the entrance; which model, at the exit.
  // A strip flashes coral when its check stops a request.
  const CHK = [L.gx + SL.w + 0.08, L.gx - 0.26];
  const strips = KIT.parts(KIT.box(0.08, 0.02, 0.7), null, 6, { cast: false });
  const stops = [0, 1].map(c => z.map((_, k) => reqs.filter(r => r.lane === k && r.fate === (c ? 'model' : 'id')).map(r => r.tStop)));

  /* Sources, and the holding bay: three low walls round a pad beside each lane, open towards it */
  const src = KIT.parts(KIT.box(8 * G, G, 8 * G), KIT.boxSegs(8 * G, G, 8 * G), 3);
  const BAY = { x: (L.idX + L.mdlX) / 2, w: L.idX - L.mdlX + 0.6, d: 0.8, h: 1.5 * G, t: 0.06 };
  const bayGeo = KIT.boxes([
    [BAY.w, BAY.h, BAY.t, 0, BAY.h / 2, BAY.d / 2 - BAY.t / 2],
    [BAY.t, BAY.h, BAY.d - BAY.t, BAY.w / 2 - BAY.t / 2, BAY.h / 2, -BAY.t / 2],
    [BAY.t, BAY.h, BAY.d - BAY.t, -BAY.w / 2 + BAY.t / 2, BAY.h / 2, -BAY.t / 2],
  ]);
  const bays = KIT.parts(bayGeo, KIT.boxEdges(BAY.w, BAY.h, BAY.d, 0, BAY.h / 2, 0), 3);

  /* Tracks: lanes from the sources through the gateway and across the platform, the collector, the trunk into the hub
     and a short spur to each approved model (none to the one that isn't approved) */
  const m = L.models;
  const TR = [
    ...z.map((zz, k) => ({ a: [L.gx, zz], b: [L.src[k], zz], when: 'draw' })),
    ...z.map(zz => ({ a: [L.gx, zz], b: [L.xc, zz], when: 'draw' })),
    { a: [L.xc, z[2]], b: [L.xc, z[0]], when: 'back' },
    { a: [L.xc, z[0]], b: [L.hubX[1], z[0]], when: 'back' },
    ...[0, 1, 2].map(i => ({ a: [m[i].x, z[0]], b: [m[i].x, m[i].z - m[i].side * 0.45], when: 'back' })),
  ];
  const track = KIT.parts(KIT.box(1, 0.02, 1), null, TR.length, { cast: false });

  /* The model hub: four blocks, each a base with a core on top. Approved ones light their core as a request arrives. */
  const MB = { w: 0.9, h: 0.55, c: 0.55, ch: 0.3 };
  const mBase = KIT.parts(KIT.box(MB.w, MB.h, MB.w), KIT.boxSegs(MB.w, MB.h, MB.w), 4);
  const mCore = KIT.parts(KIT.box(MB.c, MB.ch, MB.c), KIT.boxSegs(MB.c, MB.ch, MB.c), 4);

  const cubes = KIT.parts(KIT.box(CUBE, CUBE, CUBE), null, reqs.length, { cast: true });
  const pulse = (list, t, d) => list.reduce((p, e) => t >= e && t < e + d ? Math.max(p, 1 - (t - e) / d) : p, 0);
  const hubTimes = [0, 1, 2, 3].map(i => ev.hub.filter(e => e.model === i).map(e => e.t));

  FRAME_START.push(t => {
    if (!KIT.group.visible) return;
    const up = ease.crit(range(t, ...T.rise));
    colZ.forEach((zz, i) => col.set(i, L.mid, 0, zz, 1, up, 1, C[2], C[3]));
    slab.set(0, L.mid, SL.y * up, SL.cz, 1, up, 1, C[3], mixHex(C[3], COL.ink, 0.35));
    rail.set(0, RAIL.x, RAIL.y * up, SL.cz, up, up, 1, C[2], C[3]);
    ev.log.forEach((e, i) => {
      const s = ease.outCubic(range(t, e.t, e.t + 0.2));
      marks.set(i, RAIL.x, RAIL.y + RAIL.h, L.zs[0] + 0.15 + (i + 0.5) * MP, s, s, s, e.ok ? C[4] : COL.coral);
    });
    z.forEach((zz, k) => {
      [0, 1].forEach(c => strips.set(c * 3 + k, CHK[c], 0.004, zz, up, 1, up, mixC(C[4], COL.coral, pulse(stops[c][k], t, 1.0))));
      src.set(k, L.src[k], 0, zz, up, up, up, C[2], C[3]);
      bays.set(k, BAY.x, 0, zz + L.bayDz, 1, up, 1, C[2], C[3]);
    });
    // Tracks draw out from the gateway: upstream to the sources, downstream across the platform, then on to the hub
    TR.forEach((r, i) => {
      const p = ease.inOutCubic(range(t, ...T[r.when]));
      const bx = lerp(r.a[0], r.b[0], p), bz = lerp(r.a[1], r.b[1], p);
      const w = Math.abs(bx - r.a[0]), d = Math.abs(bz - r.a[1]);
      track.set(i, (r.a[0] + bx) / 2, 0.002, (r.a[1] + bz) / 2, p > 0 ? Math.max(w, G) : 0, 1, p > 0 ? Math.max(d, G) : 0, C[0]);
    });
    // Model blocks rise one after another; the unapproved one stays dim, and flashes coral when a request asks for it
    m.forEach((b, i) => {
      const u = ease.crit(range(t, T.hub[0] + i * 0.12, T.hub[0] + 0.6 + i * 0.12));
      const off = i === L.UNAPPROVED;
      const flash = off ? 0 : pulse(hubTimes[i], t, 0.45), warn = off ? pulse(ev.modelReject, t, 0.9) : 0;
      mBase.set(i, b.x, 0, b.z, u, u, u, off ? C[0] : C[2], mixC(off ? C[1] : C[3], COL.coral, warn));
      mCore.set(i, b.x, MB.h * u, b.z, u, u, u, off ? C[1] : mixC(C[3], C[4], flash), mixC(off ? C[1] : C[4], COL.coral, warn));
    });
    reqs.forEach((r, i) => {
      const c = cubeAt(r, t);
      if (c) cubes.set(i, c.x, 0.02, c.z, c.s, c.s, c.s, c.col, c.col); else cubes.set(i, 0, 0, 0, 0, 0, 0);
    });
    [slab, col, rail, marks, strips, src, bays, track, mBase, mCore, cubes].forEach(p => p.commit());
  });

  // Objects labels must keep clear of
  OBJECTS.push(() => {
    if (!KIT.group.visible || FRAME_T < T.rise[0]) return [];
    const out = z.map((zz, k) => ({ id: 'source-' + k, rect: projectedBox(L.src[k] - 0.5, 0, zz - 0.5, L.src[k] + 0.5, G, zz + 0.5) }));
    out.push({ id: 'gate', rect: projectedBox(L.gx, 0, L.zs[0], RAIL.x + RAIL.w, SL.y + SL.h, L.zs[1]) });
    z.forEach((zz, k) => out.push({ id: 'bay-' + k, rect: projectedBox(BAY.x - BAY.w / 2, 0, zz + L.bayDz - BAY.d / 2, BAY.x + BAY.w / 2, BAY.h, zz + L.bayDz + BAY.d / 2) }));
    m.forEach((b, i) => out.push({ id: 'model-' + i, rect: projectedBox(b.x - MB.w / 2, 0, b.z - MB.w / 2, b.x + MB.w / 2, MB.h + MB.ch, b.z + MB.w / 2) }));
    reqs.forEach((r, i) => { const c = cubeAt(r, FRAME_T); if (c && c.s > 0.05) out.push({ id: 'cube-' + i, rect: projectedBox(c.x - CUBE / 2, 0, c.z - CUBE / 2, c.x + CUBE / 2, CUBE, c.z + CUBE / 2) }); });
    return out;
  });
  return { T, SL, RAIL, MB, z };
})();

/* Framing: the whole route in view, from the sources and their labels at the front right to the model hub at the back
   left, with the platform kept clear of the text column */
const GATE_SHOT = isoFit([...STATION.view.platform, ...STATION.view.governance], [990, 200, 1650, 900]);   // right edge: room for the labels
const GATE_LABEL = (() => {
  // Fixed slots, chosen once from the resting framing: one aligned column right of the sources, each level with its own
  const cam = orbitShot(GATE_SHOT);
  WORLD.setShot(cam);
  const L = STATION.L, anchors = L.lanes.map((zz, k) => [L.src[k] + 0.32, G, zz - 0.32]);
  const pts = anchors.map(a => WORLD.project(KIT.worldOf(...a)));
  const x = snap8(Math.max(...pts.map(p => p.x)) + 40);
  return pts.map((p, k) => ({ x, top: snap8(p.y - TYPE.label.lh / 2), anchor: () => anchors[k] }));
})();
if (RECORD) console.log('gate label slots', JSON.stringify(GATE_LABEL.map(l => [l.x, l.top])));
LABEL_SLOTS.agents = GATE_LABEL[0]; LABEL_SLOTS.apps = GATE_LABEL[1]; LABEL_SLOTS.teams = GATE_LABEL[2];

const S07 = scene({
  name: SHOTS[6][1], start: shotAt(7), dur: SHOT_LEN[6],
  orbit: lt => mixOrbit(isoAfterDescent(shotAt(7)), GATE_SHOT, ease.inOutCubic(range(lt, 0, 1.8))),
  build(root) {
    this.text = answerBlock(root, { id: 's7', tint: COL.tint.gov, head: ['Every AI request', 'checked.'],
      sup: ['One gateway for every team, app and agent.', 'Approved models only, every prompt logged.'] });
    this.labels = [['agents', 'Agents'], ['apps', 'Apps'], ['teams', 'Teams']].map(([id, text]) =>
      diagramLabel(root, { id: 'label-' + id, text, slot: LABEL_SLOTS[id], anchor: LABEL_SLOTS[id].anchor }));
  },
  render(lt) {
    const out = this.dur - 0.5;
    this.text.play(lt, 0.5, out);
    this.labels.forEach((L, k) => L.play(lt, 1.5 + k * BEAT, out));
  },
});
