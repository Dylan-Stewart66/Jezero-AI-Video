/* =========================================================
   Engine
   Every frame is a pure function of the master clock t (seconds):
   window.seek(t) renders it. Live playback is a requestAnimationFrame
   loop that calls seek. No timers, no CSS transitions.
   ========================================================= */
const PARAMS = new URLSearchParams(location.search);
const DEBUG = PARAMS.has('debug');
const RECORD = PARAMS.has('record') || PARAMS.has('check');
const SHOW_GRID = PARAMS.has('grid');

/* ---------- Maths and easing ---------- */
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;
/** Normalised progress of x through [a, b], clamped */
const range = (x, a, b) => clamp((x - a) / (b - a));
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

const ease = {
  linear: x => x,
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  /** A gentler exponential ease-out, used for text entrances */
  outExpoSoft: x => x >= 1 ? 1 : (1 - Math.pow(2, -6 * x)) / (1 - Math.pow(2, -6)),
  inOutQuint: x => x < .5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2,
  /** Critically damped spring from 0 to 1, settled at x = 1. No overshoot. */
  crit: x => { if (x >= 1) return 1; const k = 9, n = 1 - (1 + k) * Math.exp(-k); return (1 - (1 + k * x) * Math.exp(-k * x)) / n; },
};
/** Eased progress of t through [a, a + d] */
const ep = (t, a, d, fn = ease.outExpo) => fn(range(t, a, a + d));

/* ---------- Seeded random: frames are deterministic ---------- */
function rng(seed) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/* ---------- Colour ---------- */
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const toLin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
/** sRGB hex to a linear THREE.Color (for shaders) */
const linColor = h => new THREE.Color(h);   // THREE.Color converts sRGB hex to the linear working space
const linVec = h => { const c = new THREE.Color(h); return new THREE.Vector3(c.r, c.g, c.b); };
/** Relative luminance (WCAG) of an sRGB hex */
/** Mix two sRGB hex colours, as a CSS rgb() string */
const mixHex = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t) * 255)).join(',')})`; };
const luminance = h => { const [r, g, b] = hexRGB(h).map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

/* ---------- Cached style writes (avoid layout churn every frame) ---------- */
function setStyle(el, prop, val) {
  const c = el.__s || (el.__s = {});
  if (c[prop] !== val) { c[prop] = val; el.style[prop] = val; }
}
function setClass(el, cls, on) {
  const k = '__c_' + cls;
  if (el[k] !== on) { el[k] = on; el.classList.toggle(cls, on); }
}

/* =========================================================
   Camera
   One continuous camera. A shot is an orbit: look at `target` from
   direction (yaw, pitch), far enough that `frameH` world units show
   above and below the target. Narrow fov and long distance reads as
   isometric; wide fov and short distance reads as cinematic. Mixing
   two orbits eases fov and framing on a log scale: the dolly-zoom.
   (Kept from version 1.)
   ========================================================= */
const ISO_PITCH = Math.atan(1 / Math.SQRT2) / DEG;   // 35.26 degrees: true isometric
function orbitShot(o) {
  const d = o.frameH / Math.tan(o.fov * DEG / 2), cp = Math.cos(o.pitch * DEG);
  return {
    pos: [o.target[0] + d * cp * Math.sin(o.yaw * DEG), o.target[1] + d * Math.sin(o.pitch * DEG), o.target[2] + d * cp * Math.cos(o.yaw * DEG)],
    target: o.target.slice(), fov: o.fov,
  };
}
/** Any camera (pos, target, fov) expressed as an orbit, so it can be mixed with another */
function toOrbit(s) {
  const o = [0, 1, 2].map(i => s.pos[i] - s.target[i]), d = Math.hypot(...o);
  return { target: s.target.slice(), yaw: Math.atan2(o[0], o[2]) / DEG, pitch: Math.asin(o[1] / d) / DEG, frameH: d * Math.tan(s.fov * DEG / 2), fov: s.fov };
}
const isoOrbit = (target, frameH, yawOff = 0) => ({ target, yaw: 45 + yawOff, pitch: ISO_PITCH, frameH, fov: 7 });
const mixOrbit = (a, b, w) => ({
  target: a.target.map((v, i) => lerp(v, b.target[i], w)), yaw: lerp(a.yaw, b.yaw, w), pitch: lerp(a.pitch, b.pitch, w),
  frameH: Math.exp(lerp(Math.log(a.frameH), Math.log(b.frameH), w)), fov: Math.exp(lerp(Math.log(a.fov), Math.log(b.fov), w)),
});

/**
 * Frame a sphere: seen from direction (yaw, pitch) about its centre, with its disc
 * centred on stage pixel (px, py) at a radius of rpx pixels. Returns an orbit.
 */
function frameBody({ center, R, yaw, pitch, fov, px, py, rpx }) {
  const V = THREE.Vector3;
  const tanV = Math.tan(fov * DEG / 2), tanH = tanV * W / H;
  const alpha = Math.atan(rpx / (H / 2) * tanV);              // angular radius of the disc
  const d = R / Math.sin(alpha);
  const dir = new V(Math.cos(pitch * DEG) * Math.sin(yaw * DEG), Math.sin(pitch * DEG), Math.cos(pitch * DEG) * Math.cos(yaw * DEG));
  const C = new V(...center), P = C.clone().addScaledVector(dir, d);
  const f = C.clone().sub(P).normalize();                      // world direction to the centre
  const sx = (px - W / 2) / (W / 2) * tanH, sy = (H / 2 - py) / (H / 2) * tanV;
  const want = new V(sx, sy, -1).normalize();                  // where it should sit in camera space
  // Find the camera forward g (world up kept level) so the centre lands at `want`
  let g = f.clone();
  const up = new V(0, 1, 0), q = new THREE.Quaternion();
  for (let i = 0; i < 8; i++) {
    const r = new V().crossVectors(g, up).normalize(), u = new V().crossVectors(r, g);
    const pred = new V().addScaledVector(r, want.x).addScaledVector(u, want.y).addScaledVector(g, -want.z).normalize();
    q.setFromUnitVectors(pred, f); g.applyQuaternion(q).normalize();
  }
  const target = P.clone().addScaledVector(g, d);
  return toOrbit({ pos: P.toArray(), target: target.toArray(), fov });
}

/* =========================================================
   Scenes
   def: { name, start, dur, pre?, post?, build(root), render(lt), orbit?(lt) }
   A scene is live from start - pre to start + dur + post (wrapping round the loop).
   A scene with orbit() owns the camera from start - pre until the next one takes over.
   ========================================================= */
const SCENES = [];
const textRoot = document.getElementById('text');
function scene(def) {
  def.pre = def.pre ?? 0; def.post = def.post ?? 0.5;
  def.root = document.createElement('div'); def.root.className = 'scene';
  textRoot.appendChild(def.root);
  if (def.build) def.build(def.root);
  if (def.group) { def.group.visible = false; WORLD.scene.add(def.group); }
  SCENES.push(def);
  return def;
}
function localTime(s, t) {
  let lt = t - s.start;
  if (lt < -s.pre) lt += DURATION;
  if (lt > s.dur + s.post) lt -= DURATION;
  return lt;
}

/* Hooks other modules use each frame */
const FRAME_START = [], FRAME_END = [];
/* For the layout check: diagram labels, and world objects labels must keep clear of (() => [{ id, rect }]) */
const LABELS = [], OBJECTS = [];

let lastOrbit = null;
function cameraOrbit(t) {
  // The camera belongs to the latest scene (by start - pre) that has begun
  let best = null, bestK = -Infinity;
  for (const s of SCENES) {
    if (!s.orbit) continue;
    let k = s.start - s.pre;
    if (k > t) k -= DURATION;
    if (k > bestK) { bestK = k; best = s; }
  }
  // Local time measured from the shot's own start, so a camera move never wraps mid-shot
  return best ? best.orbit(t - (bestK + best.pre)) : lastOrbit;
}

let FRAME_T = 0;
function renderFrame(t) {
  t = mod(t, DURATION);
  FRAME_T = t;
  FRAME_START.forEach(f => f(t));
  const o = cameraOrbit(t);
  if (o) { lastOrbit = o; WORLD.setShot(orbitShot(o)); }
  for (const s of SCENES) {
    const lt = localTime(s, t);
    const on = lt >= -s.pre && lt <= s.dur + s.post;
    setClass(s.root, 'live', on);
    if (s.group) s.group.visible = on;
    if (on && s.render) s.render(lt, t);
  }
  FRAME_END.forEach(f => f(t));
  WORLD.render(t);
  return t;
}

/* ---------- Stage fit ---------- */
const stage = document.getElementById('stage');
let K = 0;   // world backing-store scale
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `translate(-50%,-50%) scale(${s})`;
  const want = PARAMS.has('scale') ? parseFloat(PARAMS.get('scale')) : RECORD ? 1 : Math.round(clamp(s * (devicePixelRatio || 1), 1, 2) * 4) / 4;
  if (want !== K) { K = want; WORLD.resize(K); }
}

/* ---------- Clock, review controls, record mode ---------- */
function startEngine() {
  addEventListener('resize', fit);
  fit();
  if (SHOW_GRID) {
    const g = document.getElementById('gridOverlay'); g.hidden = false;
    for (let n = 1; n <= 12; n++) { const c = document.createElement('div'); c.className = 'col'; c.style.left = colX(n) + 'px'; g.appendChild(c); }
    const sa = document.createElement('div'); sa.className = 'safe'; g.appendChild(sa);
  }
  // Review: ?shot=8 plays one shot on repeat; ?from=33&to=42 repeats any stretch of the film
  const LOOP = PARAMS.has('shot')
    ? (n => [SHOT_AT[n - 1], SHOT_AT[n - 1] + SHOT_LEN[n - 1]])(clamp(parseInt(PARAMS.get('shot'), 10) || 1, 1, SHOT_LEN.length))
    : PARAMS.has('from') || PARAMS.has('to') ? [parseFloat(PARAMS.get('from')) || 0, parseFloat(PARAMS.get('to')) || DURATION] : null;
  let t = PARAMS.has('t') ? parseFloat(PARAMS.get('t')) || 0 : LOOP ? LOOP[0] : 0;

  window.seek = renderFrame;
  window.DURATION = DURATION;
  window.BUILT = BUILT;
  const ready = Promise.all([document.fonts.ready, WORLD.ready]).then(() => { renderFrame(t); return true; });
  window.__ready = ready;
  if (RECORD) return;

  let playing = true, last = 0, scrubbing = false;
  const ui = DEBUG ? setupDebug() : null;
  const shotAt = tt => { let i = 0; SHOTS.forEach(([s], k) => { if (tt >= s) i = k; }); return i; };
  const jump = d => { const i = shotAt(t); const back = d < 0 && t - SHOTS[i][0] > 1 ? 1 : 0; t = SHOTS[mod(i + d + back, SHOTS.length)][0]; };
  addEventListener('keydown', e => {
    if (!DEBUG) return;
    if (e.key === ' ') { e.preventDefault(); playing = !playing; }
    else if (e.key === 'ArrowRight') { e.preventDefault(); jump(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); jump(-1); }
  });
  let fpsN = 0, fpsT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (playing && !scrubbing) {
      const next = t + dt;
      t = LOOP && t < LOOP[1] && next >= LOOP[1] ? LOOP[0] : mod(next, DURATION);
    }
    renderFrame(t);
    if (ui) {
      fpsN++; if (now - fpsT > 500) { ui.fps(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now; }
      ui.update(t, playing);
    }
  }
  ready.then(() => requestAnimationFrame(frame));

  function setupDebug() {
    document.body.classList.add('debug');
    const $ = id => document.getElementById(id);
    $('debug').hidden = false;
    const scrub = $('dbScrub'); scrub.max = DURATION;
    scrub.addEventListener('input', () => { scrubbing = true; t = parseFloat(scrub.value); });
    scrub.addEventListener('change', () => { scrubbing = false; });
    $('dbPlay').onclick = () => { playing = !playing; };
    $('dbPrev').onclick = () => jump(-1);
    $('dbNext').onclick = () => jump(1);
    const txt = (el, s) => { if (el.__t !== s) { el.__t = s; el.textContent = s; } };
    return {
      update(tt, p) {
        if (!scrubbing) scrub.value = tt.toFixed(2);
        txt($('dbTime'), tt.toFixed(2) + 's');
        txt($('dbShot'), SHOTS[shotAt(tt)][1] + (tt > BUILT[1] ? '  (not built yet)' : ''));
        txt($('dbPlay'), p ? 'Pause' : 'Play');
      },
      fps(f) { txt($('dbFps'), f.toFixed(0) + ' fps'); },
    };
  }
}
