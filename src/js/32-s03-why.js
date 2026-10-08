/* =========================================================
   Shot 3 (8 to 10s), layout A: "Why?"
   The film's one scale slam. The planet keeps turning at the opening's
   speed, the five mint survivors with it, through "Why?" and the list
   and on into the descent, with no pause or change of speed. "Why?" stays: the five reasons
   land beneath it in shot 4, and it leaves at 14.0 as they move into
   the tracker. It is set high enough for the list to fit under it.
   ========================================================= */

/** "Why?" at display size with the five reasons under it at headline size: one block, centred on layout A's optical
    centre (Why?'s cap top to the last reason's baseline), Why?'s baseline 56px above the first reason's cap */
const WHY = (() => {
  const d = TYPE.display, h = TYPE.headline, n = CHROME.tracker.words.length, GAP = 56;
  const span = d.cap + GAP + (n - 1) * h.lh + h.cap;
  const top = snap8(LAYOUT.A.opticalY - span / 2 - (d.base - d.cap));
  return { top, listTop: snap8(top + d.base + GAP - (h.base - h.cap)) };
})();

const S03 = scene({
  name: SHOTS[2][1], start: shotAt(3), dur: SHOT_LEN[2], post: 5,   // "Why?" holds over shot 4
  orbit: lt => planetDrift(shotAt(3) + lt),   // the opening's drift, unbroken
  build(root) {
    this.why = textBlock(root, { id: 's3-why', slot: 'A', style: 'display', x: LAYOUT.A.x, top: WHY.top, lines: ['Why?'] });
  },
  render(lt) {
    playBlock(this.why, lt, 0.0, CHROME.tracker.form.start - shotAt(3), 'slam');   // leaves as the reasons move into the tracker
  },
});
