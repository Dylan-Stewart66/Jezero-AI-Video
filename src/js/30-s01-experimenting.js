/* =========================================================
   Shot 1 (0 to 4s), layout A: "Everyone's playing with AI."
   Mars from orbit, mostly night side, drifting slowly towards the
   terminator. Dozens of silver pins rise across the surface: AI
   agents and pilots.
   ========================================================= */

/** The slow orbit drift shared by shots 1 to 4: planet framed right, turning towards the terminator */
// The planet sits 40px further right and a touch smaller than at first, so the display-size headline clears its limb
const DRIFT = { yaw0: 152, yawRate: -0.9, pitch: 34, fov: 36, px: 1540, py: 540, rpx: 370, push: 0.9 };
const planetDrift = t => frameBody({
  center: PLANET.center, R: PLANET.R, yaw: DRIFT.yaw0 + DRIFT.yawRate * t, pitch: DRIFT.pitch, fov: DRIFT.fov,
  px: DRIFT.px, py: DRIFT.py, rpx: DRIFT.rpx + DRIFT.push * t,
});

/* The sun is fixed in the world. It is placed from the opening view: behind the planet and
   up to the right, so the opening shows a thin lit crescent with Jezero just inside it. */
const SUN = (() => {
  // Placed from the opening framing as first approved (planet at x 1500, radius 380), so the light never moved
  const s = orbitShot(frameBody({ center: PLANET.center, R: PLANET.R, yaw: DRIFT.yaw0, pitch: DRIFT.pitch, fov: DRIFT.fov, px: 1500, py: 540, rpx: 380 }));
  const P = V3(...s.pos), T = V3(...s.target), C = MARS.C;
  const dir0 = P.clone().sub(C).normalize();
  const f = T.clone().sub(P).normalize(), r = V3(0, 0, 0).crossVectors(f, V3(0, 1, 0)).normalize(), u = V3(0, 0, 0).crossVectors(r, f);
  const screenAngle = 50 * DEG, phase = 116 * DEG;
  const perp = r.multiplyScalar(Math.cos(screenAngle)).add(u.multiplyScalar(Math.sin(screenAngle)));
  perp.addScaledVector(dir0, -perp.dot(dir0)).normalize();
  return dir0.multiplyScalar(Math.cos(phase)).add(perp.multiplyScalar(Math.sin(phase))).normalize();
})();
MARS.setSun(SUN);

/* ---------- Points of light: placed on the night side the camera sees in shots 1 to 4 ---------- */
const AGENTS = (() => {
  const r = rng(2024), C = MARS.C;
  const camDir = t => V3(...orbitShot(planetDrift(t)).pos).sub(C).normalize();
  const v1 = camDir(1), v8 = camDir(8);
  // Across the night side and over the terminator into the sunlit crescent, where the pins cast their shadows
  const ok = n => n.dot(v1) > 0.36 && n.dot(v8) > 0.3 && n.dot(SUN) < 0.3;
  const randDir = () => { const u = r() * 2 - 1, th = r() * TAU, s = Math.sqrt(1 - u * u); return V3(Math.cos(th) * s, u, Math.sin(th) * s); };
  const pick = test => { for (let k = 0; k < 4000; k++) { const n = randDir(); if (test(n)) return n; } return null; };
  // Loose clusters (organisations) plus a few singles
  const dirs = [];
  const centres = [];
  while (centres.length < 8) { const c = pick(n => ok(n) && centres.every(o => o.angleTo(n) > 0.3)); if (!c) break; centres.push(c); }
  centres.forEach(c => {
    const n = 2 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const p = pick(m => ok(m) && m.angleTo(c) < 0.16 && dirs.every(o => o.angleTo(m) > 0.07));
      if (p) dirs.push(p);
    }
  });
  while (dirs.length < 40) { const p = pick(m => ok(m) && dirs.every(o => o.angleTo(m) > 0.08)); if (!p) break; dirs.push(p); }
  // Appear: a few at first, then dozens
  const order = dirs.map((_, i) => [i, r()]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
  const appear = new Array(dirs.length);
  order.forEach((i, k) => { appear[i] = 0.5 + 2.5 * Math.pow(k / dirs.length, 0.55); });
  // Five survivors, spread far apart (farthest-point sampling); the rest fail during shot 2
  // Survivors must face the camera squarely from shot 2 until the descent, so none sits on the limb
  const v6 = camDir(6), v13 = camDir(13);
  const pool = dirs.map((d, i) => i).filter(i => dirs[i].dot(v6) > 0.62 && dirs[i].dot(v13) > 0.55);
  const surv = [pool.reduce((a, i) => (dirs[i].dot(v6) > dirs[a].dot(v6) ? i : a), pool[0])];
  while (surv.length < 5 && surv.length < pool.length) {
    let best = -1, bestD = -1;
    pool.forEach(i => { if (surv.includes(i)) return; const m = Math.min(...surv.map(s => dirs[s].angleTo(dirs[i]))); if (m > bestD) { bestD = m; best = i; } });
    surv.push(best);
  }
  const fail = dirs.map((_, i) => surv.includes(i) ? 99 : shotAt(2) + 0.5 + 2.0 * r());
  const out = dirs.map((_, i) => surv.includes(i) ? shotAt(5) : 99);
  // The few that make it to production go live (mint) as the others go out
  const live = dirs.map((_, i) => surv.includes(i) ? shotAt(2) + 2.5 : 99);
  const sp = makeSurfacePoints(dirs, { appear, fail, out, live, seed: 7, color: COL.silver });
  WORLD.scene.add(sp.pts);
  FRAME_START.push(t => { sp.U.uT.value = t; });
  return { ...sp, dirs, survivors: surv };
})();

const S01 = scene({
  name: SHOTS[0][1], start: shotAt(1), dur: SHOT_LEN[0],
  orbit: lt => planetDrift(lt),
  build(root) {
    this.head = textBlock(root, {
      id: 's1-head', slot: 'A', style: 'display', x: LAYOUT.A.x, top: topA('display', 2),
      lines: ['Everyone’s playing', 'with AI.'],
    });
  },
  render(lt) {
    playBlock(this.head, lt, 0.5, 3.4);   // one beat of planet alone first
  },
});
