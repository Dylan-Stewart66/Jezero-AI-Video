/* =========================================================
   Shot 11 (53 to 61.5s), layout B: "Your AI agents, in production."
   with the supporting line "Fast, secure and fully governed, from day
   one." in mint.
   The tracker fades out. The camera rises out of the crater to orbit in
   one continuous move, the descent's dolly-zoom in reverse (isometric
   back to cinematic), with the platform held in the right half; as the
   3D station fades, a plan of it in its section colours stays drawn in
   the crater floor (jzStation), through the rest of the orbit shots.
   Mint pins rise across the planet, each linked to Jezero by a fine arc
   that starts and ends on the surface and never leaves the planet's
   disc; mint pulses run out along every arc and back, each on its own
   steady rhythm: live traffic. Then a slow push-in.
   ========================================================= */

/** Monotone cubic through keys (Fritsch-Carlson): smooth, and never overshoots a hold */
function monotone(ts, vs) {
  const n = ts.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return t => {
    if (t <= ts[0]) return vs[0] + m[0] * (t - ts[0]);
    if (t >= ts[n - 1]) return vs[n - 1] + m[n - 1] * (t - ts[n - 1]);
    let i = 0; while (t > ts[i + 1]) i++;
    const h = ts[i + 1] - ts[i], u = (t - ts[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}

/**
 * The camera from the end of the ascent to the end of the loop (shots 11 to 13). The sun sits at yaw -54,
 * so turning the camera's yaw down from 222 brings the planet from mostly lit, through the end card's
 * half-light, round to the night side of the opening. Over the last seconds it blends into shot 1's drift,
 * matching its position and speed at the loop point.
 */
const POST = (() => {
  const s13 = shotAt(13);
  // Shots 11 and 12 look down more steeply than the opening (pitch 55, not 34), which brings Jezero in from the
  // limb towards the middle of the disc, so the arcs fan out from it rather than running down like meridians
  const s12 = shotAt(12);
  const K = [   // time, yaw, pitch, planet centre x and y, planet radius (stage pixels)
    [shotAt(11), 222, 55, 1480, 570, 336],             // where the ascent arrives (held, so the rise has a fixed goal)
    [shotAt(11) + 5.0, 222, 55, 1480, 570, 336],
    [s12, 216, 57, 1470, 580, 372],                    // a slow push-in through the production shot
    [s12 + 5.0, 206, 64, 1460, 600, 372],              // ways in: an orbit that brings the crater towards the disc's centre
    [s13 - 0.5, 203, 63, 1460, 600, 372],              //   as the four lines arrive
    // The end card: centred in columns 8 to 12, fully in frame with clear space all round (pins cannot reach the edge)
    [s13 + 2.0, 197, 42, LAYOUT.D.planet.cx, LAYOUT.D.planet.cy, LAYOUT.D.planet.r],
    [s13 + 6.0, 190, 39, LAYOUT.D.planet.cx, LAYOUT.D.planet.cy, LAYOUT.D.planet.r],
    [DURATION, 186, 37, LAYOUT.D.planet.cx, LAYOUT.D.planet.cy, LAYOUT.D.planet.r],
  ];
  const ts = K.map(k => k[0]);
  const [yawS, pitchS, pxS, pyS, rS] = [1, 2, 3, 4, 5].map(j => monotone(ts, K.map(k => k[j])));
  const LOOP = { yaw: [s13 + 5.5, DURATION], pos: [s13 + 6.5, DURATION] };
  return t => {
    const D = DRIFT, u = t - DURATION;   // shot 1's drift, continued back before the loop point
    const wy = ease.inOutCubic(range(t, ...LOOP.yaw)), wp = ease.inOutCubic(range(t, ...LOOP.pos));
    return frameBody({
      center: PLANET.center, R: PLANET.R, fov: D.fov,
      yaw: lerp(yawS(t), D.yaw0 + D.yawRate * u, wy), pitch: lerp(pitchS(t), D.pitch, wy),
      px: lerp(pxS(t), D.px, wp), py: lerp(pyS(t), D.py, wp), rpx: lerp(rS(t), D.rpx + D.push * u, wp),
    });
  };
})();

/** Where world point P sits in an orbit: its stage position and the frame height at its depth */
function anchorOf(o, P) {
  const s = orbitShot(o), cam = V3(...s.pos), f = V3(...s.target).sub(cam).normalize();
  const r = V3(0, 0, 0).crossVectors(f, V3(0, 1, 0)).normalize(), u = V3(0, 0, 0).crossVectors(r, f);
  const q = P.clone().sub(cam), frameH = q.dot(f) * Math.tan(o.fov * DEG / 2);
  return { yaw: o.yaw, pitch: o.pitch, fov: o.fov, frameH, px: W / 2 + q.dot(r) / frameH * (H / 2), py: H / 2 - q.dot(u) / frameH * (H / 2) };
}
/** The orbit that shows world point P at stage pixel (px, py), seen from (yaw, pitch), with frameH at P's depth */
function orbitAt(P, a) {
  const yr = a.yaw * DEG, pr = a.pitch * DEG;
  const f = V3(-Math.cos(pr) * Math.sin(yr), -Math.sin(pr), -Math.cos(pr) * Math.cos(yr));
  const r = V3(0, 0, 0).crossVectors(f, V3(0, 1, 0)).normalize(), u = V3(0, 0, 0).crossVectors(r, f);
  const depth = a.frameH / Math.tan(a.fov * DEG / 2);
  const sx = (a.px - W / 2) / (H / 2) * a.frameH, sy = (H / 2 - a.py) / (H / 2) * a.frameH;
  const cam = P.clone().addScaledVector(f, -depth).addScaledVector(r, -sx).addScaledVector(u, -sy);
  return { target: cam.addScaledVector(f, depth).toArray(), yaw: a.yaw, pitch: a.pitch, frameH: a.frameH, fov: a.fov };
}

/**
 * The ascent: the platform's centre glides from where it sits in the isometric view to Jezero's place on
 * the framed planet while the frame widens on a log scale and fov eases from 7 to 36. The camera only
 * turns once it is clear of the crater, so the isometric view never twists.
 */
const ASC = { span: [shotAt(11), shotAt(11) + 5.0], kitOffFrameH: 240 };
const ASC_ANCHOR = V3(...KIT.worldOf(SITE.centre.x, 0, SITE.centre.z));
const ASC_FROM = anchorOf(COST_SHOT, ASC_ANCHOR);   // where shot 10 leaves the camera
function ASCENT(t) {
  const u = range(t, ...ASC.span);
  if (u >= 1) return POST(t);
  const a = ASC_FROM, b = anchorOf(POST(t), ASC_ANCHOR);
  const w = ease.inOutCubic(u), wy = ease.inOutCubic(range(u, 0.3, 1));
  const lg = (x, y) => Math.exp(lerp(Math.log(x), Math.log(y), w));
  return orbitAt(ASC_ANCHOR, { yaw: lerp(a.yaw, b.yaw, wy), pitch: lerp(a.pitch, b.pitch, wy), fov: lg(a.fov, b.fov), frameH: lg(a.frameH, b.frameH), px: lerp(a.px, b.px, w), py: lerp(a.py, b.py, w) });
}
/** The platform is switched off once the rising camera has made it a few pixels across */
const KIT_OFF = (() => { for (let t = ASC.span[0]; t < ASC.span[1]; t += 0.01) if (ASCENT(t).frameH > ASC.kitOffFrameH) return t; return ASC.span[1]; })();

/* ---------- Mint points across the planet, each linked to Jezero by a fine arc ---------- */
const PROD = (() => {
  const s11 = shotAt(11), C = MARS.C, R = MARS.R, J = V3(0, 1, 0);
  const camDir = t => V3(...orbitShot(POST(t)).pos).sub(C).normalize();
  const vA = camDir(ASC.span[1]), vB = camDir(shotAt(13) - 0.5);
  // Spread evenly over the face the camera sees in shots 11 and 12, clear of the limb and of Jezero itself
  const r = rng(4242), cand = [];
  for (let i = 0; i < 1500; i++) {
    const z = r() * 2 - 1, th = r() * TAU, s = Math.sqrt(1 - z * z), n = V3(Math.cos(th) * s, z, Math.sin(th) * s);
    if (n.dot(vA) > 0.5 && n.dot(vB) > 0.5 && n.angleTo(J) > 0.22) cand.push(n);
  }
  const dirs = [];
  while (dirs.length < 14) {
    let best = null, bestD = -1;
    cand.forEach(n => { const d = Math.min(n.angleTo(J), ...dirs.map(o => o.angleTo(n))); if (d > bestD) { bestD = d; best = n; } });
    dirs.push(best);
  }
  // Order round Jezero, so the arcs sweep out one after another
  const ref = V3(0, 0, 0).crossVectors(J, vA).normalize(), ref2 = V3(0, 0, 0).crossVectors(J, ref);
  dirs.sort((a, b) => Math.atan2(a.dot(ref), a.dot(ref2)) - Math.atan2(b.dot(ref), b.dot(ref2)));
  const N = dirs.length, SEG = 40, DRAW = 0.6;
  const start = dirs.map((_, k) => s11 + 3.6 + k * 0.18);
  const appear = start.map(s => s + DRAW - 0.1);
  const out = dirs.map((_, k) => shotAt(13) + 2.0 + 3.0 * k / N);   // they go out during the end card
  const sp = makeSurfacePoints(dirs, { appear, out, seed: 11, color: COL.mint });
  WORLD.scene.add(sp.pts);
  FRAME_START.push(t => { sp.U.uT.value = t; });
  // Arcs: from Jezero's floor out to each pin's foot, both ends on the surface, lifted between in proportion to their
  // length. Each arc is checked against every camera it is seen from: if any part would show outside the planet's
  // disc, its lift is lowered until none does.
  const arcs = makeLines({ curves: N, segs: SEG, color: COL.mint, width: 1.5, occlude: true, depthTest: false });
  const FADE = [shotAt(12) - 0.5, shotAt(12)];   // gone before shot 12's trajectories, the only lines there
  const arcPts = (n, lift) => {
    const th = J.angleTo(n), pts = [];
    for (let j = 0; j <= SEG; j++) {
      const s = j / SEG, d = J.clone().multiplyScalar(Math.sin((1 - s) * th)).addScaledVector(n, Math.sin(s * th)).divideScalar(Math.sin(th));
      pts.push(C.clone().addScaledVector(d, R + 0.4 + lift * th * R * Math.sin(Math.PI * s)));
    }
    return pts;
  };
  /** True if every drawn point stays inside the planet's disc, with 3px to spare, from every camera between t0 and t1 */
  const insideDisc = (pts, t0, t1) => {
    for (let t = t0; t <= t1 + 1e-6; t += 0.1) {
      const o = ASCENT(t), cam = V3(...orbitShot(o).pos), px = 2 * o.frameH / H * C.distanceTo(cam) / V3(...o.target).distanceTo(cam);
      const drawn = ease.inOutCubic(range(t, t0, t0 + DRAW)) * (pts.length - 1);
      for (const P of pts.slice(0, Math.floor(drawn) + 1)) {
        const v = P.clone().sub(cam), w = C.clone().sub(cam);
        if (v.clone().cross(w).length() / v.length() > R - 3 * px) return false;
      }
    }
    return true;
  };
  const LIFT = dirs.map((n, k) => {
    let lift = 0.05;
    while (lift > 0.004 && !insideDisc(arcPts(n, lift), start[k], FADE[1])) lift *= 0.8;
    return lift;
  });
  const PTS = dirs.map((n, k) => arcPts(n, LIFT[k]));
  PTS.forEach((pts, k) => arcs.set(k, pts.map(p => p.toArray())));
  arcs.commit();
  FRAME_START.push(t => {
    const keep = 1 - ease.inOutSine(range(t, ...FADE));
    dirs.forEach((_, k) => { const p = ease.inOutCubic(range(t, start[k], start[k] + DRAW)); arcs.prog[k] = p; arcs.alpha[k] = t < FADE[1] && p > 0 ? keep : 0; });
  });

  /* Traffic: small mint pulses along every arc, out from the crater to the agent and back, each arc on its own steady
     period, its out and back pulses half a period apart. Constant speed; they fade in and out at the ends. */
  const hash = (i, k) => { const x = Math.sin(i * 91.7 + k * 47.3) * 43758.5453; return x - Math.floor(x); };
  const LEN = PTS.map(pts => pts.reduce((a, p, i) => i ? a + p.distanceTo(pts[i - 1]) : 0, 0)), maxLen = Math.max(...LEN);
  const PULSE = dirs.map((_, k) => ({ period: 2.2 + 1.3 * hash(k, 1), travel: 0.8 + 0.6 * LEN[k] / maxLen, phase: hash(k, 2) }));
  const NP = N * 2, pulseC = new Float32Array(NP * 3), pulseA = new Float32Array(NP);
  const pg = new THREE.InstancedBufferGeometry(), quad = new THREE.PlaneGeometry(2, 2);
  pg.index = quad.index; pg.setAttribute('position', quad.getAttribute('position'));
  const aC = new THREE.InstancedBufferAttribute(pulseC, 3), aA = new THREE.InstancedBufferAttribute(pulseA, 1);
  aC.setUsage(THREE.DynamicDrawUsage); aA.setUsage(THREE.DynamicDrawUsage);
  pg.setAttribute('aC', aC); pg.setAttribute('aA', aA); pg.instanceCount = NP;
  const pulses = new THREE.Mesh(pg, new THREE.ShaderMaterial({
    uniforms: { uK: WORLD.U.uK, uCol: { value: linVec(COL.mint) }, uRad: { value: 3.4 } },
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: `uniform float uK, uRad; attribute vec3 aC; attribute float aA; varying vec2 vQ; varying float vA;
      void main(){
        vec4 c = projectionMatrix * viewMatrix * vec4(aC, 1.);
        vQ = position.xy * (uRad + 1.5); vA = aA;
        c.xy += vQ / vec2(${W}., ${H}.) * 2. * c.w;
        gl_Position = aA > 0. ? c : vec4(2., 2., 2., 1.);
      }`,
    fragmentShader: `uniform vec3 uCol; uniform float uRad; varying vec2 vQ; varying float vA;
      void main(){ float r = length(vQ), aa = max(fwidth(r) * .7, 1e-3); float a = (1. - smoothstep(uRad - aa, uRad + aa, r)) * vA;
        if (a <= .001) discard; gl_FragColor = vec4(uCol * a, a); }`,
  }));
  pulses.frustumCulled = false; pulses.renderOrder = 7;
  WORLD.scene.add(pulses);
  const along = (pts, s) => {   // point at fraction s of the polyline (by index; its segments are near-equal)
    const x = clamp(s) * (pts.length - 1), i = Math.min(Math.floor(x), pts.length - 2);
    return pts[i].clone().lerp(pts[i + 1], x - i);
  };
  FRAME_START.push(t => {
    const keep = 1 - ease.inOutSine(range(t, ...FADE)), live = t < FADE[1];
    dirs.forEach((_, k) => {
      const P = PULSE[k], t0 = start[k] + DRAW;
      [0, 1].forEach(back => {
        const i = k * 2 + back, u = (((t - t0 - P.phase * P.period - back * P.period / 2) % P.period) + P.period) % P.period;
        const on = live && t >= t0 && u < P.travel;
        const s = back ? 1 - u / P.travel : u / P.travel;
        const p = along(PTS[k], s);
        pulseC.set(p.toArray(), i * 3);
        pulseA[i] = on ? keep * ease.inOutSine(range(s, 0, 0.08)) * (1 - ease.inOutSine(range(s, 0.92, 1))) : 0;
      });
    });
    aC.needsUpdate = true; aA.needsUpdate = true;
  });
  return { dirs, start, appear, out, LIFT };
})();

const S11 = scene({
  name: SHOTS[10][1], start: shotAt(11), dur: SHOT_LEN[10],
  orbit: lt => ASCENT(shotAt(11) + lt),
  build(root) {
    this.text = answerBlock(root, { id: 's11', tint: COL.mint, head: ['Your AI agents,', 'in production.'],
      sup: ['Fast, secure and fully governed,', 'from day one.'] });
  },
  render(lt) {
    // No text while the planet's surface fills the frame on the way up; it waits until the surface has cleared
    this.text.play(lt, 4.0, this.dur - 0.5);
  },
});

/* ---------- The station plan in the crater floor, for the orbit shots ---------- */
{
  const L = STATION.L, P = MONITOR.P, S = SCAN.S, U = MARS.U;
  const site = [   // [x0, x1, z0, z1] in site space, colour; drawn in this order
    [L.x0, L.x1, L.z0, L.z1, COL.plat[4]],                                     // the platform (infrastructure)
    [P.x0, P.x1, P.z - P.d / 2, P.z + P.d / 2, COL.vis[3]],                    // the monitoring plinth (visibility)
    [S.x - 0.5, S.x + 0.5, S.z - 0.5, S.z + 0.5, COL.comp[3]],                 // the evidence stack (compliance)
    [L.gx - 0.1, L.gx + 0.75, L.zs[0], L.zs[1], COL.gov[3]],                   // the gateway (governance)
    ...L.lanes.map((z, k) => [L.src[k] - 0.5, L.src[k] + 0.5, z - 0.5, z + 0.5, COL.gov[2]]),   // its sources
    [L.hubX[1] - 0.45, L.hubX[0] + 0.45, L.lanes[0] - 1.25, L.lanes[0] + 1.25, COL.gov[3]],      // the model hub
    ...COST.at.map(m => [m.x - 0.25, m.x + 0.25, m.z - 0.25, m.z + 0.25, COL.cost[3]]),         // the cost meters
  ];
  const world = ([x0, x1, z0, z1]) => { const a = KIT.worldOf(x0, 0, z0), b = KIT.worldOf(x1, 0, z1);
    return [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[2], b[2]), Math.max(a[2], b[2])]; };
  const plat = world(site[0]);
  site.forEach((e, i) => {
    const [x0, x1, z0, z1] = world(e);
    U.uStBox.value[i].set((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2);
    U.uStCol.value[i].copy(linVec(e[4]));
    U.uStOut.value[i].set(x0 >= plat[1] ? 1 : x1 <= plat[0] ? -1 : 0, z0 >= plat[3] ? 1 : z1 <= plat[2] ? -1 : 0);
  });
}
