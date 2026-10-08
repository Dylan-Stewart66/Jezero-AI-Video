/* =========================================================
   Shot 5 (14 to 18s), layout C: the logo reveal and the descent.
   From 13.5 the planet sinks into the lower half (as the tracker forms),
   still turning at the opening's speed: the sunk framing turns at the
   same rate, so the hand-over has no jump or change of speed. Jezero
   sits on the axis it turns about, so the crater holds its place while
   the terrain turns round it. The Jezero lockup and "The safe way to
   say yes to AI." hold above it while the camera pushes slowly in. Then the dive: one continuous
   move that zooms into the crater centre and dolly-zooms from the
   cinematic view (fov 36) to true isometric (fov 7), arriving at rest
   above the crater floor at 18.5.
   ========================================================= */
/** Where the planet sits once sunk: in the lower half, crater just below the reveal; it pushes in slowly from 15.0 */
const SINK = { px: W / 2, py: 1330, rpx: t => 680 + 10 * Math.max(0, t - shotAt(5) - 1) };
/** Isometric, crater centre at frame centre (the grid then sits in the visual zone) */
const O_ISO = isoOrbit([0, 0, 0], ISO.frameH, SITE.rotY);
const unwrapYaw = (from, to) => { while (to - from > 180) to -= 360; while (to - from < -180) to += 360; return to; };
/**
 * Zoom towards b's target: framing shrinks on a log scale, and the target closes in at the same
 * rate, so the point being approached glides smoothly to frame centre instead of leaving the frame.
 */
function zoomMix(a, b, w) {
  const frameH = Math.exp(lerp(Math.log(a.frameH), Math.log(b.frameH), w));
  const s = (frameH - b.frameH) / (a.frameH - b.frameH);
  return {
    target: b.target.map((v, i) => v + (a.target[i] - v) * s),
    yaw: lerp(a.yaw, unwrapYaw(a.yaw, b.yaw), w), pitch: lerp(a.pitch, b.pitch, w),
    frameH, fov: Math.exp(lerp(Math.log(a.fov), Math.log(b.fov), w)),
  };
}
const DIVE = { sink: [shotAt(5) - 0.5, shotAt(5) + 1], dive: [shotAt(6) - 1, shotAt(6) + 1] };
/**
 * The camera from 13.0 to 18.5. The opening's drift carries straight on: the sink only moves the planet's place and
 * size on screen, while the camera's direction from the planet keeps turning at the drift's own rate, so the planet
 * never pauses or changes speed. (Blending two separate orbits instead made the turn wobble during the sink.) Then
 * the dive.
 */
function DESCENT(t) {
  const w = ease.inOutCubic(range(t, ...DIVE.sink));
  const base = frameBody({
    center: PLANET.center, R: PLANET.R, yaw: DRIFT.yaw0 + DRIFT.yawRate * t, pitch: DRIFT.pitch, fov: DRIFT.fov,
    px: lerp(DRIFT.px, SINK.px, w), py: lerp(DRIFT.py, SINK.py, w),
    rpx: Math.exp(lerp(Math.log(DRIFT.rpx + DRIFT.push * t), Math.log(SINK.rpx(t)), w)),
  });
  return zoomMix(base, O_ISO, ease.inOutCubic(range(t, ...DIVE.dive)));
}

const S05 = scene({
  name: SHOTS[4][1], start: shotAt(5), dur: SHOT_LEN[4], pre: 1,
  orbit: lt => DESCENT(shotAt(5) + lt),
  build(root) {
    const C = LAYOUT.C;
    this.lock = lockupBlock(root, { id: 's5-lockup', slot: 'C', h: C.h, top: C.top, align: 'center' });
    this.line = textBlock(root, {
      id: 's5-line', slot: 'C.sup', style: 'tagline', align: 'center', top: C.top + C.h + C.supGap, color: COL.violetLight,
      lines: ['The safe way to say yes to AI.'],
    });
  },
  render(lt) {
    playBlock(this.lock, lt, 1.0, this.dur - 0.5);   // in once the fears have left the centre; held long
    playBlock(this.line, lt, 1.5, this.dur - 0.5);
  },
});

/* The crater floor fades in as the camera closes on it, replacing the planet's surface */
FRAME_START.push(t => {
  const on = t >= DIVE.dive[0] && t < KIT_OFF && !PARAMS.has('nokit');   // KIT_OFF: once the ascent (shot 11) has made it tiny
  KIT.group.visible = on; KIT.setLit(on);
});
FRAME_END.push(() => {
  const f = lastOrbit ? lastOrbit.frameH : 1e9;
  KIT.floorU.uA.value = KIT.group.visible ? 1 - range(Math.log(f), Math.log(45), Math.log(130)) : 0;
  // Widened after landing; narrowed back to Jezero's floor as the ascent lifts the camera, before the walls show
  const narrow = FRAME_T >= shotAt(11) ? range(Math.log(f), Math.log(11), Math.log(20)) : 0;
  KIT.floorU.uDiscR.value = lerp(KIT.FLOOR_R, 78, ease.inOutSine(range(FRAME_T, DIVE.dive[1] + 0.3, DIVE.dive[1] + 1.5)) * (1 - ease.inOutSine(narrow)));
  // As the camera lands, the floor's relief hands over from the sun to the kit's key light, so its rocks, dunes and
  // craters agree with the kit's own shadows; it happens in the last of the dive, while the ground rushes up. The
  // ground (planet and floor alike, so they never part) also settles to its isometric exposure. Both return early in
  // the ascent, before the walls show.
  const back = 1 - ease.inOutSine(range(Math.log(f), Math.log(10.5), Math.log(15)));
  const before = FRAME_T < shotAt(11);
  MARS.U.uKeyMix.value = before ? ease.inOutSine(range(FRAME_T, DIVE.dive[1] - 0.7, DIVE.dive[1] - 0.1)) : back;
  // The ground darkens a little round the platform once its trays are down, and lightens as it fades on the way up
  MARS.U.uPadAO.value = range(FRAME_T, shotAt(6) + 1, shotAt(6) + 3) * (FRAME_T < shotAt(11) ? 1 : KIT.fadeU.value);
  MARS.U.uExpo.value = lerp(1, PLANET.floorExpo, before ? ease.inOutSine(range(FRAME_T, DIVE.dive[1] - 0.2, DIVE.dive[1] + 1.3)) : back);
  // A neutral scrim under the tracker while lit terrain passes behind it, held until the ground has settled. Set here
  // rather than in the shot, which stops drawing half a second after it ends.
  requestScrim('bottom', range(FRAME_T, shotAt(5) - 0.5, shotAt(5) + 0.1) * (1 - range(FRAME_T, DIVE.dive[1] + 1.0, DIVE.dive[1] + 1.6)));
  // On the way up the platform fades out as one object, gone by the time it is switched off (KIT_OFF); its edge
  // lines go first, while it is still large
  const up = FRAME_T >= shotAt(11) && FRAME_T < shotAt(12), lf = Math.log(f);
  KIT.setFade(up ? 1 - ease.inOutSine(range(lf, Math.log(110), Math.log(ASC.kitOffFrameH))) : 1, up ? 1 - ease.inOutSine(range(lf, Math.log(35), Math.log(90))) : 1);
  // The station plan in the crater floor (jzStation): takes over as the 3D station fades on the way up, stays through the
  // orbit shots, and clears before the loop returns to the opening, when the station has not been built yet
  MARS.U.uStA.value = FRAME_T < shotAt(11) ? 0
    : (KIT.group.visible ? 1 - KIT.fadeU.value : 1) * (1 - ease.inOutSine(range(FRAME_T, DURATION - 3, DURATION - 0.5)));
});
