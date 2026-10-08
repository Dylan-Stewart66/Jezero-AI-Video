/* =========================================================
   Hooks for check-layout.mjs: what text is on screen this frame,
   where it is, and what the rendered world looks like behind it.
   ========================================================= */

function stageRect(el) {
  const o = stage.getBoundingClientRect(), sc = o.width / W, r = el.getBoundingClientRect();
  return { x: (r.left - o.left) / sc, y: (r.top - o.top) / sc, w: r.width / sc, h: r.height / sc };
}
function colourLums(el) {
  const out = new Set([getComputedStyle(el).color]);
  el.querySelectorAll('span').forEach(s => out.add(getComputedStyle(s).color));
  return [...out].map(c => { const m = c.match(/[\d.]+/g).map(Number); return 0.2126 * toLin(m[0] / 255) + 0.7152 * toLin(m[1] / 255) + 0.0722 * toLin(m[2] / 255); });
}
window.__layout = () => {
  const live = b => b.el.classList.contains('on') && b.el.closest('.scene')?.classList.contains('live');
  const blocks = TEXT_BLOCKS.filter(live).filter(b => b.vis > 0.01).map(b => ({
    id: b.o.id, slot: b.o.slot, role: b.o.role || 'text', vis: b.vis,
    lum: Math.min(...colourLums(b.el)),
    lines: b.lines.map(sp => Object.assign(stageRect(sp), { group: sp.dataset.group || null })),
  }));
  const vis = el => (el.__vis ?? 1) * parseFloat(el.style.opacity || '1');
  const chrome = CHROME_ITEMS.filter(el => vis(el) > 0.01 && el.offsetParent !== null)
    .map(el => ({ id: el.dataset.id, rect: Object.assign(stageRect(el), { group: el.dataset.group || null }), vis: vis(el), text: !!el.dataset.text, lum: el.dataset.text ? Math.min(...colourLums(el)) : null }));
  const labels = LABELS.filter(l => l.vis > 0.01 && l.b.el.closest('.scene')?.classList.contains('live')).map(l => ({ id: l.id, rect: stageRect(l.textEl), vis: l.vis }));
  const objects = OBJECTS.flatMap(f => f());
  return { t: FRAME_T, blocks, chrome, labels, objects };
};
/** Background luminance behind a stage rect, from the rendered canvas: 95th percentile and max */
window.__bgLum = (x, y, w, h) => {
  const { buf } = WORLD.readRect(x, y, w, h);
  const L = [];
  for (let i = 0; i < buf.length; i += 4) L.push(0.2126 * toLin(buf[i] / 255) + 0.7152 * toLin(buf[i + 1] / 255) + 0.0722 * toLin(buf[i + 2] / 255));
  L.sort((a, b) => a - b);
  return { p95: L[Math.floor(L.length * 0.95)] ?? 0, max: L[L.length - 1] ?? 0 };
};
/** Review aid: where the planet sits on screen at time t */
window.__planetAt = t => {
  window.seek(t);
  const c = WORLD.project(MARS.C.toArray());
  const cam = WORLD.camera, C = MARS.C;
  const toCam = cam.position.clone().sub(C).normalize();
  const side = new THREE.Vector3().crossVectors(toCam, cam.up).normalize();
  const top = C.clone().add(new THREE.Vector3().crossVectors(side, toCam).normalize().multiplyScalar(MARS.R));
  const p = WORLD.project(top.toArray());
  return { cx: +c.x.toFixed(1), cy: +c.y.toFixed(1), rTop: +(c.y - p.y).toFixed(1), dist: +cam.position.distanceTo(C).toFixed(1) };
};
/** Review aid: where the kit is */
window.__kitAt = t => {
  window.seek(t);
  const p = (x, y, z) => { const q = WORLD.project(KIT.worldOf(x, y, z)); return [+q.x.toFixed(0), +q.y.toFixed(0)]; };
  const m = TRAYS.shells.mesh, mm = new THREE.Matrix4(); m.getMatrixAt(0, mm);
  return { origin: SITE.origin.toArray().map(v => +v.toFixed(2)), centre: p(SITE.centre.x, 0, SITE.centre.z), tray0: p(siteX(0), 0, siteZ(0)),
    vis: KIT.group.visible, count: m.count, m0: mm.elements.map(v => +v.toFixed(2)), orbit: lastOrbit, lights: [KIT.group.visible] };
};
if (RECORD) window.__dbg = { KIT, TRAYS, WORLD, THREE, MARS, PLANET, SUN, DRIFT, AGENTS, planetDrift, frameBody, orbitShot, toOrbit, KIT_OFF, ASCENT, PROD,
  SITE, GATE, SCAN, STATION, MONITOR, COST, TRAJ, PROD, ASCENT, PLATFORM_SHOT, GATE_SHOT, VIS_SHOT, COST_SHOT, siteX, siteZ, isoShot, shotAt, POST, G, PITCH, LABEL_SLOTS };
