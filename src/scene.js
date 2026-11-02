/* ==========================================================
   Cenário 3D do riacho aconchegante — Three.js
   Tudo é gerado por código (low-poly procedural), então não
   há arquivos de modelo para baixar. Se quiser usar modelos
   feitos no Blender (.glb), veja o README.
   ========================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const SITE = window.SITE || {};
const canvas = document.getElementById("scene");
const html = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = matchMedia("(max-width: 800px)").matches || /Mobi|Android/i.test(navigator.userAgent);

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
}

function init() {
  /* ---------- utilidades ---------- */
  const { MathUtils, Vector3, Color } = THREE;
  const rng = (function (a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })(20240611);
  const rr = (a, b) => a + (b - a) * rng();
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ---------- mundo: riacho, terreno, casa ---------- */
  const WATER_Y = -0.25, PAD_Y = 1.7;
  const cx = (z) => Math.sin(z * 0.11) * 5 + Math.sin(z * 0.043 + 1.3) * 4 - 3.854; // eixo do riacho
  const HZ = -4, HX = cx(HZ) + 13;                                                   // casa
  const BZ = 9;                                                                       // ponte

  function baseH(x, z) {
    let h = 1.7 + Math.sin(x * 0.11 + 0.5) * 0.6 + Math.cos(z * 0.09) * 0.6 + Math.sin((x + z) * 0.23) * 0.25 + Math.sin(x * 0.31) * Math.cos(z * 0.27) * 0.15;
    const r = Math.hypot(x, z);
    h += smooth(32, 70, r) * 14 + smooth(20, 40, r) * 1.2;
    return h;
  }
  function height(x, z) {
    let h = baseH(x, z);
    const r = Math.hypot(x, z);
    const d = Math.abs(x - cx(z));
    const carve = 1 - smooth(42, 56, r);
    const shore = MathUtils.lerp(0.5, h, smooth(4, 15, d)); // margens suaves, sobem devagar
    h = MathUtils.lerp(h, MathUtils.lerp(-0.9, shore, smooth(1.0, 4.4, d)), carve);
    h = MathUtils.lerp(PAD_Y, h, smooth(7, 13, Math.hypot(x - HX, z - HZ)));
    return h;
  }

  /* ---------- renderer / cena / câmera ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  const maxPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  let pr = maxPR;
  renderer.setPixelRatio(pr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // atualizamos manualmente (1 a cada 2 quadros)

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe9f3, 38, 135);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.3, 400);

  /* ---------- vento compartilhado ---------- */
  const U = { uTime: { value: 0 }, uWind: { value: reduceMotion ? 0.3 : 1 } };
  function windPatch(mat, amp, pw) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind;
      sh.vertexShader = "uniform float uTime;\nuniform float uWind;\n" + sh.vertexShader.replace("#include <begin_vertex>", `
        vec3 transformed = vec3(position);
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float ph = ip.x * 0.31 + ip.z * 0.23;
        float g = pow(max(position.y, 0.0), ${pw.toFixed(2)}) * ${amp.toFixed(4)} * uWind;
        transformed.x += (sin(uTime * 1.6 + ph) + 0.5 * sin(uTime * 3.1 + ph * 2.1)) * g;
        transformed.z += (cos(uTime * 1.3 + ph * 1.2) + 0.4 * sin(uTime * 2.7 + ph)) * g * 0.7;
      `);
    };
    mat.customProgramCacheKey = () => "wind" + amp + "_" + pw;
    return mat;
  }
  function windDepth(amp, pw) {
    return windPatch(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), amp, pw);
  }

  /* ---------- helpers de geometria low-poly ---------- */
  function paint(g, hex, vary) {
    if (g.index) g = g.toNonIndexed();
    if (g.attributes.uv) g.deleteAttribute("uv");
    const n = g.attributes.position.count, arr = new Float32Array(n * 3), c = new Color(hex);
    for (let i = 0; i < n; i += 3) {
      const k = 1 + (vary ? (rng() - 0.5) * vary : 0);
      for (let j = 0; j < 3; j++) { arr[(i + j) * 3] = c.r * k; arr[(i + j) * 3 + 1] = c.g * k; arr[(i + j) * 3 + 2] = c.b * k; }
    }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    return g;
  }
  const box = (w, h, d, x, y, z, hex, vary) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), hex, vary);
  function jitterGeo(g, a) {
    const p = g.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3);
      if (!seen.has(key)) seen.set(key, [(rng() - 0.5) * a, (rng() - 0.5) * a, (rng() - 0.5) * a]);
      const j = seen.get(key);
      p.setXYZ(i, p.getX(i) + j[0], p.getY(i) + j[1], p.getZ(i) + j[2]);
    }
    g.computeVertexNormals();
    return g;
  }
  const stdMat = (extra) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 }, extra));

  /* ---------- luzes ---------- */
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x7a8f5a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 3);
  const sunTarget = new THREE.Object3D(); sunTarget.position.set(4, 0, 0);
  scene.add(sun, sunTarget); sun.target = sunTarget;
  const sm = isMobile ? 1024 : 2048;
  sun.castShadow = true; sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 190 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; sun.shadow.radius = 3;
  const lantern = new THREE.PointLight(0xffb55c, 0, 14, 2);
  scene.add(lantern);

  /* ---------- céu, estrelas ---------- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new Color() }, uHor: { value: new Color() }, uSunDir: { value: new Vector3(0, 1, 0) }, uSunCol: { value: new Color() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 uTop, uHor, uSunCol, uSunDir; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float t = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(uHor, uTop, pow(t, 0.5));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunCol * (pow(s, 900.0) * 4.0 + pow(s, 14.0) * 0.28 + pow(s, 3.0) * 0.07);
        col = mix(col, uHor, smoothstep(0.0, -0.25, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -2; scene.add(sky);

  const starGeo = new THREE.BufferGeometry();
  { const n = 700, a = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { const u = rng() * 2 - 1, t = rng() * Math.PI * 2, r = Math.sqrt(1 - u * u); a[i * 3] = r * Math.cos(t); a[i * 3 + 1] = Math.abs(u) * 0.95 + 0.05; a[i * 3 + 2] = r * Math.sin(t); s[i] = rng(); }
    starGeo.setAttribute("position", new THREE.BufferAttribute(a, 3)); starGeo.setAttribute("seed", new THREE.BufferAttribute(s, 1)); }
  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { uOpacity: { value: 0 }, uTime: U.uTime, uPR: { value: 1 } },
    vertexShader: `attribute float seed; uniform float uTime, uPR; varying float vA;
      void main(){ vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww;
        vA = 0.55 + 0.45 * sin(uTime * (1.0 + seed * 2.0) + seed * 40.0); gl_PointSize = (1.2 + seed * 2.2) * uPR; }`,
    fragmentShader: `uniform float uOpacity; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard; gl_FragColor = vec4(vec3(1.0, 0.97, 0.88), vA * uOpacity * smoothstep(0.5, 0.1, d)); }`
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false; stars.renderOrder = -1; scene.add(stars);

  /* ---------- terreno ---------- */
  {
    const SIZE = 150, SEG = isMobile ? 120 : 170, cell = SIZE / SEG;
    let g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + (rng() - 0.5) * cell * 0.55, z = p.getZ(i) + (rng() - 0.5) * cell * 0.55;
      p.setXYZ(i, x, height(x, z), z);
    }
    g = g.toNonIndexed(); g.deleteAttribute("uv"); g.computeVertexNormals();
    const pos = g.attributes.position, nor = g.attributes.normal, col = new Float32Array(pos.count * 3);
    const grass = ["#7cbc50", "#68a847", "#9ccd58", "#86c250"].map((h) => new Color(h));
    const dark = new Color("#3f7d3a"), sand = new Color("#e0cc92"), rock = new Color("#8f948c"), bed = new Color("#4d6a58"), tmp = new Color();
    for (let i = 0; i < pos.count; i += 3) {
      const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3, z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      const ny = nor.getY(i), d = Math.abs(x - cx(z)), r = Math.hypot(x, z);
      tmp.copy(grass[Math.floor(rng() * grass.length)]);
      tmp.lerp(dark, smooth(24, 58, r) * 0.75);
      if (y > 7) tmp.lerp(rock, smooth(7, 15, y) * 0.8);
      if (ny < 0.8) tmp.lerp(rock, smooth(0.8, 0.55, ny));
      if (d < 4.1 && y < 0.7) tmp.lerp(sand, 0.85 * smooth(4.1, 3.2, d));
      if (y < -0.35) tmp.lerp(bed, 0.9);
      const k = 0.94 + rng() * 0.12;
      for (let j = 0; j < 3; j++) { col[(i + j) * 3] = tmp.r * k; col[(i + j) * 3 + 1] = tmp.g * k; col[(i + j) * 3 + 2] = tmp.b * k; }
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
    m.receiveShadow = true; scene.add(m);
  }

  /* ---------- água (shader de fluxo) ---------- */
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uShallow: { value: new Color() }, uDeep: { value: new Color() }, uSky: { value: new Color() }, uHor: { value: new Color() },
      uSunDir: { value: new Vector3(0, 1, 0) }, uSunCol: { value: new Color() }
    }]),
    vertexShader: `
      varying vec2 vUv; varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main(){
        vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uShallow, uDeep, uSky, uHor, uSunDir, uSunCol;
      varying vec2 vUv; varying vec3 vWorld;
      #include <fog_pars_fragment>
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
      float field(vec2 q){
        float a = noise(q + vec2(0.0, -uTime * 0.62)) * 0.6 + noise(q * 2.1 + vec2(4.0, -uTime * 0.95)) * 0.3 + noise(q * 4.3 + vec2(9.0, -uTime * 1.5)) * 0.1;
        return a;
      }
      void main(){
        float e = abs(vUv.x);
        vec2 q = vec2(vUv.x * 2.4, vUv.y * 0.36);
        float h0 = field(q), hx = field(q + vec2(0.06, 0.0)), hz = field(q + vec2(0.0, 0.06));
        vec3 N = normalize(vec3((h0 - hx) * 7.0, 1.0, (h0 - hz) * 7.0));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.85 + 0.06;
        vec3 body = mix(uDeep, uShallow, smoothstep(0.2, 1.0, e) * 0.8 + h0 * 0.35);
        vec3 refl = mix(uHor, uSky, clamp(N.y * 0.5 + 0.1, 0.0, 1.0));
        vec3 col = mix(body, refl, fres);
        vec3 R = reflect(-normalize(uSunDir), N);
        float spec = pow(max(dot(R, V), 0.0), 70.0);
        col += uSunCol * spec * 1.6;
        float sp = smoothstep(0.84, 0.9, noise(q * 16.0 + vec2(0.0, -uTime * 2.6))) * smoothstep(0.35, 0.6, h0);
        col += uSunCol * sp * 0.55;
        float crest = smoothstep(0.62, 0.78, h0 + noise(q * 6.0 + vec2(0.0, -uTime * 1.8)) * 0.2);
        float foamEdge = smoothstep(0.66, 0.96, e) * (0.5 + 0.7 * noise(q * 5.0 + vec2(0.0, -uTime * 1.3)));
        col = mix(col, vec3(1.0), clamp(crest * 0.18 + foamEdge * 0.75, 0.0, 0.85));
        float alpha = (1.0 - smoothstep(0.88, 1.0, e)) * 0.93;
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`
  });
  waterMat.uniforms.uTime = U.uTime;
  { const W = 3.1, NZ = 170, NX = 8, n = (NZ + 1) * (NX + 1), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const z = -70 + (140 * j) / NZ, u = -1 + (2 * i) / NX, k = j * (NX + 1) + i;
      pos.set([cx(z) + u * W, WATER_Y, z], k * 3); uv.set([u, z], k * 2);
      if (j < NZ && i < NX) { const a = k, b = k + 1, c = k + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, waterMat); m.renderOrder = 1; m.frustumCulled = false; scene.add(m); }

  /* ---------- pedras ---------- */
  const rockMat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.95, metalness: 0 });
  const rocks = [];
  for (let i = 0; i < 16; i++) { const z = rr(-32, 32), x = cx(z) + rr(-1.5, 1.5), s = rr(0.45, 1.05); rocks.push({ x, z, y: WATER_Y - 0.2, s, water: true }); }
  for (let i = 0; i < 26; i++) { const z = rr(-36, 36), side = rng() < 0.5 ? -1 : 1, x = cx(z) + side * rr(2.8, 6.5), s = rr(0.4, 1.2); if (Math.hypot(x - HX, z - HZ) < 8) continue; rocks.push({ x, z, y: height(x, z) - 0.15, s }); }
  for (let i = 0; i < 18; i++) { const a = rng() * 6.283, r = rr(24, 46), x = Math.cos(a) * r, z = Math.sin(a) * r, s = rr(1.5, 3.4); rocks.push({ x, z, y: height(x, z) - 0.5, s }); }
  {
    const g = jitterGeo(new THREE.IcosahedronGeometry(1, 0), 0.35);
    const im = new THREE.InstancedMesh(g, rockMat, rocks.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new Color();
    rocks.forEach((r, i) => {
      e.set(rr(-0.3, 0.3), rng() * 6.28, rr(-0.3, 0.3)); q.setFromEuler(e);
      m4.compose(new Vector3(r.x, r.y + r.s * 0.35, r.z), q, new Vector3(r.s * rr(1, 1.4), r.s * rr(0.7, 1), r.s * rr(1, 1.4)));
      im.setMatrixAt(i, m4); const v = rr(0.5, 0.85); im.setColorAt(i, c.setRGB(v, v * 0.98, v * 0.94));
    });
    im.castShadow = im.receiveShadow = true; scene.add(im);
  }
  // espuma ao redor das pedras do riacho
  const foamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
    vertexShader: `
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main(){
        vUv = uv; vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main(){
        float r = length(vUv - 0.5) * 2.0; float ring = smoothstep(0.5, 0.64, r) * (1.0 - smoothstep(0.84, 1.0, r));
        float pulse = 0.65 + 0.35 * sin(uTime * 2.4 - r * 9.0); gl_FragColor = vec4(vec3(1.0), ring * pulse * 0.55);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`
  });
  foamMat.uniforms.uTime = U.uTime;
  { const list = rocks.filter((r) => r.water), g = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), im = new THREE.InstancedMesh(g, foamMat, list.length), m4 = new THREE.Matrix4();
    list.forEach((r, i) => { m4.compose(new Vector3(r.x, WATER_Y + 0.03, r.z), new THREE.Quaternion(), new Vector3(r.s * 2.1, 1, r.s * 2.1)); im.setMatrixAt(i, m4); });
    im.frustumCulled = false; im.renderOrder = 2; scene.add(im); }

  /* ---------- árvores ---------- */
  const treeGeos = {
    pine: mergeGeometries([
      paint(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6).translate(0, 0.75, 0), "#6b4a31"),
      paint(new THREE.ConeGeometry(1.7, 2.3, 7).translate(0, 2.2, 0), "#2f7a4a", 0.18),
      paint(new THREE.ConeGeometry(1.3, 2.1, 7).translate(0, 3.5, 0), "#37895a", 0.18),
      paint(new THREE.ConeGeometry(0.9, 1.9, 7).translate(0, 4.7, 0), "#419a63", 0.18)
    ]),
    round: mergeGeometries([
      paint(new THREE.CylinderGeometry(0.22, 0.32, 2.2, 6).translate(0, 1.1, 0), "#7a5237"),
      paint(jitterGeo(new THREE.IcosahedronGeometry(1.7, 0), 0.4).translate(0, 3.2, 0), "#5fae4f", 0.2),
      paint(jitterGeo(new THREE.IcosahedronGeometry(1.2, 0), 0.4).translate(0.9, 2.6, 0.4), "#74bd55", 0.2),
      paint(jitterGeo(new THREE.IcosahedronGeometry(1.1, 0), 0.4).translate(-0.8, 2.8, -0.5), "#4f9f48", 0.2)
    ]),
    autumn: mergeGeometries([
      paint(new THREE.CylinderGeometry(0.22, 0.32, 2.2, 6).translate(0, 1.1, 0), "#7a5237"),
      paint(jitterGeo(new THREE.IcosahedronGeometry(1.7, 0), 0.4).translate(0, 3.2, 0), "#f08a3c", 0.22),
      paint(jitterGeo(new THREE.IcosahedronGeometry(1.2, 0), 0.4).translate(0.9, 2.6, 0.4), "#ffb347", 0.22),
      paint(jitterGeo(new THREE.IcosahedronGeometry(1.1, 0), 0.4).translate(-0.8, 2.8, -0.5), "#e2673f", 0.22)
    ])
  };
  const bridgeC = new Vector3(cx(BZ), 0, BZ);
  const keepClear = (x, z) => Math.hypot(x - HX, z - HZ) < 10 || (z > 9 && Math.abs(x - cx(z)) < 10.5) || (Math.abs(z - BZ) < 6 && Math.abs(x - bridgeC.x) < 8);
  {
    const spots = [];
    for (let k = 0; k < 900 && spots.length < (isMobile ? 90 : 130); k++) {
      const a = rng() * 6.283, r = 7 + Math.pow(rng(), 0.7) * 46, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x - cx(z)) < 5.6 || keepClear(x, z)) continue;
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 3.1)) continue;
      spots.push({ x, z, y: height(x, z), s: rr(0.8, 1.45) * (r > 30 ? 1.25 : 1), t: rng() });
    }
    const groups = { pine: [], round: [], autumn: [] };
    spots.forEach((s) => groups[s.t < 0.5 ? "pine" : s.t < 0.82 ? "round" : "autumn"].push(s));
    const mat = windPatch(stdMat({ roughness: 0.9 }), 0.0095, 1.5), dep = windDepth(0.0095, 1.5), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new Color();
    Object.keys(groups).forEach((k) => {
      const list = groups[k], im = new THREE.InstancedMesh(treeGeos[k], mat, list.length);
      list.forEach((s, i) => {
        q.setFromEuler(new THREE.Euler(0, rng() * 6.28, 0));
        m4.compose(new Vector3(s.x, s.y - 0.1, s.z), q, new Vector3(s.s, s.s * rr(0.9, 1.2), s.s));
        im.setMatrixAt(i, m4); const v = rr(0.85, 1.12); im.setColorAt(i, c.setRGB(v, v, v));
      });
      im.castShadow = im.receiveShadow = true; im.customDepthMaterial = dep; scene.add(im);
    });
  }

  /* ---------- grama e flores ---------- */
  {
    const w = 0.055, h = 0.44;
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-w, 0, 0, w, 0, 0, -w * 0.6, h * 0.5, 0, w * 0.6, h * 0.5, 0, 0, h, 0]), 3));
    bg.setAttribute("normal", new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
    bg.setAttribute("color", new THREE.BufferAttribute(new Float32Array([0.72, 0.8, 0.62, 0.72, 0.8, 0.62, 0.85, 0.9, 0.75, 0.85, 0.9, 0.75, 1.15, 1.2, 0.95]), 3));
    bg.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
    const N = isMobile ? 9000 : 24000, mat = windPatch(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.65, 2.0), dep = windDepth(0.65, 2.0);
    const im = new THREE.InstancedMesh(bg, mat, N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new Color();
    const palette = ["#6fb04a", "#82c050", "#5e9e44", "#9bcc58", "#b7d65e"].map((h) => new Color(h));
    let n = 0;
    for (let k = 0; k < N * 3 && n < N; k++) {
      const a = rng() * 6.283, r = Math.sqrt(rng()) * 46, x = Math.cos(a) * r, z = Math.sin(a) * r, y = height(x, z);
      if (y < 0.15 || Math.abs(x - cx(z)) < 3.3 || Math.hypot(x - HX, z - HZ) < 4.4) continue;
      q.setFromEuler(new THREE.Euler(0, rng() * 6.28, 0));
      m4.compose(new Vector3(x, y - 0.03, z), q, new Vector3(1, rr(0.6, 1.5), 1)); im.setMatrixAt(n, m4);
      im.setColorAt(n, c.copy(palette[Math.floor(rng() * palette.length)]).multiplyScalar(rr(0.85, 1.1))); n++;
    }
    im.count = n; im.receiveShadow = true; im.customDepthMaterial = dep; im.frustumCulled = false; scene.add(im);

    const flowerCols = ["#ff6b8b", "#ffd23f", "#ffffff", "#b79cff"];
    flowerCols.forEach((hex) => {
      const fg = mergeGeometries([paint(new THREE.CylinderGeometry(0.012, 0.016, 0.4, 4).translate(0, 0.2, 0), "#4f9a3d"), paint(new THREE.IcosahedronGeometry(0.1, 0).translate(0, 0.43, 0), hex, 0.15)]);
      const fm = windPatch(stdMat({ roughness: 0.8 }), 0.55, 1.2), count = 110, f = new THREE.InstancedMesh(fg, fm, count);
      let k2 = 0;
      for (let t = 0; t < 2000 && k2 < count; t++) {
        const a = rng() * 6.283, r = 5 + rng() * 32, x = Math.cos(a) * r, z = Math.sin(a) * r, y = height(x, z), d = Math.abs(x - cx(z));
        if (y < 0.2 || d < 3.4 || d > 14 || Math.hypot(x - HX, z - HZ) < 4.5) continue;
        m4.compose(new Vector3(x, y - 0.03, z), q.setFromEuler(new THREE.Euler(0, rng() * 6.28, 0)), new Vector3(1, 1, 1).multiplyScalar(rr(0.8, 1.6))); f.setMatrixAt(k2++, m4);
      }
      f.count = k2; f.frustumCulled = false; f.castShadow = false; scene.add(f);
    });
  }

  /* ---------- casinha ---------- */
  const house = new THREE.Group();
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffd88a, emissive: 0xffb64d, emissiveIntensity: 0.15, roughness: 0.4 });
  const houseAngle = -Math.PI / 2 + 0.4;
  const front = new Vector3(Math.sin(houseAngle), 0, Math.cos(houseAngle)), perp = new Vector3(front.z, 0, -front.x);
  {
    const parts = [];
    parts.push(box(6.4, 0.5, 5.4, 0, 0.25, 0, "#8d8b85", 0.15));
    parts.push(box(6, 3, 5, 0, 2.0, 0, "#f3e0bb", 0.05));
    [[-3, -2.5], [3, -2.5], [-3, 2.5], [3, 2.5]].forEach(([x, z]) => parts.push(box(0.28, 3.1, 0.28, x, 2.0, z, "#8a5a3c")));
    parts.push(box(6.2, 0.2, 5.2, 0, 3.45, 0, "#8a5a3c"));
    const rise = 2.4, half = 3.1, a = Math.atan(rise / half), len = Math.hypot(half, rise);
    [1, -1].forEach((s) => {
      const g = new THREE.BoxGeometry(7.4, 0.28, len); g.rotateX(s * a); g.translate(0, 3.4 + rise / 2 + 0.12, s * half / 2);
      parts.push(paint(g, "#c8553d", 0.22));
    });
    parts.push(box(7.5, 0.26, 0.4, 0, 5.84, 0, "#a8432e"));
    const tri = new THREE.Shape(); tri.moveTo(-2.6, 0); tri.lineTo(2.6, 0); tri.lineTo(0, 2.3); tri.closePath();
    [1, -1].forEach((s) => { const g = new THREE.ExtrudeGeometry(tri, { depth: 0.2, bevelEnabled: false }); g.translate(0, 0, -0.1); g.rotateY(Math.PI / 2); g.translate(s * 2.95, 3.4, 0); parts.push(paint(g, "#f3e0bb", 0.05)); });
    parts.push(box(0.95, 2.8, 0.95, 2.1, 5.0, -0.9, "#a07c68", 0.2), box(1.2, 0.22, 1.2, 2.1, 6.5, -0.9, "#6e5446"));
    parts.push(box(1.15, 2.05, 0.16, 0, 1.55, 2.52, "#7a4a2e"), box(1.5, 0.2, 0.26, 0, 2.7, 2.55, "#5a3620"), box(0.12, 0.12, 0.1, 0.38, 1.5, 2.64, "#ffd23f"));
    parts.push(box(2.1, 0.16, 1.0, 0, 0.42, 3.05, "#9b9a95", 0.1));
    [-1.9, 1.9].forEach((x) => {
      parts.push(box(1.4, 1.4, 0.08, x, 2.35, 2.49, "#6b4428"), box(0.08, 1.15, 0.14, x, 2.35, 2.54, "#6b4428"), box(1.15, 0.08, 0.14, x, 2.35, 2.54, "#6b4428"));
      parts.push(box(0.42, 1.4, 0.1, x - 0.9, 2.35, 2.52, "#2f7a5a"), box(0.42, 1.4, 0.1, x + 0.9, 2.35, 2.52, "#2f7a5a"));
      parts.push(box(1.35, 0.28, 0.34, x, 1.5, 2.72, "#7a4a2e"));
      ["#ff6b8b", "#ffd23f", "#ff9b54", "#ffffff"].forEach((hx, i) => parts.push(paint(new THREE.IcosahedronGeometry(0.13, 0).translate(x - 0.45 + i * 0.3, 1.78, 2.74), hx)));
    });
    [1, -1].forEach((s) => parts.push(box(0.1, 1.5, 1.4, s * 3.0, 2.35, 0, "#6b4428")));
    const hm = new THREE.Mesh(mergeGeometries(parts), stdMat({ roughness: 0.85 }));
    hm.castShadow = hm.receiveShadow = true; house.add(hm);
    const glass = [-1.9, 1.9].map((x) => new THREE.BoxGeometry(1.1, 1.15, 0.1).translate(x, 2.35, 2.52));
    [1, -1].forEach((s) => glass.push(new THREE.BoxGeometry(0.1, 1.15, 1.1).translate(s * 3.03, 2.35, 0)));
    glass.forEach((g) => { g.deleteAttribute("uv"); });
    house.add(new THREE.Mesh(mergeGeometries(glass.map((g) => g.toNonIndexed ? g.toNonIndexed() : g)), glowMat));
    const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), glowMat); bulb.position.set(1.15, 2.2, 2.7); house.add(bulb);
  }
  house.position.set(HX, PAD_Y, HZ); house.rotation.y = houseAngle; scene.add(house);
  house.updateMatrixWorld(true);
  lantern.position.copy(house.localToWorld(new Vector3(1.15, 2.1, 3.0)));

  /* ---------- ponte, pedras do caminho, placa ---------- */
  {
    const x0 = cx(BZ) - 4.8, x1 = cx(BZ) + 4.8, y0 = height(x0, BZ), y1 = height(x1, BZ), base = Math.max(y0, y1) + 0.18;
    const parts = [], n = 18;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = MathUtils.lerp(x0, x1, t), arch = 0.4 * (1 - Math.pow(2 * t - 1, 2));
      parts.push(box(9.6 / n * 0.9, 0.14, 2.0, x - cx(BZ), base + arch, 0, "#b98a5a", 0.25));
    }
    [-1, 1].forEach((s) => {
      parts.push(box(9.8, 0.14, 0.14, 0, base - 0.12, s * 0.95, "#7a5234"));
      for (let i = 0; i <= 6; i++) { const t = i / 6, arch = 0.4 * (1 - Math.pow(2 * t - 1, 2)); parts.push(box(0.14, 0.9, 0.14, MathUtils.lerp(-4.7, 4.7, t), base + arch + 0.45, s * 0.95, "#7a5234")); }
      parts.push(box(9.4, 0.1, 0.12, 0, base + 0.9, s * 0.95, "#8d6139"));
    });
    const bm = new THREE.Mesh(mergeGeometries(parts), stdMat({ roughness: 0.9 }));
    bm.position.set(cx(BZ), 0, BZ); bm.castShadow = bm.receiveShadow = true; scene.add(bm);
  }
  {
    const door = new Vector3(HX + front.x * 3.6, 0, HZ + front.z * 3.6), end = new Vector3(cx(BZ) + 4.6, 0, BZ), g = new THREE.CylinderGeometry(0.55, 0.62, 0.18, 7), mat = stdMat({ vertexColors: false, color: 0xb9b6ad });
    const stones = [];
    for (let i = 0; i < 9; i++) { const t = (i + 0.3) / 9.4, x = MathUtils.lerp(door.x, end.x, t) + rr(-0.25, 0.25), z = MathUtils.lerp(door.z, end.z, t) + rr(-0.25, 0.25); stones.push([x, z]); }
    const im = new THREE.InstancedMesh(g, mat, stones.length), m4 = new THREE.Matrix4();
    stones.forEach(([x, z], i) => { m4.compose(new Vector3(x, height(x, z) + 0.02, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rng() * 6, 0)), new Vector3(rr(0.8, 1.2), 1, rr(0.8, 1.2))); im.setMatrixAt(i, m4); });
    im.receiveShadow = true; im.castShadow = true; scene.add(im);
  }
  const signPos = new Vector3(HX + front.x * 6.6 + perp.x * 2.6, 0, HZ + front.z * 6.6 + perp.z * 2.6);
  signPos.y = height(signPos.x, signPos.z);
  {
    const c = document.createElement("canvas"); c.width = 640; c.height = 320; const x = c.getContext("2d");
    x.fillStyle = "#f3dfb4"; x.fillRect(0, 0, 640, 320); x.strokeStyle = "#7a4a2e"; x.lineWidth = 14; x.strokeRect(7, 7, 626, 306);
    x.fillStyle = "#e2673f"; x.font = "700 32px Poppins, Arial, sans-serif"; x.textAlign = "center"; x.fillText("🏡  " + (SITE.nome || "Sua Corretora").toUpperCase(), 320, 82);
    x.fillStyle = "#3a2a1c"; x.font = "800 54px Poppins, Arial, sans-serif";
    const words = (SITE.slogan || "Seu sonho começa aqui").split(" "), mid = Math.ceil(words.length / 2);
    x.fillText(words.slice(0, mid).join(" "), 320, 163); x.fillText(words.slice(mid).join(" "), 320, 225);
    x.fillStyle = "#2f7a5a"; x.font = "600 28px Poppins, Arial, sans-serif"; x.fillText("Fale com a gente 💬", 320, 280);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const grp = new THREE.Group();
    const post = new THREE.Mesh(mergeGeometries([box(0.18, 2.6, 0.18, -1.2, 1.3, 0, "#6b4428"), box(0.18, 2.6, 0.18, 1.2, 1.3, 0, "#6b4428")]), stdMat());
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 0.12), [stdMat({ vertexColors: false, color: 0x7a4a2e }), stdMat({ vertexColors: false, color: 0x7a4a2e }), stdMat({ vertexColors: false, color: 0x7a4a2e }), stdMat({ vertexColors: false, color: 0x7a4a2e }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), stdMat({ vertexColors: false, color: 0x7a4a2e })]);
    board.position.set(0, 2.0, 0.07); post.castShadow = board.castShadow = true; grp.add(post, board);
    grp.position.copy(signPos); grp.rotation.y = houseAngle; scene.add(grp);
  }

  /* ---------- fumaça, folhas na correnteza, vaga-lumes, nuvens ---------- */
  const smokeTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const chimney = house.localToWorld(new Vector3(2.1, 6.7, -0.9));
  const smoke = [];
  for (let i = 0; i < 9; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, color: 0xe9e4dc })); s.userData.t = i / 9; scene.add(s); smoke.push(s); }

  const leaves = [];
  const leafIM = (() => {
    const g = new THREE.CircleGeometry(0.14, 5).rotateX(-Math.PI / 2), m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), im = new THREE.InstancedMesh(g, m, 34), c = new Color();
    const cols = ["#ff9b3d", "#ffc94d", "#e2673f", "#d8a13b"];
    for (let i = 0; i < 34; i++) { leaves.push({ z: rr(-40, 40), u: rr(-0.7, 0.7), sp: rr(1.3, 1.9), ph: rng() * 6, rot: rng() * 6 }); im.setColorAt(i, c.set(cols[i % 4])); }
    im.frustumCulled = false; scene.add(im); return im;
  })();
  const fireflies = (() => {
    const n = 80, a = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { const z = rr(-26, 26); a.set([cx(z) + rr(-9, 9), rr(0.6, 3.2), z], i * 3); s[i] = rng(); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(a, 3)); g.setAttribute("seed", new THREE.BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: U.uTime, uOpacity: { value: 0 }, uPR: { value: 1 } },
      vertexShader: `attribute float seed; uniform float uTime, uPR; varying float vA;
        void main(){ vec3 p = position; p.x += sin(uTime * 0.6 + seed * 30.0) * 0.9; p.y += sin(uTime * 0.9 + seed * 20.0) * 0.4; p.z += cos(uTime * 0.5 + seed * 17.0) * 0.9;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vA = 0.5 + 0.5 * sin(uTime * 2.0 + seed * 50.0); gl_PointSize = (60.0 * uPR) / -mv.z; }`,
      fragmentShader: `uniform float uOpacity; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard; gl_FragColor = vec4(1.0, 0.9, 0.45, smoothstep(0.5, 0.0, d) * vA * uOpacity); }`
    });
    const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); return p;
  })();
  const cloudMat = new THREE.MeshLambertMaterial({ flatShading: true, color: 0xffffff });
  const clouds = [];
  for (let i = 0; i < 8; i++) {
    const grp = new THREE.Group(), n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) { const m = new THREE.Mesh(jitterGeo(new THREE.IcosahedronGeometry(rr(2.2, 4), 0), 0.8), cloudMat); m.position.set(k * 3.2 - n * 1.6, rr(-0.6, 0.8), rr(-1.2, 1.2)); m.scale.y = 0.62; grp.add(m); }
    grp.position.set(rr(-90, 90), rr(34, 48), rr(-90, 60)); grp.userData.sp = rr(0.5, 1.2); scene.add(grp); clouds.push(grp);
  }

  /* ---------- climas: dia / entardecer / noite ---------- */
  const C = (h) => new Color(h);
  const MOODS = {
    dia: { top: C("#3b97e0"), hor: C("#cfe9f3"), sunCol: C("#fff1d6"), sunInt: 3.1, sunDir: new Vector3(0.45, 0.78, 0.38), hemiSky: C("#cfe8ff"), hemiGnd: C("#86975f"), hemiInt: 1.15, win: 0.12, stars: 0, fire: 0, shallow: C("#7ad8c8"), deep: C("#2b93ad"), exposure: 1.0, cloud: C("#ffffff"), lantern: 0, fogNear: 38 },
    entardecer: { top: C("#4a4e9c"), hor: C("#ffb571"), sunCol: C("#ff9a4d"), sunInt: 2.7, sunDir: new Vector3(-0.78, 0.26, 0.42), hemiSky: C("#ffb48a"), hemiGnd: C("#6b5a5e"), hemiInt: 0.85, win: 1.5, stars: 0.18, fire: 0.55, shallow: C("#ffb48a"), deep: C("#6a5a9a"), exposure: 1.05, cloud: C("#ffc2a1"), lantern: 28, fogNear: 30 },
    noite: { top: C("#070b24"), hor: C("#27366a"), sunCol: C("#9db8ff"), sunInt: 0.85, sunDir: new Vector3(0.3, 0.72, -0.5), hemiSky: C("#3f55a0"), hemiGnd: C("#1a2240"), hemiInt: 0.6, win: 2.4, stars: 1, fire: 1, shallow: C("#35588c"), deep: C("#0d1736"), exposure: 1.2, cloud: C("#3a4672"), lantern: 55, fogNear: 22 }
  };
  const cur = {}; Object.keys(MOODS.dia).forEach((k) => { const v = MOODS.dia[k]; cur[k] = v.clone ? v.clone() : v; });
  let moodName = "dia";
  function setMood(name, instant) {
    if (!MOODS[name]) return; moodName = name; html.setAttribute("data-mood", name);
    document.querySelectorAll("[data-mood-btn]").forEach((b) => { const on = b.dataset.moodBtn === name; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on); });
    if (instant) stepMood(99);
  }
  function stepMood(dt) {
    const k = 1 - Math.exp(-dt * 1.8), t = MOODS[moodName];
    Object.keys(t).forEach((key) => {
      const v = t[key];
      if (v.isColor) cur[key].lerp(v, k); else if (v.isVector3) { cur[key].lerp(v, k); cur[key].normalize(); } else cur[key] += (v - cur[key]) * k;
    });
    skyMat.uniforms.uTop.value.copy(cur.top); skyMat.uniforms.uHor.value.copy(cur.hor);
    skyMat.uniforms.uSunDir.value.copy(cur.sunDir); skyMat.uniforms.uSunCol.value.copy(cur.sunCol);
    scene.fog.color.copy(cur.hor); scene.fog.near = cur.fogNear;
    sun.color.copy(cur.sunCol); sun.intensity = cur.sunInt;
    sun.position.copy(sunTarget.position).addScaledVector(cur.sunDir, 80);
    hemi.color.copy(cur.hemiSky); hemi.groundColor.copy(cur.hemiGnd); hemi.intensity = cur.hemiInt;
    glowMat.emissiveIntensity = cur.win; lantern.intensity = cur.lantern;
    starMat.uniforms.uOpacity.value = cur.stars; fireflies.material.uniforms.uOpacity.value = cur.fire;
    const wu = waterMat.uniforms;
    wu.uShallow.value.copy(cur.shallow); wu.uDeep.value.copy(cur.deep); wu.uSky.value.copy(cur.top); wu.uHor.value.copy(cur.hor);
    wu.uSunDir.value.copy(cur.sunDir); wu.uSunCol.value.copy(cur.sunCol);
    cloudMat.color.copy(cur.cloud); renderer.toneMappingExposure = cur.exposure;
  }
  document.querySelectorAll("[data-mood-btn]").forEach((b) => b.addEventListener("click", () => { setMood(b.dataset.moodBtn); shadowDirty = 4; }));
  setMood("dia", true);

  /* ---------- câmera: jornada pelo scroll + exploração com órbita ---------- */
  const H = new Vector3(HX, PAD_Y, HZ);
  const keys = [
    // 0 hero: o riacho corre até a câmera, passa pela ponte e a casa aparece ao fundo
    { p: new Vector3(2.6, 4.3, 24), t: new Vector3(8.2, 1.3, -4) },
    // 1 vitrine: casa no alto da tela (os cards ficam embaixo)
    { p: new Vector3(-9, 5.0, 13), t: new Vector3(5.5, 0.6, 0) },
    // 2 vender: placa e fachada à esquerda (formulário à direita)
    { p: new Vector3(signPos.x - 8.5, 3.6, signPos.z + 8), t: new Vector3(signPos.x + 2.6, 2.3, signPos.z - 0.5) },
    // 3 financiar: a ponte sobre o riacho (card à esquerda)
    { p: new Vector3(4.4, 2.0, 19), t: new Vector3(3.2, 0.9, 8) },
    // 4 contato: vista aérea ampla
    { p: new Vector3(HX - 22, 15, HZ + 27), t: new Vector3(HX - 18, 1.0, HZ - 4) }
  ];
  const sections = Array.prototype.slice.call(document.querySelectorAll("[data-cam]"));
  const camPos = keys[0].p.clone(), lookT = keys[0].t.clone(), want = new Vector3(), wantT = new Vector3();
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, minDistance: 5, maxDistance: 58, maxPolarAngle: Math.PI * 0.485, enabled: false, autoRotateSpeed: 0.45, zoomSpeed: 0.8, rotateSpeed: 0.6 });
  controls.addEventListener("start", () => { controls.autoRotate = false; idleSince = performance.now(); });
  controls.addEventListener("end", () => { idleSince = performance.now(); });
  let explore = false, idleSince = 0;
  function setExplore(on) {
    explore = on; html.classList.toggle("explore", on); controls.enabled = on;
    if (on) { controls.target.copy(lookT); camera.position.copy(camPos); controls.update(); idleSince = performance.now(); }
    else controls.autoRotate = false;
    shadowDirty = 3;
  }
  document.querySelectorAll("[data-explore]").forEach((b) => b.addEventListener("click", () => setExplore(!explore)));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && explore) setExplore(false); });

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener("pointermove", (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  // pinos (hotspots) clicáveis no modo explorar
  const pinBox = document.getElementById("pins"), pins = [];
  [
    { label: "🏡 Imóveis em destaque", pos: new Vector3(HX, PAD_Y + 6.6, HZ), to: "#destaques" },
    { label: "🪧 Quero vender", pos: new Vector3(signPos.x, 3.5, signPos.z).addScaledVector(front, 0), to: "#vender" },
    { label: "🌉 Financiar", pos: new Vector3(cx(BZ), 2.6, BZ), to: "#financiar" }
  ].forEach((d) => {
    if (!pinBox) return;
    const a = document.createElement("a"); a.className = "pin"; a.href = d.to; a.textContent = d.label;
    a.addEventListener("click", (ev) => { ev.preventDefault(); setExplore(false); const t = document.querySelector(d.to); if (t) t.scrollIntoView({ behavior: "smooth" }); });
    pinBox.appendChild(a); pins.push({ el: a, pos: d.pos });
  });

  /* ---------- redimensionamento e qualidade adaptativa ---------- */
  function resize() {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w / h < 0.8 ? 66 : w / h < 1.2 ? 54 : 44; camera.updateProjectionMatrix();
    starMat.uniforms.uPR.value = pr; fireflies.material.uniforms.uPR.value = pr * (h / 800);
  }
  addEventListener("resize", resize); resize();
  let accT = 0, accN = 0, warm = 0;
  function adapt(dt) {
    if (dt > 0.2) return; if (++warm < 90) return;
    accT += dt; accN++;
    if (accN >= 40) {
      const avg = accT / accN;
      if (avg > 0.0215 && pr > 0.65) { pr = Math.max(0.65, pr - 0.15); renderer.setPixelRatio(pr); resize(); }
      else if (avg < 0.0135 && pr < maxPR) { pr = Math.min(maxPR, pr + 0.1); renderer.setPixelRatio(pr); resize(); }
      accT = accN = 0;
    }
  }
  const fpsEl = /[?&]fps/.test(location.search) ? Object.assign(document.body.appendChild(document.createElement("div")), { className: "fps" }) : null;
  let fpsAcc = 0, fpsN = 0;

  /* ---------- loop ---------- */
  const clock = new THREE.Clock(), m4 = new THREE.Matrix4(), tq = new THREE.Quaternion(), tv = new Vector3(), ts = new Vector3(1, 1, 1);
  let frame = 0, shadowDirty = 4, ready = false;
  const wpos = new Vector3();

  function scrollPose() {
    if (!sections.length) return [0, 0, 0];
    const tops = sections.map((s) => s.getBoundingClientRect().top);
    let i = 0;
    for (let k = 0; k < tops.length; k++) if (tops[k] <= 1) i = k;
    const next = Math.min(i + 1, keys.length - 1);
    const span = tops[i + 1] !== undefined ? tops[i + 1] - tops[i] : 0;
    const f = i === next || span <= 0 ? 0 : MathUtils.clamp(-tops[i] / span, 0, 1);
    return [i, smooth(0, 1, f), next];
  }

  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
    U.uTime.value = t; frame++;
    stepMood(dt);

    // câmera
    if (!explore) {
      const [i, f, nx] = scrollPose(), a = keys[Math.min(i, keys.length - 1)], b = keys[Math.min(nx === undefined ? i : nx, keys.length - 1)];
      want.lerpVectors(a.p, b.p, f); wantT.lerpVectors(a.t, b.t, f);
      const k = 1 - Math.exp(-dt * (reduceMotion ? 8 : 3.2));
      camPos.lerp(want, k); lookT.lerp(wantT, k);
      mouse.sx += (mouse.x - mouse.sx) * 0.05; mouse.sy += (mouse.y - mouse.sy) * 0.05;
      camera.position.copy(camPos);
      camera.lookAt(lookT);
      if (!reduceMotion) { camera.translateX(mouse.sx * 0.9); camera.translateY(-mouse.sy * 0.5); camera.lookAt(lookT); }
    } else {
      if (!controls.autoRotate && performance.now() - idleSince > 7000) controls.autoRotate = !reduceMotion;
      controls.target.x = MathUtils.clamp(controls.target.x, -34, 34); controls.target.z = MathUtils.clamp(controls.target.z, -34, 34); controls.target.y = MathUtils.clamp(controls.target.y, 0, 10);
      controls.update();
      const floor = height(camera.position.x, camera.position.z) + 1.3; if (camera.position.y < floor) camera.position.y = floor;
      camPos.copy(camera.position); lookT.copy(controls.target);
    }

    // animações
    smoke.forEach((s) => {
      const u = (s.userData.t + t * 0.12) % 1;
      s.position.set(chimney.x + u * 2.2 * U.uWind.value + Math.sin(u * 6 + s.userData.t * 9) * 0.15, chimney.y + u * 5.5, chimney.z + u * 0.8);
      const sc = 0.6 + u * 2.4; s.scale.set(sc, sc, sc); s.material.opacity = Math.sin(u * Math.PI) * 0.42;
    });
    leaves.forEach((l, i) => {
      l.z += l.sp * dt; if (l.z > 44) l.z = -44;
      const x = cx(l.z) + l.u * 2.3 + Math.sin(t * 0.9 + l.ph) * 0.15;
      tq.setFromAxisAngle(tv.set(0, 1, 0), l.rot + t * 0.4 + Math.sin(t + l.ph) * 0.5);
      m4.compose(wpos.set(x, WATER_Y + 0.06, l.z), tq, ts); leafIM.setMatrixAt(i, m4);
    });
    leafIM.instanceMatrix.needsUpdate = true;
    clouds.forEach((c) => { c.position.x += c.userData.sp * dt * (reduceMotion ? 0.2 : 1); if (c.position.x > 100) c.position.x = -100; });

    // sombras suaves: re-renderiza o mapa a cada 2 quadros
    if (shadowDirty > 0 || frame % 2 === 0) { renderer.shadowMap.needsUpdate = true; if (shadowDirty > 0) shadowDirty--; }
    renderer.render(scene, camera);

    // pinos HTML
    if (pins.length) pins.forEach((p) => {
      if (!explore) { p.el.style.opacity = 0; p.el.style.pointerEvents = "none"; return; }
      wpos.copy(p.pos).project(camera);
      const vis = wpos.z < 1 && Math.abs(wpos.x) < 1.1 && Math.abs(wpos.y) < 1.1;
      p.el.style.opacity = vis ? 1 : 0; p.el.style.pointerEvents = vis ? "auto" : "none";
      p.el.style.transform = `translate(-50%,-100%) translate(${(wpos.x * 0.5 + 0.5) * innerWidth}px, ${(-wpos.y * 0.5 + 0.5) * innerHeight}px)`;
    });

    adapt(dt);
    if (fpsEl) { fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fpsEl.textContent = Math.round(fpsN / fpsAcc) + " fps · " + pr.toFixed(2) + "x"; fpsAcc = fpsN = 0; } }
    if (!ready) { ready = true; html.classList.add("scene-ready"); window.__sceneReady = true; }
  }
  window.__scene = { setMood, setExplore, camera, renderer, scene, controls, keys, info: { HX, HZ, BZ, PAD_Y, cx } };
  tick();
}

if (webglOK()) { try { init(); } catch (e) { console.error(e); html.classList.add("nogl"); } } else html.classList.add("nogl");
