/* =========================================================
   Mars
   1. The surface (colour and height) is generated once at load into a
      cube map from 3D noise in the planet's own space: rust and ochre
      highlands, darker basalt plains, a small pale polar cap, large
      crater rims and many small craters.
   2. Each frame the planet is ray-traced as an exact sphere on a full-
      screen pass, lit with version 1's soft terminator and dark night
      side. The limb is anti-aliased analytically, and the atmosphere is
      a thin crisp rim of a few pixels on the lit limb only. No glow.
   3. Jezero is drawn analytically in that pass (JEZERO_GLSL), so it is
      sharp at every distance, from orbit down to its floor: a shallow
      bowl in the terrain's own rust, a raised rim, faint lighter ejecta
      and a small delta on the western wall. Its depth comes from the
      lighting, never from darkness. The isometric crater floor shades
      itself with the same code, so the two always match.
   Jezero sits at the planet's top (world +Y), above the crater floor
   where the isometric kit is built.
   ========================================================= */
const PLANET = {
  R: 400,
  center: [0, -400, 0],
  // Rim radius 4.7 degrees: the crater is 8% of the planet's diameter. The flat floor ends at 75% of the rim radius,
  // which keeps the walls just outside the landed isometric frame.
  jezero: { lat: 18.4, lon: 77.5, radiusDeg: 4.7, floor: 0.75 },
  floorExpo: 1,          // the ground's exposure once the camera has landed (see 34-s05-reveal.js)
  roll: 200,             // spin about world +Y, which places the polar cap and the big basins
  faceSize: 2048,
  night: 0.012,          // night side brightness, as a fraction of the lit albedo
  rimPx: 2.5,            // atmosphere rim width at 1x
};

/* ---------- Surface generator (runs once) ---------- */
const MARS_SURFACE_GLSL = GLSL_COMMON + `
uniform vec3 m0, m1, m2, m3, m4, uInk;   // Mars ramp and primary white, as sRGB 0..1
uniform float uE;                        // one texel, in radians
varying vec3 vP;
float fbm(vec3 p, int oct){ float s = 0., a = .5; for (int i = 0; i < 10; i++){ if (i >= oct) break; s += a * gnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.4); a *= .5; } return s; }
vec3 ll(float lat, float lon){ lat *= PI / 180.; lon *= PI / 180.; return vec3(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon)); }
float ang(vec3 a, vec3 b){ return acos(clamp(dot(a, b), -1., 1.)); }
/* Crater profile at x = distance / radius: (height, rim, inside) */
vec3 crater(float x, float rimW){
  // Every term is continuous, and the whole profile fades to nothing before the cut-off, so no
  // crater leaves a step in the height (a step shows as a hard line once the camera is close)
  float bowl = x < 1. ? -(1. - x * x) : 0.;
  float rim = exp(-pow((x - 1.) / rimW, 2.));
  float ej = x > 1. ? (1. - exp(-(x - 1.) * 12.)) * exp(-(x - 1.) * 4.) * .16 : 0.;
  float fade = 1. - smoothstep(1.6, 1.95, x);
  return vec3((bowl + rim * .45 + ej) * fade, rim * fade, 1. - smoothstep(.8, 1., x));
}
/* A cellular field of craters at one scale: (height, albedo change) */
vec2 craterField(vec3 p, float sc, float prob, float rmin, float rmax, float depth, float seed){
  vec3 q = p * sc, c = floor(q); vec2 acc = vec2(0.);
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++){
    vec3 cell = c + vec3(x, y, z);
    vec3 h = hash3(cell * 1.13 + seed);
    if (h.x > prob) continue;
    vec3 fp = cell + hash3(cell * 2.31 + seed + 5.7);
    float r = mix(rmin, rmax, h.y * h.y);
    float d = length(q - fp) / r;
    if (d > 2.) continue;
    vec3 cp = crater(d, max(.17, 1.6 * uE * sc / r));   // rims never thinner than ~1.6 texels, so they never bake as dots
    float fresh = mix(.45, 1., h.z);
    acc.x += cp.x * r * depth * fresh / sc;
    acc.y += (cp.y * .12 - cp.z * .05) * fresh;
  }
  return acc;
}
vec4 surface(vec3 p){
  float lat = asin(clamp(p.y, -1., 1.)) * 180. / PI;

  /* Regional albedo. A two-level domain warp gives Mars-like shapes with defined edges:
     ochre and butterscotch dust over the highlands, darker basalt plains in two latitude bands. */
  vec3 w1 = vec3(fbm(p * 1.4 + vec3(0., 1.3, 2.1), 5), fbm(p * 1.4 + vec3(5.2, .4, 7.7), 5), fbm(p * 1.4 + vec3(2.8, 6.1, .3), 5));
  vec2 w2 = vec2(fbm(p * 2.6 + w1 * 1.6 + vec3(1.7, 9.2, .4), 5), fbm(p * 2.6 + w1 * 1.6 + vec3(8.3, 2.8, 4.1), 5));
  float a = fbm(p * 2.2 + vec3(w2, w1.z) * 1.4, 7);
  float band = exp(-pow((lat + 14.) / 20., 2.)) * .2 + exp(-pow((lat - 47.) / 11., 2.)) * .13;
  // A dark wedge west of Jezero, so the region round the crater is recognisable
  float syrtis = exp(-pow(ang(p, ll(9., 69.)) / .19, 2.)) * .3 + exp(-pow(ang(p, ll(-3., 65.)) / .13, 2.)) * .18;
  float darkF = -a + band + syrtis - .07;
  float dark = smoothstep(.02, .11, darkF), darker = smoothstep(.11, .3, darkF);
  float bright = smoothstep(.0, .3, a - band * .4);
  vec3 col = mix(m3, mix(m3, m4, .62), bright);
  col = mix(col, mix(m3, m2, .8), dark * .9);
  col = mix(col, mix(m2, m1, .55), darker * .85);
  // Wind-blown dust streaks over the dark plains
  col = mix(col, mix(m3, m4, .3), dark * smoothstep(.08, .34, fbm(p * 14. + w1 * 2., 4)) * .3);

  /* Height: regional relief plus craters at four scales, few large and many small.
     Craters show mostly through relief, with only a faint change in colour. */
  // Jezero itself is drawn each frame (JEZERO_GLSL). Here its floor and walls are only cleared of fine relief, and its
  // ejecta of older craters, so the floor reads smooth and the bake never fights the crater drawn over it.
  float jx = ang(p, ll(${PLANET.jezero.lat.toFixed(2)}, ${PLANET.jezero.lon.toFixed(2)})) / ${(PLANET.jezero.radiusDeg * Math.PI / 180).toFixed(5)};
  float h = fbm(p * 3. + w1 * .6, 6) * .012 * smoothstep(.7, 1.7, jx);
  float jClear = smoothstep(1.05, 1.9, jx);
  vec2 cf = craterField(p, 4., .13, .2, .45, .9, 1.)
          + craterField(p, 11., .2, .15, .42, .85, 7.)
          + craterField(p, 27., .28, .12, .40, .8, 13.)
          + craterField(p, 64., .36, .12, .38, .7, 19.);
  h += cf.x * .08 * jClear;
  col *= 1. + cf.y * .5 * jClear;

  /* Large basins with broad, soft rims (lat, lon, radius in degrees, floor brightness), kept clear of Jezero */
  vec4 B[5];
  B[0] = vec4(-42.4, 70.5, 19., .3);     // Hellas
  B[1] = vec4(-49.7, -42.8, 9., .2);     // Argyre
  B[2] = vec4(-14., 55.5, 4.2, .08);     // Huygens
  B[3] = vec4(-2.7, 16.7, 4.6, .08);     // Schiaparelli
  B[4] = vec4(34., 30., 3.4, .06);       // Cassini
  for (int i = 0; i < 5; i++){
    float rr = B[i].z * PI / 180.;
    float x = ang(p, ll(B[i].x, B[i].y)) / rr + fbm(p * 9. + float(i), 3) * .05;
    if (x > 2.2) continue;
    vec3 cp = crater(x, .2 + .06 * fbm(p * 14. + float(i) * 3., 2));
    h += cp.x * rr * .04;
    col = mix(col, mix(col, m4, .6), (1. - smoothstep(.5, 1., x)) * B[i].w);
    col *= 1. + cp.y * .05;
  }

  /* Polar caps: small and pale, with a ragged edge of thinner frost */
  float dn = ang(p, vec3(0., 1., 0.)) * 180. / PI, ds = ang(p, vec3(0., -1., 0.)) * 180. / PI;
  float eN = dn + fbm(p * 9., 5) * 3.2 + fbm(p * 30., 3) * 1.2;
  float capN = 1. - smoothstep(4.2, 5.4, eN);
  float frostN = (1. - smoothstep(5.4, 8.5, eN)) * smoothstep(0., .25, fbm(p * 24., 4)) * .5;
  float eS = ds + fbm(p * 11. + 4., 5) * 2.4;
  float capS = (1. - smoothstep(2.2, 3.2, eS)) * .85;
  vec3 ice = mix(m4, uInk, .3);
  col = mix(col, ice, max(max(capN * .95, frostN * .6), capS));
  h += max(capN, capS) * .002;

  /* Fine mottling */
  col *= .95 + .1 * fbm(p * 26. + w1, 4);
  return vec4(clamp(col, 0., 1.), h);
}
uniform float uMode;
void main(){
  vec3 p = normalize(vP);
  vec4 s = surface(p);
  if (uMode < .5) { gl_FragColor = vec4(s.rgb, clamp(s.a * 18. + .5, 0., 1.)); return; }
  // Mode 1: the relief normal, from heights at full float precision, so it never steps or seams
  vec3 t1 = normalize(cross(p, abs(p.y) < .99 ? vec3(0., 1., 0.) : vec3(1., 0., 0.))), t2 = cross(p, t1);
  float h1 = surface(normalize(p + t1 * uE)).a, h2 = surface(normalize(p + t2 * uE)).a;
  vec3 n = normalize(p - ((h1 - s.a) * t1 + (h2 - s.a) * t2) / uE);
  gl_FragColor = vec4(n * .5 + .5, 1.);
}`;

/* ---------- Jezero and the planet's shading, shared by the planet pass and the isometric crater floor ---------- */
const MARS_SHADE_GLSL = `
uniform samplerCube uSurf; uniform mat3 uToLocal, uToWorld; uniform vec3 uC, uSun, uKey;
uniform float uR, uT, uNight, uExpo, uKeyMix, uPixAng;
uniform vec3 uJz, uJzE, uJzN; uniform float uJzR;
uniform vec4 uPad;                              // the levelled pad under the platform: centre (x, z), half size, world units
uniform float uPadAO;                           // how much the ground darkens round the platform (it comes with the platform)
#define ST_N 12
uniform float uStA;                             // the station plan in the crater floor, seen from orbit (0 = off)
uniform vec4 uStBox[ST_N];                      // its parts: centre (world x, z), half size
uniform vec3 uStCol[ST_N];                      // each part's colour (linear)
uniform vec2 uStOut[ST_N];                      // the direction a thin part grows in, away from the platform (0 = in place)
float jzTerr = .75;                             // how strongly the walls slump into terraces: only once close enough to see them
#define JZ_F ${PLANET.jezero.floor.toFixed(3)}   // the flat floor ends here, in rim radii
#define JZ_DEPTH .007                           // planet radii: a shallow bowl
#define JZ_RIM .0026                            // the raised rim
#define JZ_DARK .4                              // the floor's albedo against the terrain round it (linear): a third darker
#define JZ_LOD 4.                               // the floor's base albedo is sampled this many mip levels down: smooth
/** Offset from Jezero's centre in rim radii, (east, north) */
vec2 jzUV(vec3 p){
  vec3 q = p - uJz * dot(p, uJz);
  float s = length(q), th = atan(s, dot(p, uJz));
  return vec2(dot(q, uJzE), dot(q, uJzN)) * (th / max(s, 1e-9)) / uJzR;
}
/**
 * The delta: a small fan on the western inner wall, spreading from the rim towards the centre, its lobed toe short of
 * the floor. Smooth everywhere (a step in it would show as a hard line in the relief).
 */
const vec2 JZ_APEX = vec2(-.97, .14);
float jzFan(vec2 uv){
  vec2 ax = normalize(-JZ_APEX), q = uv - JZ_APEX;
  float s = dot(q, ax), t = dot(q, vec2(-ax.y, ax.x)), d = length(q);
  float lobe = 1. + .1 * cos(atan(t, max(s, 1e-3)) * 7.);
  return smoothstep(-.06, .05, s) * (1. - smoothstep(.55, 1., d / (.2 * lobe))) * (1. - smoothstep(.55, 1., abs(t) / (.06 + max(s, 0.))));
}
/** Height (planet radii): a flat floor, an inner wall slumped into three irregular terraces, the rim crest at 1, a gentle outer flank */
float jzHeight(vec2 uv){
  float x = length(uv);
  if (x < JZ_F - .04) return -JZ_DEPTH;                   // the flat floor (the rim and delta are nothing here)
  vec2 dir = uv / max(x, 1e-4);
  float wall = smoothstep(JZ_F - .04, JZ_F + .06, x);
  float s = smoothstep(JZ_F, 1., x + .02 * gnoise(vec3(dir * 4., 1.7)) * wall);
  // The terraces wander: their spacing and edges vary round the crater, so they never read as rings
  float q = s * 3. + (.35 * gnoise(vec3(dir * 5., 9.1)) + .15 * gnoise(vec3(dir * 13., 3.3))) * wall;
  float terr = (floor(q) + smoothstep(.15, .85, fract(q))) / 3.;
  float bowl = -JZ_DEPTH * (1. - mix(s, clamp(terr, 0., 1.), jzTerr * s * (1. - s) * 4.));
  float w = x < 1. ? .08 : .32;
  return bowl + JZ_RIM * (1. + .2 * gnoise(vec3(dir * 3., 4.2))) * exp(-pow((x - 1.) / w, 2.)) + .0006 * jzFan(uv);
}
/** The rim's shadow across the far inner wall and the floor below it, soft-edged: 1 in full sun */
float jzRimShadow(vec2 uv, vec3 p, float h){
  vec3 S = uToLocal * uSun;
  float sn = dot(S, p), c = dot(uv, uv) - 1.;
  vec2 st = vec2(dot(S, uJzE), dot(S, uJzN));
  float stl = length(st);
  if (c >= 0. || stl < 1e-4 || sn <= 0.) return 1.;
  float b = dot(uv, st / stl), t = -b + sqrt(b * b - c);    // rim radii to the rim, towards the sun
  float r = (JZ_RIM - h) * stl / (t * uJzR * sn);         // above 1, the rim stands higher than the sun
  return mix(1., .42, smoothstep(.8, 1.25, r));
}
/** Signed distance to the edge of the levelled pad, world units */
float jzPad(vec2 g){ vec2 q = abs(g - uPad.xy) - uPad.zw; return length(max(q, 0.)) + min(max(q.x, q.y), 0.); }
/**
 * The floor's terrain at ground position g (world x, z; Jezero is at the origin): fine regolith grain, small dunes in
 * patches, a few small craters, scattered rocks with short shadows away from the light L, and the levelled pad cut
 * into the surface under the platform, the ground a little darker round it. Everything finer than the pixel
 * footprint fw fades out, so nothing shimmers from orbit. Returns the height (world units); with full, also the
 * albedo factor and the rocks' shadows.
 */
/** The detail's slowly varying fields at g: dune patches, dune direction, crest warp (computed once per pixel) */
vec3 jzLow(vec2 g){ return vec3(gnoise(vec3(g * .08, 6.2)), gnoise(vec3(g * .04, 2.4)), gnoise(vec3(g * .35, 5.5))); }
float jzDetail(vec2 g, vec3 lf, float fw, vec3 L, bool full, out float alb, out float shade){
  alb = 1.; shade = 1.;
  float pd = jzPad(g), wild = smoothstep(-.05, .4, pd);     // 0 on the pad, 1 on open ground
  float h = -.025 * (1. - smoothstep(-.05, .05, pd));     // the pad sits a step down in the surface
  float kg = 1. - smoothstep(.05, .12, fw), kf = 1. - smoothstep(.02, .05, fw), kr = 1. - smoothstep(.07, .16, fw);
  float n1 = kg > 0. ? gnoise(vec3(g * 6.5, 3.1)) * kg : 0.;
  h += .008 * n1 * mix(.4, 1., wild);
  // Small dunes: crests running across a slowly turning direction, in patches
  float rip = 0., pm = 0.;
  if (kr > 0.) {
    pm = smoothstep(.12, .38, lf.x) * wild * kr;
    float a = .5 + 1.6 * lf.y;
    float ph = dot(g, vec2(cos(a), sin(a))) * 9. + 3.5 * lf.z;
    rip = .5 + .5 * sin(ph); rip *= rip;
    h += .007 * rip * pm;
  }
  // Small craters, a few larger and more smaller ones. Each lies wholly inside its own cell, so one cell is enough.
  float ca = 0.;
  for (int s = 0; s < 2; s++) {
    float cs = s == 0 ? 6. : 2.5, pr = s == 0 ? .13 : .1;
    vec2 rr = s == 0 ? vec2(.7, 1.6) : vec2(.12, .32);
    if (rr.y < fw * 1.2) continue;
    vec2 cell = floor(g / cs);
    vec3 hh = hash3(vec3(cell, 11. + float(s) * 7.));
    if (hh.x > pr) continue;
    float r = mix(rr.x, rr.y, hh.y * hh.y), m = r * 1.5 / cs;
    vec2 cp = (cell + m + (1. - 2. * m) * hash3(vec3(cell, 23. + float(s))).xy) * cs;
    float d = length(g - cp) / r;
    if (d > 1.5) continue;
    float k = smoothstep(1.2, 3., r / fw) * wild * (1. - smoothstep(1.2, 1.5, d));
    h += ((d < 1. ? -(1. - d * d) : 0.) * .18 + exp(-pow((d - 1.) / .22, 2.)) * .06) * r * k;
    ca += (d < 1. ? -.07 : .04 * exp(-pow((d - 1.) / .3, 2.))) * k;
  }
  // Rocks: small domes, sparse
  float ra = 0., rs = 0.;
  vec2 cell = floor(g / .8);
  vec3 hh = hash3(vec3(cell, 41.));
  if (fw < .07 && hh.x < .24) {                            // each rock and its shadow lie inside its own cell
    vec2 cp = (cell + .25 + .5 * hash3(vec3(cell, 43.)).xy) * .8;
    float r = mix(.045, .13, hh.y * hh.y), k = smoothstep(1., 2.5, r / fw) * wild, d = length(g - cp) / r;
    if (d < 1.) { h += sqrt(1. - d * d) * r * .7 * k; ra = k * (1. - smoothstep(.8, 1., d)); }
    if (full) {
      vec2 so = -L.xz / max(L.y, .25) * r * .7;
      rs = k * (1. - smoothstep(.8, 1.05, length(g - cp - so) / (r * .95))) * smoothstep(.85, 1.05, d);
    }
  }
  if (!full) return h;
  float n2 = kf > 0. ? gnoise(vec3(g * 18., 8.4)) * kf : 0.;
  alb = (1. + .07 * n1 + .05 * n2) * (1. + ca) * (1. + .2 * ra) * (1. - .05 * (1. - rip) * pm);
  alb *= mix(.93, 1., wild) * (1. - .13 * uPadAO * (1. - smoothstep(-.5, 1.6, pd)));   // compacted pad; darker round the platform
  shade = 1. - .5 * rs;
  return h;
}
/**
 * The station seen from orbit: a top-down plan of its parts in their own colours, drawn into the crater floor. Close
 * to, each part has its true footprint, so it takes over from the 3D station seamlessly; as the camera rises, each
 * part widens just enough to stay a few pixels across (thin ones grow outwards, away from the platform), so the
 * layers stay readable from orbit. Later parts draw over earlier ones. Returns colour (linear) and coverage.
 */
vec4 jzStation(vec2 g, float fw){
  vec4 o = vec4(0.);
  if (uStA <= 0.) return o;
  float minHalf = 1.8 * fw;
  for (int i = 0; i < ST_N; i++) {
    vec4 b = uStBox[i];
    if (b.z <= 0.) continue;
    vec2 h = max(b.zw, vec2(minHalf)), c = b.xy + uStOut[i] * (h - b.zw);
    vec2 q = abs(g - c) - h;
    float d = length(max(q, 0.)) + min(max(q.x, q.y), 0.);
    float a = clamp(.5 - d / fw, 0., 1.);
    o = vec4(mix(o.rgb, uStCol[i], a), max(o.a, a));
  }
  o.a *= uStA;
  return o;
}
/**
 * Jezero and its floor at world normal N, for the pixel footprint fw (world units). On the isometric floor disc
 * (onDisc), the floor carries on past its edge instead of rising into the walls. Gives the albedo factor, the normal
 * to light the relief with (from Nb0, the planet's own), the light for that relief (the sun, handing over on the
 * floor to the kit's key light once the camera has landed: uKeyMix), how much light reaches it, and how far inside
 * the bowl it is (1 on the floor).
 */
void jzGround(vec3 N, vec3 Nb0, float fw, bool onDisc, out float alb, out vec3 Nb, out vec3 L, out float shade, out float inside, out vec4 deco){
  vec3 Nl = uToLocal * N;
  vec2 uv = jzUV(Nl);
  float x = length(uv);
  alb = 1.; Nb = Nb0; L = uSun; shade = 1.; inside = 0.; deco = vec4(0.);
  if (x > 2.6) return;
  bool beyond = onDisc && x > JZ_F;
  vec2 cuv = beyond ? uv * (JZ_F / x) : uv;
  float cx = length(cuv);
  // The crater's shape: relief box-filtered over the footprint, so the rim never shimmers when the crater is small
  float fx = fw / (uR * uJzR);                // the footprint in rim radii
  float e = max(.004, fx * .5);
  jzTerr = .8 * (1. - smoothstep(.004, .011, fx));
  float h0 = jzHeight(cuv);
  vec3 gw = vec3(0.);
  if (!beyond) {
    vec3 g3 = (uJzE * (jzHeight(cuv + vec2(e, 0.)) - h0) + uJzN * (jzHeight(cuv + vec2(0., e)) - h0)) / (e * uJzR);
    gw = uToWorld * (g3 - Nl * dot(g3, Nl));
  }
  inside = 1. - smoothstep(JZ_F, 1., cx);
  float floorM = onDisc ? 1. : 1. - smoothstep(JZ_F, JZ_F + .1, x);
  float kw = uKeyMix * floorM;
  L = normalize(mix(uSun, uKey, kw));
  // Albedo: the floor a third darker than the terrain round it; faint lighter ejecta in soft radial streaks; a lit rim; the delta
  float ej = smoothstep(.97, 1.12, x) * exp(-(x - 1.) * 1.9);
  float n = gnoise(vec3(uv / max(x, 1e-4) * 4.5, x * 1.4 + 2.));
  float rim = exp(-pow((x - 1.) / .07, 2.));
  alb = mix(1., JZ_DARK, inside) * (1. + .45 * ej * (.75 + .45 * n) + .2 * rim) * (1. + .12 * jzFan(cuv));
  // The floor's terrain
  vec3 gd = vec3(0.);
  if (floorM > 0.) {
    vec2 g = uR * N.xz;
    vec3 lf = jzLow(g);
    float da, ds, d1, d2;
    float d0 = jzDetail(g, lf, fw, L, true, da, ds);
    float ed = max(.004, fw * .5);
    vec3 gr = vec3(jzDetail(g + vec2(ed, 0.), lf, fw, L, false, d1, d2) - d0, 0., jzDetail(g + vec2(0., ed), lf, fw, L, false, d1, d2) - d0) / ed;
    gd = (gr - N * dot(gr, N)) * floorM;
    alb *= mix(1., da, floorM); shade *= mix(1., ds, floorM);
    deco = jzStation(g, fw) * vec4(1., 1., 1., floorM);
  }
  Nb = normalize(Nb0 - gw - gd);
  // The rim's shadow, from the sun only
  shade *= mix(jzRimShadow(cuv, Nl, h0), 1., max(kw, beyond ? 1. : 0.));
}
/** Surface albedo (linear) sampled at p, with the faint dust drift on a seamless 60-second cycle */
vec3 marsAlbedo(vec3 p, float lod){
  vec3 alb = srgbToLinear(textureLod(uSurf, p, lod).rgb);
  float a = TAU * uT / 60.;
  return alb * (1. - .06 * smoothstep(-.25, .55, gnoise(p * 4.5 + vec3(cos(a), sin(a), 0.) * .7)));
}
/**
 * Version 1's soft terminator from the sun, with relief lit from L that shows most near the terminator, the light
 * reaching it (shade), and a gentle limb darkening
 */
vec3 marsLight(vec3 alb, vec3 N, vec3 Nb, float ndv, vec3 L, float shade){
  float wrap = smoothstep(-.12, .5, dot(N, uSun));
  float relief = clamp(1. + 2.4 * (dot(Nb, L) - dot(N, L)), .2, 1.9);
  vec3 col = alb * (uNight + (1. - uNight) * wrap * relief * shade);
  return col * mix(.74, 1., smoothstep(0., .45, ndv)) * uExpo;
}
`;

const MARS = (() => {
  const { R } = PLANET;
  const C = new THREE.Vector3(...PLANET.center);
  const llDir = (lat, lon) => V3(Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.cos(lon * DEG));

  // Orientation: Jezero's direction in planet space maps to world +Y, then spin by `roll`
  const jz = llDir(PLANET.jezero.lat, PLANET.jezero.lon);
  const jzE = V3(Math.cos(PLANET.jezero.lon * DEG), 0, -Math.sin(PLANET.jezero.lon * DEG));   // east: longitude increasing
  const q = new THREE.Quaternion().setFromUnitVectors(jz, V3(0, 1, 0));
  q.premultiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), PLANET.roll * DEG));
  const toWorld = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
  const toLocal = toWorld.clone().transpose();

  /* ---------- Bake the surface into a cube map ---------- */
  const size = PLANET.faceSize;
  const cubeOpts = { type: THREE.UnsignedByteType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter };
  const cubeRT = new THREE.WebGLCubeRenderTarget(size, cubeOpts);       // albedo (sRGB) and height
  const normRT = new THREE.WebGLCubeRenderTarget(size, cubeOpts);       // relief normal, planet space
  {
    const s = hexRGB;
    const genScene = new THREE.Scene();
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthTest: false, depthWrite: false,
      uniforms: { uMode: { value: 0 }, uE: { value: (Math.PI / 2) / size }, m0: { value: V3(...s(COL.mars[0])) }, m1: { value: V3(...s(COL.mars[1])) }, m2: { value: V3(...s(COL.mars[2])) }, m3: { value: V3(...s(COL.mars[3])) }, m4: { value: V3(...s(COL.mars[4])) }, uInk: { value: V3(...s(COL.ink)) } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: MARS_SURFACE_GLSL,
    });
    genScene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), mat));
    const cc = new THREE.CubeCamera(0.01, 10, cubeRT);
    cc.update(WORLD.renderer, genScene);
    mat.uniforms.uMode.value = 1;
    const cn = new THREE.CubeCamera(0.01, 10, normRT);
    cn.update(WORLD.renderer, genScene);
    mat.dispose();
  }

  /* ---------- The planet: an exact sphere, ray-traced each frame ---------- */
  const U = {
    uSurf: { value: cubeRT.texture }, uNorm: { value: normRT.texture }, uToLocal: { value: toLocal }, uToWorld: { value: toWorld },
    uC: { value: C }, uR: { value: R }, uSun: { value: V3(1, 0, 0) },
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
    uPixAng: WORLD.U.uPixAng, uK: WORLD.U.uK, uT: WORLD.U.uT,
    uTexAng: { value: (Math.PI / 2) / size }, uNight: { value: PLANET.night }, uRimPx: { value: PLANET.rimPx },
    uRim: { value: linVec(COL.mars[4]).lerp(linVec(COL.ink), 0.35) }, uBump: { value: 1.0 }, uFade: { value: 1 }, uExpo: { value: 1 },
    // The kit's key light (set by the kit), how far the floor has handed over to it, and the levelled pad under the platform
    uKey: { value: V3(0, 1, 0) }, uKeyMix: { value: 0 }, uPad: { value: new THREE.Vector4(0, 0, 0, 0) }, uPadAO: { value: 0 },
    uDiscA: { value: 0 }, uDiscR: { value: 0 },   // the crater floor disc's opacity and radius (set by the kit), so the planet can skip what it hides
    // The station plan in the crater floor (set from the station's layout in 40-s11-production.js)
    uStA: { value: 0 }, uStBox: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
    uStCol: { value: Array.from({ length: 12 }, () => V3(0, 0, 0)) }, uStOut: { value: Array.from({ length: 12 }, () => new THREE.Vector2()) },
    // Jezero's centre, east and north in planet space, and its rim radius in radians
    uJz: { value: jz.clone() }, uJzE: { value: jzE }, uJzN: { value: jz.clone().cross(jzE) }, uJzR: { value: PLANET.jezero.radiusDeg * DEG },
  };
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const planet = new THREE.Mesh(tri, new THREE.ShaderMaterial({
    uniforms: U, transparent: false, depthTest: false, depthWrite: false,   // background: first pass, before the kit
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: `varying vec2 vNdc; void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: GLSL_COMMON + MARS_SHADE_GLSL + `
      uniform samplerCube uNorm; uniform vec3 uRim;
      uniform mat4 uInvProj, uCamWorld; uniform float uK, uTexAng, uRimPx, uBump, uFade, uDiscA, uDiscR;
      varying vec2 vNdc;
      void main(){
        vec4 v = uInvProj * vec4(vNdc, 1., 1.); v /= v.w;
        vec3 d = normalize((uCamWorld * vec4(v.xyz, 0.)).xyz);
        vec3 oc = cameraPosition - uC;
        float tc = -dot(oc, d);
        if (tc <= 0.) discard;
        float qd = length(cross(oc, d));                 // closest distance from the centre to the ray
        float pxW = tc * uPixAng;                        // world size of one pixel there
        float edge = (uR - qd) / pxW;                    // pixels inside the limb
        float cov = clamp(edge + .5, 0., 1.);
        if (cov <= 0.) discard;
        float t0 = tc - sqrt(max(uR * uR - qd * qd, 0.));
        vec3 P = cameraPosition + d * t0;
        vec3 N = normalize(P - uC);
        float ndv = max(dot(N, -d), 0.);
        vec3 Nl = uToLocal * N;
        // Hidden under the opaque crater floor disc (the isometric shots): nothing to draw
        if (uDiscA >= 1. && length(uR * N.xz) < uDiscR - 3.5 && N.y > .9) { gl_FragColor = vec4(0., 0., 0., 1.); return; }

        // Surface: mip level from the pixel footprint
        float foot = pxW / uR / sqrt(max(ndv, .05));
        float lod = max(log2(foot / uTexAng), 0.);
        // Relief from the baked normal (it fades as the surface is magnified past its texels)
        float mag = max(0., -log2(foot / uTexAng));
        vec3 nb = textureLod(uNorm, Nl, lod).xyz * 2. - 1.;
        vec3 Nb0 = uToWorld * normalize(mix(Nl, nb, uBump * (1. - smoothstep(.5, 2.5, mag))));
        // Jezero and its floor, drawn here so they are sharp at any distance; inside the bowl the albedo is sampled smoother
        float jAlb, jShade, jIn; vec3 Nb, L; vec4 deco;
        jzGround(N, Nb0, foot * uR, false, jAlb, Nb, L, jShade, jIn, deco);
        vec3 alb = mix(marsAlbedo(Nl, mix(lod, max(lod, JZ_LOD), jIn)) * jAlb, deco.rgb, deco.a);
        vec3 col = marsLight(alb, N, mix(Nb0, Nb, uBump), ndv, L, jShade);

        // Atmosphere: a crisp rim a few pixels wide, on the lit limb only
        float rimPx = uRimPx * uK;
        float band = smoothstep(rimPx + .8, rimPx - .8, edge);
        float rimLit = smoothstep(-.1, .45, dot(N, uSun));
        col = mix(col, uRim * uExpo, band * rimLit * .9);

        gl_FragColor = vec4(col, 1.) * cov * uFade;
      }`,
  }));
  planet.frustumCulled = false; planet.renderOrder = -5;
  WORLD.scene.add(planet);
  const FULL_LIT = PARAMS.has('fulllit');   // review aid: light the planet from the camera
  if (PARAMS.has('nobump')) U.uBump.value = 0;
  FRAME_END.push(() => {
    const cam = WORLD.camera;
    if (FULL_LIT) U.uSun.value.copy(cam.position).sub(C).normalize();
    U.uInvProj.value.copy(cam.projectionMatrixInverse); U.uCamWorld.value.copy(cam.matrixWorld);
  });

  /** Surface point (world) for a planet-local direction */
  const surfacePoint = (n, lift = 0) => C.clone().addScaledVector(n, R + lift);
  return { C, R, U, toWorld, toLocal, mesh: planet, surfacePoint, llDir, setSun: v => U.uSun.value.copy(v).normalize() };
})();

/* =========================================================
   Points of light on the surface: AI agents and pilots.
   Each one is a small pin standing on the planet: a thin spire along
   the surface normal, topped with a crisp solid dot, and a short sharp
   shadow on the terrain from the planet's sun (none on the night side,
   where there is no sun to cast one). No glow, no halo. Sizes are in
   stage pixels, so the pins read the same at any distance.
   A pin rises out of the surface as it appears. It may fail (turns
   coral, dims and sinks back into the surface) or go live (turns
   mint). All of it is a function of time.
   ========================================================= */
const MARKER = { dot: 10, spire: 2, height: [16, 26], shadow: 1.2 };   // stage pixels; shadow: longest, against the height
function makeSurfacePoints(dirs, o) {
  const N = dirs.length, aP = new Float32Array(N * 3), aT = new Float32Array(N * 4), aL = new Float32Array(N), r = rng(o.seed ?? 99);
  dirs.forEach((n, i) => {
    aP.set(MARS.surfacePoint(n, 0.3).toArray(), i * 3);
    aT.set([o.appear[i], o.fail?.[i] ?? 99, o.out?.[i] ?? 99, lerp(...MARKER.height, r())], i * 4);
    aL[i] = o.live?.[i] ?? 99;
  });
  const geo = () => {
    const quad = new THREE.PlaneGeometry(2, 2), g = new THREE.InstancedBufferGeometry();
    g.index = quad.index; g.setAttribute('position', quad.getAttribute('position'));
    g.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 3));
    g.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 4));
    g.setAttribute('aL', new THREE.InstancedBufferAttribute(aL, 1));
    g.instanceCount = N;
    return g;
  };
  const U = {
    uT: { value: 0 }, uC: { value: MARS.C }, uPx: { value: 0.001 }, uFade: { value: 1 }, uSun: MARS.U.uSun,
    uDot: { value: MARKER.dot / 2 }, uSpire: { value: MARKER.spire / 2 }, uShadow: { value: MARKER.shadow },
    uA: { value: linVec(o.color ?? COL.ink) }, uB: { value: linVec(COL.coral) }, uM: { value: linVec(COL.mint) },
  };
  // The pin's state at time uT: height (stage pixels), dot radius, opacity, colour; shared by the pin and its shadow
  const STATE = `uniform float uT, uPx, uFade, uDot, uSpire, uShadow; uniform vec3 uC, uA, uB, uM, uSun;
    attribute vec3 aP; attribute vec4 aT; attribute float aL;
    float oexp(float x){ x = clamp(x, 0., 1.); return x >= 1. ? 1. : 1. - pow(2., -10. * x); }
    vec3 n; float pxW, hPx, rad, alpha; vec3 col;
    void pinState(){
      n = normalize(aP - uC);
      pxW = distance(cameraPosition, aP) * uPx;                // world units per stage pixel
      float rise = oexp((uT - aT.x) / .6);                     // rises out of the surface
      float fail = smoothstep(aT.y, aT.y + .25, uT);           // turns coral,
      float dim = smoothstep(aT.y + .1, aT.y + .6, uT);         // dims,
      float sink = smoothstep(aT.y + .35, aT.y + 1.15, uT);    // and sinks back into the surface
      float gone = smoothstep(aT.y + .95, aT.y + 1.2, uT);
      float leave = smoothstep(aT.z, aT.z + .5, uT);           // survivors leave at the descent
      float facing = smoothstep(.08, .3, dot(n, normalize(cameraPosition - aP)));
      hPx = aT.w * rise * (1. - sink);
      rad = uDot * oexp((uT - aT.x) / .3) * (1. - gone);
      alpha = facing * (1. - leave) * (1. - .55 * dim) * uFade * step(aT.x, uT);
      col = mix(mix(uA, uB, fail), uM, smoothstep(aL, aL + .4, uT));   // goes live: turns mint
    }`;
  const blend = { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
  /* The pin, in screen space: a quad round the spire from its foot to the dot, with room for the dot */
  const pin = new THREE.Mesh(geo(), new THREE.ShaderMaterial({
    uniforms: U, transparent: false, depthTest: false, depthWrite: false, side: THREE.DoubleSide, ...blend,
    vertexShader: STATE + `
      varying vec2 vS, vA, vB; varying vec3 vCol; varying float vRad, vAlpha;
      vec2 stagePx(vec4 c){ return (c.xy / c.w * .5 + .5) * vec2(${W}., ${H}.); }
      void main(){
        pinState();
        vec4 cb = projectionMatrix * viewMatrix * vec4(aP, 1.), ct = projectionMatrix * viewMatrix * vec4(aP + n * hPx * pxW, 1.);
        vec2 a = stagePx(cb), b = stagePx(ct), d = b - a;
        float len = length(d); d = len > 1e-3 ? d / len : vec2(1., 0.);
        float ext = max(rad, uSpire) + 2.;
        vS = mix(a - d * ext, b + d * ext, position.x * .5 + .5) + vec2(-d.y, d.x) * ext * position.y;
        vA = a; vB = b; vCol = col; vRad = rad; vAlpha = alpha;
        gl_Position = vec4(vS / vec2(${W}., ${H}.) * 2. - 1., 0., 1.);
      }`,
    fragmentShader: `uniform float uSpire; varying vec2 vS, vA, vB; varying vec3 vCol; varying float vRad, vAlpha;
      void main(){
        vec2 ab = vB - vA; float t = clamp(dot(vS - vA, ab) / max(dot(ab, ab), 1e-6), 0., 1.);
        float ds = length(vS - vA - ab * t), dd = length(vS - vB);
        float aa = max(fwidth(dd) * .7, 1e-3);
        float spire = 1. - smoothstep(uSpire - aa, uSpire + aa, ds);
        float dot_ = 1. - smoothstep(vRad - aa, vRad + aa, dd);
        float a = max(spire * step(.5, length(ab)), dot_) * vAlpha;
        if (a <= .001) discard;
        gl_FragColor = vec4(vCol * a, a);
      }`,
  }));
  /* The shadow, flat on the surface (so it foreshortens with it): the spire's line and the dot's disc, away from the sun */
  const shadow = new THREE.Mesh(geo(), new THREE.ShaderMaterial({
    uniforms: U, transparent: false, depthTest: false, depthWrite: false, side: THREE.DoubleSide, ...blend,
    vertexShader: STATE + `
      varying vec2 vQ; varying float vLen, vRad, vA;
      void main(){
        pinState();
        float sn = dot(uSun, n);
        vec3 st = uSun - n * sn;
        float stl = length(st);
        vec3 ax = stl > 1e-4 ? -st / stl : normalize(cross(n, vec3(0., 1., 0.))), ac = cross(n, ax);
        vLen = hPx * min(stl / max(sn, 1e-3), uShadow);          // short: never longer than uShadow times the height
        float ext = rad + 2.;
        vQ = vec2(mix(-ext, vLen + ext, position.x * .5 + .5), position.y * ext);
        vRad = rad * .9;
        vA = alpha * .6 * smoothstep(-.05, .45, sn);             // only where the sun reaches
        gl_Position = projectionMatrix * viewMatrix * vec4(aP + (ax * vQ.x + ac * vQ.y) * pxW, 1.);
      }`,
    fragmentShader: `uniform float uSpire; varying vec2 vQ; varying float vLen, vRad, vA;
      void main(){
        float ds = length(vec2(vQ.x - clamp(vQ.x, 0., vLen), vQ.y)), dd = length(vQ - vec2(vLen, 0.));
        float aa = max(fwidth(dd) * .7, 1e-3);
        float a = max(1. - smoothstep(uSpire * .8 - aa, uSpire * .8 + aa, ds), 1. - smoothstep(vRad - aa, vRad + aa, dd)) * vA;
        if (a <= .001) discard;
        gl_FragColor = vec4(0., 0., 0., a);
      }`,
  }));
  pin.frustumCulled = shadow.frustumCulled = false;
  shadow.renderOrder = 0.5; pin.renderOrder = 1;
  const pts = new THREE.Group(); pts.add(shadow, pin);
  FRAME_END.push(() => { U.uPx.value = 2 * Math.tan(WORLD.camera.fov * DEG / 2) / H; });
  return { pts, U, heights: Array.from({ length: N }, (_, i) => aT[i * 4 + 3]) };
}
