/* =========================================================
   The isometric kit: one precise set of parts for every shot inside
   the crater. Primitives only (walled trays, plates, slabs, square
   columns, floor tracks, small cubes), all on one grid unit.

   Look: every face takes one of three exact tones from one key light
   (top lightest, left middle, right darkest). Matte, no metalness, no
   emissive. One light casts soft, tight contact shadows. Every object
   has a 1.5px screen-space edge, one tone lighter than its top face.

   The site is built in its own frame and turned so the isometric
   camera looks at it from yaw 45 in site space (135 in the world),
   which is the side the descent arrives from. Jezero's crater centre
   is the site origin and sits at the world origin.
   ========================================================= */
const G = 0.125;                         // the grid unit
const PITCH = 10 * G;                    // trays sit on a 10g pitch
const SITE = {
  rotY: 90,                              // site frame to world: turn about +Y (degrees)
  cols: 8, rows: [0, 1, 3, 4, 6, 7], lanes: [2, 5, 8],
  origin: null,                          // grid corner in site space, set below
};
/** Centre of the tray at column c, row r (site space); lanes are rows with no trays */
const siteX = c => SITE.origin.x + c * PITCH + 4 * G;
const siteZ = r => SITE.origin.z + r * PITCH + 4 * G;

/* ---------- Light: one key and an ambient, set so faces land on exact tones ---------- */
const KIT_LIGHT = { a: 0.32, k: 0.85, dir: V3(-0.2, 1, 0.55).normalize() };   // dir is in site space
const TONE_RATIO = { top: 1, left: 0.54, right: 0.25 };
const faceFactor = n => {
  const L = KIT_LIGHT, ndl = Math.max(0, n.dot(L.dir));
  if (n.y > 0.5) return TONE_RATIO.top / (L.a + L.k * ndl);
  if (n.z > 0.5) return TONE_RATIO.left / (L.a + L.k * ndl);
  return TONE_RATIO.right / (L.a + L.k * ndl);
};

const KIT = (() => {
  const group = new THREE.Group();
  group.rotation.y = SITE.rotY * DEG;
  group.visible = false;
  WORLD.scene.add(group);
  const toWorld = v => v.clone().applyAxisAngle(V3(0, 1, 0), SITE.rotY * DEG);

  /* Lights. Three's Lambert divides by pi, so intensities carry pi. */
  const amb = new THREE.AmbientLight(0xffffff, Math.PI * KIT_LIGHT.a);
  const key = new THREE.DirectionalLight(0xffffff, Math.PI * KIT_LIGHT.k);
  key.position.copy(toWorld(KIT_LIGHT.dir).multiplyScalar(60));
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 140 });
  const SHADOW = PARAMS.has("scale") && parseFloat(PARAMS.get("scale")) >= 2 ? 4096 : 2048;   // full size for the 2x export
  key.shadow.mapSize.set(SHADOW, SHADOW);
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.015; key.shadow.radius = 3;
  WORLD.scene.add(amb, key, key.target);
  WORLD.renderer.shadowMap.enabled = true;
  WORLD.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const lights = [amb, key];
  const setLit = on => lights.forEach(l => { l.visible = on; });

  /* ---------- Geometry: boxes merged, coloured per face by orientation ---------- */
  function boxes(list) {
    const parts = list.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z).toNonIndexed());
    const pos = [], nor = [], col = [];
    const n = new THREE.Vector3();
    parts.forEach(g => {
      const P = g.attributes.position.array, N = g.attributes.normal.array;
      for (let i = 0; i < P.length; i += 3) {
        pos.push(P[i], P[i + 1], P[i + 2]); nor.push(N[i], N[i + 1], N[i + 2]);
        const f = faceFactor(n.set(N[i], N[i + 1], N[i + 2])); col.push(f, f, f);
      }
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return out;
  }
  /** Edge segments of an axis-aligned box: [x0,y0,z0, x1,y1,z1, ...] */
  function boxEdges(w, h, d, x = 0, y = 0, z = 0) {
    const X = [x - w / 2, x + w / 2], Y = [y - h / 2, y + h / 2], Z = [z - d / 2, z + d / 2], e = [];
    for (const a of Y) for (const b of Z) e.push(X[0], a, b, X[1], a, b);
    for (const a of X) for (const b of Z) e.push(a, Y[0], b, a, Y[1], b);
    for (const a of X) for (const b of Y) e.push(a, b, Z[0], a, b, Z[1]);
    return e;
  }

  /* Tray: four walls 3g tall (the shell) round a floor plate 1g thick (coloured on its own) */
  const TW = 8 * G, TH = 3 * G, WT = 0.1, FL = 1 * G;
  const trayShell = boxes([
    [TW, TH, WT, 0, TH / 2, TW / 2 - WT / 2], [TW, TH, WT, 0, TH / 2, -TW / 2 + WT / 2],
    [WT, TH, TW - 2 * WT, TW / 2 - WT / 2, TH / 2, 0], [WT, TH, TW - 2 * WT, -TW / 2 + WT / 2, TH / 2, 0],
  ]);
  const trayFloor = boxes([[TW - 2 * WT, FL, TW - 2 * WT, 0, FL / 2, 0]]);
  const trayEdges = (() => {
    const o = TW / 2, i = TW / 2 - WT, e = [];
    const sq = (r, y) => [[-r, y, -r, r, y, -r], [r, y, -r, r, y, r], [r, y, r, -r, y, r], [-r, y, r, -r, y, -r]].forEach(s => e.push(...s));
    sq(o, TH); sq(i, TH); sq(o, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { e.push(sx * o, 0, sz * o, sx * o, TH, sz * o); e.push(sx * i, FL, sz * i, sx * i, TH, sz * i); }
    sq(i, FL);
    return e;
  })();

  /* ---------- Materials ---------- */
  // The whole kit can fade out as one object (setFade), so the ascent never pops it off
  const fadeU = { value: 1 }, edgeFadeU = { value: 1 }, fadeMats = [];
  // Flagged transparent from the start (three compiles opaque materials to ignore opacity); at opacity 1 they draw
  // exactly as opaque ones, depth-tested and depth-writing, and the edges (renderOrder 5) still follow them
  const mat = () => { const m = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: true }); fadeMats.push(m); return m; };

  /* ---------- Screen-space edges, instanced alongside their meshes ---------- */
  const EDGE_W = 1.5;
  const edgeMat = new THREE.ShaderMaterial({
    uniforms: { uRes: { value: new THREE.Vector2(W, H) }, uW: { value: EDGE_W }, uK: WORLD.U.uK, uFade: edgeFadeU },
    // Double-sided: each edge quad winds clockwise on screen, so front-face culling dropped every edge
    transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `uniform vec2 uRes; uniform float uW, uK;
      attribute vec3 aA, aB; attribute vec2 aC; attribute mat4 aInst; attribute vec3 aEdge;
      varying vec3 vC;
      vec4 clipOf(vec3 p){ vec4 v = modelViewMatrix * aInst * vec4(p, 1.); v.xyz *= .9997; return projectionMatrix * v; }
      void main(){
        vec4 a = clipOf(aA), b = clipOf(aB);
        vec2 res = uRes * uK;
        vec2 sa = a.xy / a.w * res * .5, sb = b.xy / b.w * res * .5;
        vec2 dir = sb - sa; float len = length(dir); dir = len > 1e-4 ? dir / len : vec2(1., 0.);
        vec2 nrm = vec2(-dir.y, dir.x);
        vec4 p = mix(a, b, aC.x);
        vec2 off = (nrm * aC.y + dir * (aC.x * 2. - 1.)) * uW * uK * .5;
        p.xy += off / (res * .5) * p.w;
        vC = aEdge;
        gl_Position = len > 1e-4 ? p : vec4(2., 2., 2., 1.);
      }`,
    fragmentShader: `uniform float uFade; varying vec3 vC; void main(){ gl_FragColor = vec4(vC, uFade); }`,
  });
  function edgesFor(segs, inst, edgeColAttr, count) {
    const n = segs.length / 6, A = new Float32Array(n * 12), B = new Float32Array(n * 12), C = new Float32Array(n * 8), idx = [];
    for (let s = 0; s < n; s++) {
      const a = segs.slice(s * 6, s * 6 + 3), b = segs.slice(s * 6 + 3, s * 6 + 6);
      [[0, -1], [0, 1], [1, -1], [1, 1]].forEach((c, j) => { A.set(a, (s * 4 + j) * 3); B.set(b, (s * 4 + j) * 3); C.set(c, (s * 4 + j) * 2); });
      const o = s * 4; idx.push(o, o + 1, o + 2, o + 2, o + 1, o + 3);
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setIndex(idx);
    g.setAttribute('aA', new THREE.Float32BufferAttribute(A, 3));
    g.setAttribute('aB', new THREE.Float32BufferAttribute(B, 3));
    g.setAttribute('aC', new THREE.Float32BufferAttribute(C, 2));
    g.setAttribute('position', new THREE.Float32BufferAttribute(A, 3));
    g.setAttribute('aInst', inst);
    g.setAttribute('aEdge', edgeColAttr);
    g.instanceCount = count;
    const m = new THREE.Mesh(g, edgeMat); m.frustumCulled = false; m.renderOrder = 5;
    return m;
  }

  /**
   * A set of identical parts: an instanced mesh, its edges, per-instance top colour and edge colour.
   * set(i, x, y, z, sx, sy, sz, topHex, edgeHex) places part i in site space.
   */
  function parts(geo, segs, count, o = {}) {
    const mesh = new THREE.InstancedMesh(geo, mat(), count);
    mesh.castShadow = o.cast ?? true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    const edgeCol = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    group.add(mesh);
    const edges = segs ? edgesFor(segs, mesh.instanceMatrix, edgeCol, count) : null;
    if (edges) { edges.visible = !PARAMS.has('noedges'); group.add(edges); }   // ?noedges: review aid, the kit without its edge lines
    const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _c = new THREE.Color();
    return {
      mesh, edges, count,
      set(i, x, y, z, sx = 1, sy = 1, sz = 1, top = COL.plat[3], edge = COL.plat[4]) {
        const tiny = sx * sy * sz < 1e-6;
        _s.set(tiny ? 0 : sx, tiny ? 0 : sy, tiny ? 0 : sz);
        mesh.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q, _s));
        mesh.setColorAt(i, _c.set(top));
        _c.set(edge); edgeCol.setXYZ(i, _c.r, _c.g, _c.b);
      },
      setColor(i, top, edge) { mesh.setColorAt(i, _c.set(top)); if (edge) { _c.set(edge); edgeCol.setXYZ(i, _c.r, _c.g, _c.b); } },
      commit() { mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; edgeCol.needsUpdate = true; },
    };
  }
  /**
   * Flat, unlit rectangles facing site +z, for chart marks on the monitoring screens: exact colours, no shading, no
   * edges. set(i, x, y, z, w, h, hex) places rectangle i by its bottom-centre in site space; fades with the kit.
   */
  function flats(count) {
    const m = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: true, toneMapped: false });
    fadeMats.push(m);
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), m, count);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    mesh.frustumCulled = false; mesh.renderOrder = 4;
    group.add(mesh);
    const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _c = new THREE.Color();
    return {
      mesh,
      set(i, x, y, z, w, h, hex) {
        const off = w * h < 1e-8;
        mesh.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q, _s.set(off ? 0 : w, off ? 0 : h, 1)));
        mesh.setColorAt(i, _c.set(hex));
      },
      commit() { mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; },
    };
  }
  const box = (w, h, d) => boxes([[w, h, d, 0, h / 2, 0]]);
  const boxSegs = (w, h, d) => boxEdges(w, h, d, 0, h / 2, 0);

  /* ---------- The crater floor: Jezero's own floor, as terrain ---------- */
  // Shaded with the planet's own code and textures (MARS_SHADE_GLSL): the same regolith, dunes, craters and rocks as
  // the crater floor seen in the descent, so the camera lands on the same ground. The disc follows the sphere, so it
  // lies exactly on the planet's surface and the hand-over has no parallax. Past the floor's edge the floor carries on
  // outward, so a wider isometric frame never shows the crater walls. Once landed the floor's relief is lit by the
  // kit's key light (MARS.U.uKeyMix).
  const floorU = { uA: MARS.U.uDiscA, uDiscR: MARS.U.uDiscR };   // shared with the planet, which skips what the disc hides
  ['uSurf', 'uToLocal', 'uToWorld', 'uC', 'uSun', 'uKey', 'uR', 'uT', 'uNight', 'uExpo', 'uKeyMix', 'uPixAng', 'uJz', 'uJzE', 'uJzN', 'uJzR', 'uPad', 'uPadAO', 'uStA', 'uStBox', 'uStCol', 'uStOut']
    .forEach(k => { floorU[k] = MARS.U[k]; });
  MARS.U.uKey.value.copy(toWorld(KIT_LIGHT.dir)).normalize();
  const FLOOR_R = PLANET.R * Math.sin(PLANET.jezero.radiusDeg * DEG) * PLANET.jezero.floor;   // Jezero's flat floor
  // Jezero's flat floor during the descent; once the camera has landed it widens to cover wider isometric shots
  floorU.uDiscR.value = FLOOR_R;
  const discGeo = new THREE.RingGeometry(0, 80, 192, 96).rotateX(-Math.PI / 2);
  { const P = discGeo.attributes.position, R = PLANET.R;
    for (let i = 0; i < P.count; i++) { const r2 = P.getX(i) ** 2 + P.getZ(i) ** 2; P.setY(i, Math.sqrt(R * R - r2) - R); } }
  const floor = new THREE.Mesh(discGeo, new THREE.ShaderMaterial({
    uniforms: floorU, transparent: false, depthWrite: true,   // first pass, after the planet and before the kit
    vertexShader: `varying vec2 vP; varying vec3 vW;
      void main(){ vP = position.xz; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: GLSL_COMMON + MARS_SHADE_GLSL + `uniform float uA, uDiscR; varying vec2 vP; varying vec3 vW;
      void main(){
        vec3 N = normalize(vW - uC), d = normalize(vW - cameraPosition);
        float ndv = max(dot(N, -d), 0.);
        float fw = -dot(cameraPosition - uC, d) * uPixAng / sqrt(max(ndv, .05));   // the footprint, as the planet pass reckons it
        float jAlb, jShade, jIn; vec3 Nb, L; vec4 deco;
        jzGround(N, N, fw, true, jAlb, Nb, L, jShade, jIn, deco);
        vec3 col = marsLight(mix(marsAlbedo(uToLocal * N, JZ_LOD) * jAlb, deco.rgb, deco.a), N, Nb, ndv, L, jShade);
        float a = uA * (1. - smoothstep(uDiscR - 3., uDiscR, length(vP)));
        gl_FragColor = vec4(col * a, a);
      }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  }));
  floor.renderOrder = -2;
  group.add(floor);
  const shadowCatch = new THREE.Mesh(new THREE.CircleGeometry(30, 96).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.6, depthWrite: false }));
  shadowCatch.position.y = 0.002; shadowCatch.receiveShadow = true; shadowCatch.renderOrder = -1;
  group.add(shadowCatch);

  /**
   * Fade the parts and shadows (a) and the edge lines (e); 1 is the normal, opaque state. Edges keep their
   * screen width at any distance, so on a distant platform hundreds overlap and their alpha piles up:
   * they have to go first, while the platform is still large.
   */
  function setFade(a, e = a) {
    edgeFadeU.value = Math.min(a, e);
    if (a === fadeU.value) return;
    fadeU.value = a;
    fadeMats.forEach(m => { m.opacity = a; });
    shadowCatch.material.opacity = 0.6 * a;
  }

  /** Site point to world */
  const worldOf = (x, y, z) => toWorld(V3(x, y, z)).toArray();
  return { group, FLOOR_R, parts, flats, box, boxSegs, boxes, boxEdges, trayShell, trayFloor, trayEdges, floorU, floor, setLit, setFade, fadeU, worldOf, TW, TH, FL };
})();

/* ---------- Isometric framing ---------- */
// In site space the camera looks from yaw 45, so a ground offset along SCR_R moves a point right on screen
// and one along SCR_F (towards the camera) moves it down, foreshortened by sin(pitch).
const SCR_R = V3(Math.SQRT1_2, 0, -Math.SQRT1_2), SCR_F = V3(Math.SQRT1_2, 0, Math.SQRT1_2);
/** Site-space ground offset that puts a point `px` stage pixels from the frame centre, at a given frameH */
function isoOffset(px, py, frameH) {
  const s = (H / 2) / frameH;
  return SCR_R.clone().multiplyScalar((px - W / 2) / s).addScaledVector(SCR_F, (py - H / 2) / s / Math.sin(ISO_PITCH * DEG));
}
/** The isometric orbit that shows site point p (on the ground) at stage pixel (px, py) */
function isoShot(p, px, py, frameH) {
  const t = p.clone().sub(isoOffset(px, py, frameH));
  return isoOrbit(KIT.worldOf(t.x, 0, t.z), frameH, SITE.rotY);
}

/**
 * The isometric orbit that fits site points [x, y, z] (y up) exactly into the stage box [x0, y0, x1, y1]: as large as
 * the box allows, centred in it. The isometric camera is near-orthographic, so the fit is linear.
 */
function isoFit(points, box) {
  const sp = Math.sin(ISO_PITCH * DEG), cp = Math.cos(ISO_PITCH * DEG);
  const u = p => (p[0] - p[2]) * Math.SQRT1_2, v = p => (p[0] + p[2]) * Math.SQRT1_2 * sp - p[1] * cp;
  const us = points.map(u), vs = points.map(v);
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const s = Math.min((box[2] - box[0]) / (u1 - u0), (box[3] - box[1]) / (v1 - v0));
  const ut = (u0 + u1) / 2 - ((box[0] + box[2]) / 2 - W / 2) / s, vt = (v0 + v1) / 2 - ((box[1] + box[3]) / 2 - H / 2) / s;
  const a = ut / Math.SQRT1_2, b = vt / (Math.SQRT1_2 * sp);       // x - z and x + z of the target on the ground
  return isoOrbit(KIT.worldOf((a + b) / 2, 0, (b - a) / 2), (H / 2) / s, SITE.rotY);
}

/* ---------- Where the site sits in the crater ---------- */
// The descent zooms into the crater centre (site origin), which ends at frame centre; the grid then sits
// centred in the visual zone (columns 7 to 12).
const ISO = { frameH: 9.8, grid: [1386, 508] };
SITE.gridSize = V3((SITE.cols - 1) * PITCH + 8 * G, 0, 7 * PITCH + 8 * G);
SITE.origin = isoOffset(ISO.grid[0], ISO.grid[1], ISO.frameH).addScaledVector(SITE.gridSize, -0.5);
SITE.centre = SITE.origin.clone().addScaledVector(SITE.gridSize, 0.5);
// The levelled pad the grid sits on, cut into the crater floor (world x, z: centre and half size), a little wider than the grid
{
  const m = 0.7, a = KIT.worldOf(SITE.origin.x - m, 0, SITE.origin.z - m), b = KIT.worldOf(SITE.origin.x + SITE.gridSize.x + m, 0, SITE.origin.z + SITE.gridSize.z + m);
  MARS.U.uPad.value.set((a[0] + b[0]) / 2, (a[2] + b[2]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(b[2] - a[2]) / 2);
}
