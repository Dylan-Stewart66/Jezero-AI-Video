/* =========================================================
   World layer: one Three.js scene and one camera for the whole loop.
   Never contains text. Rendered with 4x MSAA into a linear target,
   then composited: neutral scrims, a very gentle vignette and the
   sRGB encode. No bloom, glow, grain or coloured gradients.
   ========================================================= */
const V3 = (a, b, c) => new THREE.Vector3(a, b, c);
const GLSL_COMMON = `
#define PI 3.14159265359
#define TAU 6.28318530718
vec3 hash3(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float gnoise(vec3 p){
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * f * (f * (f * 6. - 15.) + 10.);
  #define GN(o) dot(hash3(i + o) * 2. - 1., f - o)
  return mix(mix(mix(GN(vec3(0,0,0)), GN(vec3(1,0,0)), u.x), mix(GN(vec3(0,1,0)), GN(vec3(1,1,0)), u.x), u.y),
             mix(mix(GN(vec3(0,0,1)), GN(vec3(1,0,1)), u.x), mix(GN(vec3(0,1,1)), GN(vec3(1,1,1)), u.x), u.y), u.z);
}
vec3 srgbToLinear(vec3 c){ return mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c)); }
`;

const WORLD = (() => {
  const canvas = document.getElementById('world');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: RECORD });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // the composite pass encodes sRGB itself
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(new THREE.Color(COL.space), 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, W / H, 0.5, 40000);

  /** Shared uniforms: time, render scale, radians per backing-store pixel */
  const U = { uT: { value: 0 }, uK: { value: 1 }, uPixAng: { value: 0.001 } };

  /* ---------- Stars: fine, sharp points at infinity. No halos, no twinkle. ---------- */
  {
    const N = 2600, dir = new Float32Array(N * 3), att = new Float32Array(N * 2), r = rng(7);
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1, th = r() * TAU, s = Math.sqrt(1 - u * u);
      dir.set([Math.cos(th) * s, u, Math.sin(th) * s], i * 3);
      const big = r() > 0.93;
      att.set([big ? 2.1 : 1.35, (big ? 0.55 : 0.18) + r() * 0.45], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(dir, 3));
    g.setAttribute('aSB', new THREE.BufferAttribute(att, 2));
    const m = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uK: U.uK, uCol: { value: linVec(COL.ink) } },
      transparent: false, depthTest: false, depthWrite: false,   // background: first pass, before the kit
      vertexShader: `uniform float uK; attribute vec2 aSB; varying float vB; varying float vS;
        void main(){ vec3 wp = cameraPosition + position * 20000.;
          gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
          vS = aSB.x * uK; vB = aSB.y; gl_PointSize = vS + 1.; }`,
      fragmentShader: `uniform vec3 uCol; varying float vB; varying float vS;
        void main(){ float d = length(gl_PointCoord - .5) * (vS + 1.);
          float a = clamp(vS * .5 - d + .5, 0., 1.) * vB; if (a <= 0.) discard;
          gl_FragColor = vec4(uCol * a, a); }`,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    }));
    m.frustumCulled = false; m.renderOrder = -10;
    scene.add(m);
  }

  /* ---------- Composite ---------- */
  const post = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const SCRIM = { bottom: 0, left: 0 };
  const comp = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { uScene: { value: null }, uRes: { value: new THREE.Vector2(W, H) }, uScrimB: { value: 0 }, uScrimL: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform sampler2D uScene; uniform vec2 uRes; uniform float uScrimB, uScrimL; varying vec2 vUv;
      float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      vec3 enc(vec3 c){ c = clamp(c, 0., 1.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
      void main(){
        vec3 c = texture2D(uScene, vUv).rgb;
        vec2 px = vec2(vUv.x * ${W}., (1. - vUv.y) * ${H}.);
        // Neutral black scrims behind text, only when the world must pass behind it
        c *= 1. - uScrimB * .93 * smoothstep(840., 985., px.y);
        c *= 1. - uScrimL * .80 * smoothstep(1180., 300., px.x);
        // A very gentle vignette
        vec2 q = (vUv - .5) * 2.; float r = length(q * vec2(1., .82)) / 1.28;
        c *= 1. - .14 * smoothstep(.45, 1., r);
        vec3 o = enc(c);
        o += (h12(gl_FragCoord.xy) - .5) / 255.;     // sub-LSB dither against banding (invisible, static)
        gl_FragColor = vec4(o, 1.);
      }`,
  });
  post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), comp));

  let rt = null, RW = W, RH = H;
  function resize(k) {
    RW = Math.round(W * k); RH = Math.round(H * k);
    renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    rt && rt.dispose();
    rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    U.uK.value = k;
  }

  const _t = new THREE.Vector3(), _p = new THREE.Vector3();
  function setShot(s) {
    camera.position.set(...s.pos);
    _t.set(...s.target); camera.lookAt(_t);
    camera.fov = s.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    U.uPixAng.value = 2 * Math.tan(camera.fov * DEG / 2) / RH;
  }
  /** World point to stage pixels (1920 x 1080 space) */
  function project(v, out = {}) {
    _p.set(v[0], v[1], v[2]).project(camera);
    out.x = (_p.x * .5 + .5) * W; out.y = (-_p.y * .5 + .5) * H; out.ok = _p.z < 1;
    return out;
  }
  FRAME_START.push(() => { SCRIM.bottom = 0; SCRIM.left = 0; });
  function render(t) {
    U.uT.value = t;
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera);
    comp.uniforms.uScene.value = rt.texture;
    comp.uniforms.uScrimB.value = SCRIM.bottom; comp.uniforms.uScrimL.value = SCRIM.left;
    renderer.setRenderTarget(null); renderer.render(post, postCam);
  }
  /** Read back final pixels (check mode): returns Uint8Array RGBA for a stage-space rect */
  function readRect(x, y, w, h) {
    const gl = renderer.getContext();
    const k = RW / W, X = Math.round(x * k), Y = Math.round((H - y - h) * k), Wd = Math.max(1, Math.round(w * k)), Hd = Math.max(1, Math.round(h * k));
    const buf = new Uint8Array(Wd * Hd * 4);
    gl.readPixels(X, Y, Wd, Hd, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    return { buf, w: Wd, h: Hd };
  }
  return { scene, camera, renderer, U, SCRIM, resize, setShot, project, render, readRect, ready: Promise.resolve(), get RH() { return RH; } };
})();
/** Scenes ask for a scrim; the strongest request each frame wins */
const requestScrim = (side, v) => { WORLD.SCRIM[side] = Math.max(WORLD.SCRIM[side], v); };
