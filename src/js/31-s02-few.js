/* =========================================================
   Shot 2 (4 to 8s), layout A: "Few make it to production."
   Most of the points turn coral, shrink away and go out.
   A few remain, scattered and unconnected, and turn mint: live.
   (The points' timings live with them in AGENTS, shot 1.)
   ========================================================= */
const S02 = scene({
  name: SHOTS[1][1], start: shotAt(2), dur: SHOT_LEN[1],
  orbit: lt => planetDrift(shotAt(2) + lt),
  build(root) {
    this.head = textBlock(root, {
      id: 's2-head', slot: 'A', style: 'display', x: LAYOUT.A.x, top: topA('display', 2),
      lines: ['Few make it', 'to production.'],
    });
  },
  render(lt) {
    playBlock(this.head, lt, 0.0, 3.4);
  },
});
