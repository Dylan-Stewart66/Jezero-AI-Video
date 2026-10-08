/* =========================================================
   Shot 12 (61.5 to 71s), layout B: "No software licence." then "Four
   ways in." then the four options, one every second, each with a line
   of detail in the secondary colour.
   The camera orbits gently, bringing Jezero towards the middle of the
   disc as four trajectories arrive in it, each in its own colour
   (COL.ways), the same colour as its option's number. Each one lands
   in the crater at the moment its option appears. They are rebuilt
   every frame from fixed points on screen, so however the camera
   turns they stay wholly inside the frame and clear of the text column.
   ========================================================= */
const WAYS = [
  ['Accelerate', 'Our proven patterns, in your AWS estate.'],
  ['Build and Own', 'We build it in your accounts. You own it.'],
  ['Managed Service', 'We run it for you.'],
  ['Migrate and Transform', 'Move your existing platform onto Jezero.'],
];

const TRAJ = (() => {
  const s12 = shotAt(12), SEG = 48, DRAW = 1.1, C = MARS.C, R = MARS.R;
  const J = V3(0, 0.4, 0);                                   // Jezero's floor
  const arrive = WAYS.map((_, k) => s12 + 1.5 + k);          // with each option of the list
  // Where each starts, in stage pixels: across the open space above the planet, inside the frame, right of the text
  const START = [[1012, 150], [1250, 76], [1640, 76], [1868, 196]];
  const lines = COL.ways.map(c => makeLines({ curves: 1, segs: SEG, color: c, width: 2, occlude: true, depthTest: false }));
  const FADE = [shotAt(13) - 0.5, shotAt(13)];
  const pts = Array.from({ length: SEG + 1 }, () => [0, 0, 0]);
  FRAME_START.push(t => {
    const keep = 1 - ease.inOutSine(range(t, ...FADE));
    const live = arrive.some(a => t > a - DRAW) && t < FADE[1];
    if (live) {
      // The camera this frame, and Jezero's place on screen and depth
      const o = POST(t), sh = orbitShot(o), cam = V3(...sh.pos), f = V3(...sh.target).sub(cam).normalize();
      const r = V3(0, 0, 0).crossVectors(f, V3(0, 1, 0)).normalize(), u = V3(0, 0, 0).crossVectors(r, f);
      const tanV = Math.tan(o.fov * DEG / 2), q = J.clone().sub(cam), dJ = q.dot(f);
      const jx = W / 2 + q.dot(r) / (dJ * tanV) * (H / 2), jy = H / 2 - q.dot(u) / (dJ * tanV) * (H / 2);
      const toWorld = (px, py, d) => cam.clone().addScaledVector(f, d)
        .addScaledVector(r, (px - W / 2) / (H / 2) * tanV * d).addScaledVector(u, (H / 2 - py) / (H / 2) * tanV * d);
      START.forEach(([sx, sy], k) => {
        // A curve on screen from its start into the crater, the last stretch coming down into it from above; in depth it
        // runs from well in front of the planet to the crater floor, so it is never hidden behind the surface
        const dist = Math.hypot(jx - sx, jy - sy);
        const p2 = [jx, Math.max(60, jy - 0.45 * dist)], p1 = [lerp(sx, p2[0], 0.45), lerp(sy, p2[1], 0.2)];
        for (let j = 0; j <= SEG; j++) {
          const s = j / SEG, m = 1 - s;
          const x = m * m * m * sx + 3 * m * m * s * p1[0] + 3 * m * s * s * p2[0] + s * s * s * jx;
          const y = m * m * m * sy + 3 * m * m * s * p1[1] + 3 * m * s * s * p2[1] + s * s * s * jy;
          const P = toWorld(x, y, dJ - 0.55 * R * Math.pow(m, 1.5)), a = pts[j];
          a[0] = P.x; a[1] = P.y; a[2] = P.z;
        }
        lines[k].set(0, pts);
        lines[k].commit();
      });
    }
    arrive.forEach((a, k) => { const p = ease.inOutCubic(range(t, a - DRAW, a)); lines[k].prog[0] = p; lines[k].alpha[0] = live && p > 0 ? keep : 0; });
  });
  return { arrive, START };
})();

const S12 = scene({
  name: SHOTS[11][1], start: shotAt(12), dur: SHOT_LEN[11],
  orbit: lt => POST(shotAt(12) + lt),
  build(root) {
    this.text = answerBlock(root, { id: 's12', tint: COL.ink, head: ['No software licence.'], sup: ['Four ways in.'] });
    // Each option: its number in its trajectory's colour and its name, then a line of detail in the secondary colour,
    // set under the name
    const top0 = stackB(1, 1).figTop, PITCH = 2 * TYPE.label.lh + 4 + 28;   // 28px between options
    this.items = WAYS.map(([name, detail], k) => textBlock(root, {
      id: 's12-way-' + k, slot: 'B.fig' + k, style: 'label', x: LAYOUT.B.x, top: top0 + k * PITCH, gap: 4,
      lines: [[['0' + (k + 1) + ' ', COL.ways[k]], [name, null]], [['   ' + detail, COL.muted]]],
    }));
  },
  render(lt) {
    const out = this.dur - 0.5;
    this.text.play(lt, 0.5, out);
    this.items.forEach((b, k) => playBlock(b, lt, TRAJ.arrive[k] - shotAt(12), out));   // as its trajectory lands
  },
});
