/* =========================================================
   Fine lines: crisp strokes of a fixed screen width along 3D polylines
   (the chart traces, the budget outline, the arcs and trajectories over
   Mars). Each curve draws itself from its first point as its progress
   runs from 0 to 1. No glow. Optionally hidden wherever the planet is in
   front of them, since the planet writes no depth.
   ========================================================= */
/**
 * o: { curves, segs, color, width?, parent?, occlude?, depthTest?, fade? (a shared { value } uniform) }
 * Returns { prog, alpha, set(k, points), commit() }: prog[k] and alpha[k] are read every frame,
 * set(k, points) takes segs + 1 points in the parent's space.
 */
function makeLines(o) {
  const { curves, segs } = o, n = curves * segs, V = n * 4;
  const A = new Float32Array(V * 3), B = new Float32Array(V * 3), C = new Float32Array(V * 2), KU = new Float32Array(V * 3);
  const idx = new Uint32Array(n * 6);
  for (let s = 0; s < n; s++) {
    const k = Math.floor(s / segs), j = s % segs;
    [[0, -1], [0, 1], [1, -1], [1, 1]].forEach((c, q) => { C.set(c, (s * 4 + q) * 2); KU.set([k, j / segs, (j + 1) / segs], (s * 4 + q) * 3); });
    const v = s * 4; idx.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], s * 6);
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  const aA = new THREE.BufferAttribute(A, 3), aB = new THREE.BufferAttribute(B, 3);
  g.setAttribute('position', aA); g.setAttribute('aA', aA); g.setAttribute('aB', aB);
  g.setAttribute('aC', new THREE.BufferAttribute(C, 2)); g.setAttribute('aKU', new THREE.BufferAttribute(KU, 3));
  const prog = new Float32Array(curves), alpha = new Float32Array(curves);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uRes: { value: new THREE.Vector2(W, H) }, uW: { value: o.width ?? 1.5 }, uK: WORLD.U.uK, uCol: { value: linVec(o.color) },
      uProg: { value: prog }, uAlpha: { value: alpha }, uPC: { value: MARS.C }, uPR: { value: MARS.R }, uOcc: { value: o.occlude ? 1 : 0 },
      uFade: o.fade ?? { value: 1 },
    },
    transparent: true, depthTest: o.depthTest ?? true, depthWrite: false, side: THREE.DoubleSide,   // the quads wind clockwise
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: `#define NC ${curves}
      uniform vec2 uRes; uniform float uW, uK, uProg[NC], uAlpha[NC], uPR, uOcc; uniform vec3 uPC;
      attribute vec3 aA, aB, aKU; attribute vec2 aC;
      varying float vA;
      vec4 clipOf(vec3 p){ vec4 v = modelViewMatrix * vec4(p, 1.); v.xyz *= .9997; return projectionMatrix * v; }
      // 1 where the planet stands between the camera and this point
      float behindPlanet(vec3 p){
        vec3 wp = (modelMatrix * vec4(p, 1.)).xyz, d = wp - cameraPosition; float L = length(d); d /= L;
        vec3 oc = cameraPosition - uPC; float b = dot(oc, d), h = b * b - dot(oc, oc) + uPR * uPR;
        if (h < 0.) return 0.;
        float t0 = -b - sqrt(h);
        return t0 > 0. && t0 < L - .6 ? 1. : 0.;
      }
      void main(){
        int k = int(aKU.x + .5);
        float f = clamp((uProg[k] - aKU.y) / (aKU.z - aKU.y), 0., 1.);   // how much of this segment is drawn
        vec3 Bp = mix(aA, aB, f);
        vec4 a = clipOf(aA), b = clipOf(Bp);
        vec2 res = uRes * uK;
        vec2 sa = a.xy / a.w * res * .5, sb = b.xy / b.w * res * .5;
        vec2 dir = sb - sa; float len = length(dir); dir = len > 1e-4 ? dir / len : vec2(1., 0.);
        vec2 nrm = vec2(-dir.y, dir.x);
        vec4 p = mix(a, b, aC.x);
        p.xy += (nrm * aC.y + dir * (aC.x * 2. - 1.)) * uW * uK * .5 / (res * .5) * p.w;
        vA = uAlpha[k] * (uOcc > .5 ? 1. - behindPlanet(mix(aA, Bp, aC.x)) : 1.);
        gl_Position = len > 1e-4 && f > 0. && vA > 0. ? p : vec4(2., 2., 2., 1.);
      }`,
    fragmentShader: `uniform vec3 uCol; uniform float uFade; varying float vA;
      void main(){ float a = vA * uFade; if (a <= .001) discard; gl_FragColor = vec4(uCol * a, a); }`,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false; mesh.renderOrder = 6;
  (o.parent ?? WORLD.scene).add(mesh);
  let dirty = false;
  return {
    mesh, prog, alpha,
    set(k, pts) {
      for (let j = 0; j < segs; j++) {
        const a = pts[j], b = pts[j + 1];
        for (let q = 0; q < 4; q++) { const v = ((k * segs + j) * 4 + q) * 3; A[v] = a[0]; A[v + 1] = a[1]; A[v + 2] = a[2]; B[v] = b[0]; B[v + 1] = b[1]; B[v + 2] = b[2]; }
      }
      dirty = true;
    },
    commit() { if (dirty) { aA.needsUpdate = true; aB.needsUpdate = true; dirty = false; } },
  };
}
