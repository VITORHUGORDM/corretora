/* ==========================================================
   Cenário 3D: um prédio de apartamentos sendo construído
   (visão de drone, noite, contornos de neon estilo planta).
   Tudo é gerado por código — nenhum arquivo de modelo.
   Edite os dados do empreendimento em js/config.js.
   ========================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const SITE = window.SITE || {};
const canvas = document.getElementById("scene");
const html = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = matchMedia("(max-width: 800px)").matches || /Mobi|Android/i.test(navigator.userAgent);

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
}

function init() {
  const { MathUtils, Vector3, Color } = THREE;
  const rng = (function (a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })(7788);
  const rr = (a, b) => a + (b - a) * rng();
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ---------- dados do empreendimento ---------- */
  const E = SITE.empreendimento || {};
  const FLOORS = MathUtils.clamp(Math.round(E.andares || 8), 4, 14);
  const FH = 3.2, BW = 12, BD = 22, LOTW = 20, LOTD = 32, ROADZ = 30;
  const BODY_H = FLOORS * FH, TOP = BODY_H + 5.4;
  const CX = -9.2, CZ = -13.6; // guindaste

  /* ---------- terreno (função de altura) ---------- */
  function height(x, z) {
    let h = Math.sin(x * 0.045 + 1) * 2.2 + Math.cos(z * 0.04) * 2.2 + Math.sin((x + z) * 0.09) + Math.sin(x * 0.17) * Math.cos(z * 0.15) * 0.5 + 2.5;
    h += smooth(60, 135, Math.hypot(x, z)) * 16;
    const fx = 1 - smooth(LOTW / 2 + 3, LOTW / 2 + 15, Math.abs(x)), fz = 1 - smooth(LOTD / 2 + 3, LOTD / 2 + 15, Math.abs(z));
    h = MathUtils.lerp(h, 0, fx * fz);
    h = MathUtils.lerp(h, 0, 1 - smooth(5, 11, Math.abs(z - ROADZ)));
    return h;
  }

  /* ---------- renderer, pós-processamento (brilho neon) ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  const maxPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  let pr = maxPR;
  renderer.setPixelRatio(pr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050b1a, 70, 280);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 700);

  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: isMobile ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 0.95);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- uniforms compartilhados ---------- */
  const U = { uTime: { value: 0 }, uWind: { value: reduceMotion ? 0.3 : 1 } };
  const BU = { uBuild: { value: 0 }, uSolid: { value: 0 }, uHi: { value: new THREE.Vector2(0, -10) }, uScan: { value: -100 }, uLit: { value: 0 } };

  /* ---------- helpers ---------- */
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
  function bar(a, b, t, hex) {
    const len = a.distanceTo(b), g = new THREE.BoxGeometry(t, t, len), o = new THREE.Object3D();
    o.position.copy(a).add(b).multiplyScalar(0.5); o.lookAt(b); o.updateMatrix(); g.applyMatrix4(o.matrix);
    return paint(g, hex);
  }
  function jitterGeo(g, a) {
    const p = g.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3);
      if (!seen.has(key)) seen.set(key, [(rng() - 0.5) * a, (rng() - 0.5) * a, (rng() - 0.5) * a]);
      const j = seen.get(key); p.setXYZ(i, p.getX(i) + j[0], p.getY(i) + j[1], p.getZ(i) + j[2]);
    }
    g.computeVertexNormals(); return g;
  }
  const stdMat = (extra) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.75, metalness: 0.05 }, extra));

  // corta a geometria acima de uSolid e adiciona o brilho da varredura de luz
  function clipStd(mat) {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uSolid: BU.uSolid, uHi: BU.uHi, uScan: BU.uScan, uTime: U.uTime });
      sh.vertexShader = "varying float vWY;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vWY = (modelMatrix * vec4(transformed, 1.0)).y;");
      sh.fragmentShader = "uniform float uSolid, uTime, uScan; uniform vec2 uHi; varying float vWY;\n" + sh.fragmentShader
        .replace("void main() {", "void main() {\n if (vWY > uSolid) discard;")
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          float hi = step(uHi.x, vWY) * step(vWY, uHi.y);
          totalEmissiveRadiance += vec3(0.05, 0.42, 1.0) * hi * (0.6 + 0.25 * sin(uTime * 3.0));
          totalEmissiveRadiance += vec3(0.1, 0.5, 1.0) * exp(-pow((vWY - uScan) * 1.1, 2.0)) * 0.9;`);
    };
    mat.customProgramCacheKey = () => "clipstd";
    return mat;
  }
  function clipDepth() {
    const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uSolid = BU.uSolid;
      sh.vertexShader = "varying float vWY;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vWY = (modelMatrix * vec4(transformed, 1.0)).y;");
      sh.fragmentShader = "uniform float uSolid; varying float vWY;\n" + sh.fragmentShader.replace("void main() {", "void main() {\n if (vWY > uSolid) discard;");
    };
    m.customProgramCacheKey = () => "clipdepth";
    return m;
  }
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
        transformed.z += (cos(uTime * 1.3 + ph * 1.2) + 0.4 * sin(uTime * 2.7 + ph)) * g * 0.7;`);
    };
    mat.customProgramCacheKey = () => "wind" + amp + "_" + pw;
    return mat;
  }

  /* ---------- luzes (noite azulada) ---------- */
  const hemi = new THREE.HemisphereLight(0x5f86c9, 0x0b1220, 1.35); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xa9c6ff, 2.1);
  moon.position.set(-38, 62, -34); moon.target.position.set(0, 0, 0); scene.add(moon, moon.target);
  const sm = isMobile ? 1024 : 2048;
  moon.castShadow = true; moon.shadow.mapSize.set(sm, sm);
  Object.assign(moon.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 190 });
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.06; moon.shadow.radius = 3;
  const glowA = new THREE.PointLight(0x2f9bff, 0, 46, 2); glowA.position.set(0, 3, 17); scene.add(glowA);
  const glowB = new THREE.PointLight(0x35c8ff, 0, 40, 2); glowB.position.set(0, 4, -17); scene.add(glowB);

  /* ---------- céu e estrelas ---------- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new Color(0x01040c) }, uHor: { value: new Color(0x0b1c40) }, uMoon: { value: new Vector3(-0.38, 0.5, -0.78).normalize() } },
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; }",
    fragmentShader: `
      uniform vec3 uTop, uHor, uMoon; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float t = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(uHor, uTop, pow(t, 0.45));
        float s = max(dot(d, uMoon), 0.0);
        col += vec3(0.55, 0.72, 1.0) * (pow(s, 1400.0) * 3.0 + pow(s, 22.0) * 0.14);
        col = mix(col, uHor * 0.6, smoothstep(0.0, -0.25, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), skyMat); sky.frustumCulled = false; sky.renderOrder = -2; scene.add(sky);
  {
    const n = 650, a = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { const u = rng(), t = rng() * 6.283, y = 0.06 + u * 0.94, r = Math.sqrt(1 - y * y); a[i * 3] = r * Math.cos(t); a[i * 3 + 1] = y; a[i * 3 + 2] = r * Math.sin(t); s[i] = rng(); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(a, 3)); g.setAttribute("seed", new THREE.BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, uniforms: { uTime: U.uTime, uPR: { value: 1 } },
      vertexShader: "attribute float seed; uniform float uTime, uPR; varying float vA; void main(){ vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; vA = 0.5 + 0.5 * sin(uTime * (1.0 + seed * 2.0) + seed * 40.0); gl_PointSize = (1.3 + seed * 2.0) * uPR; }",
      fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard; gl_FragColor = vec4(vec3(0.85, 0.92, 1.0), vA * 0.8 * smoothstep(0.5, 0.1, d)); }"
    });
    window.__starMat = m;
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -1; scene.add(p);
  }

  /* ---------- terreno escuro, lote e estrada ---------- */
  {
    const SIZE = 300, SEG = isMobile ? 110 : 150, cell = SIZE / SEG;
    let g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + (rng() - 0.5) * cell * 0.5, z = p.getZ(i) + (rng() - 0.5) * cell * 0.5; p.setXYZ(i, x, height(x, z), z); }
    g = g.toNonIndexed(); g.deleteAttribute("uv"); g.computeVertexNormals();
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const veg = ["#0e2a1e", "#12351f", "#0a2118", "#16391f", "#1a3a24"].map((h) => new Color(h)), dirt = new Color("#2b2217"), asph = new Color("#12151c"), lot = new Color("#1d2430"), tmp = new Color();
    for (let i = 0; i < pos.count; i += 3) {
      const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      tmp.copy(veg[Math.floor(rng() * veg.length)]);
      const dl = Math.max(Math.abs(x) - LOTW / 2, Math.abs(z) - LOTD / 2);
      if (dl < 0) tmp.copy(lot);
      else if (dl < 7) tmp.lerp(dirt, 0.85 * smooth(7, 1, dl));
      if (Math.abs(z - ROADZ) < 3.8) tmp.copy(asph);
      else if (Math.abs(z - ROADZ) < 5.2) tmp.lerp(dirt, 0.7);
      const k = 0.9 + rng() * 0.2;
      for (let j = 0; j < 3; j++) { col[(i + j) * 3] = tmp.r * k; col[(i + j) * 3 + 1] = tmp.g * k; col[(i + j) * 3 + 2] = tmp.b * k; }
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })); m.receiveShadow = true; scene.add(m);
  }

  /* ---------- linhas neon (lote, medidas, estrutura) ---------- */
  function lineMat(int, base, col) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uBuild: BU.uBuild, uSolid: BU.uSolid, uTime: U.uTime, uLen: { value: 1e5 }, uInt: { value: int }, uBase: { value: base }, uCol: { value: col || new Color(0.22, 0.62, 1.0) }, uAll: { value: 0 } },
      vertexShader: "attribute float d; varying float vY; varying float vD; void main(){ vY = (modelMatrix * vec4(position, 1.0)).y; vD = d; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `
        uniform float uBuild, uSolid, uTime, uLen, uInt, uBase, uAll; uniform vec3 uCol; varying float vY; varying float vD;
        void main(){
          if (uAll < 0.5 && vY > uBuild) discard;
          if (vD > uLen) discard;
          float wire = uAll > 0.5 ? 1.0 : step(uSolid, vY);
          float band = uAll > 0.5 ? 0.0 : exp(-pow((vY - uBuild) * 0.8, 2.0)) * 2.2;
          float pulse = 0.5 + 0.5 * sin(vY * 0.5 - uTime * 2.0);
          float k = mix(uBase * (0.65 + 0.5 * pulse), uInt, wire) + band;
          gl_FragColor = vec4(uCol * k, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
  }
  function segLines(pts, mat) {
    const pos = [], d = []; let acc = 0;
    for (let i = 0; i < pts.length; i += 2) {
      const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z); d.push(acc, acc + len); acc += len;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("d", new THREE.Float32BufferAttribute(d, 1));
    const l = new THREE.LineSegments(g, mat); l.frustumCulled = false; scene.add(l); return { line: l, total: acc };
  }
  const V = (x, y, z) => new Vector3(x, y, z);
  const rectPts = (w, dd, y) => { const a = V(-w / 2, y, -dd / 2), b = V(w / 2, y, -dd / 2), c = V(w / 2, y, dd / 2), e = V(-w / 2, y, dd / 2); return [a, b, b, c, c, e, e, a]; };

  // contorno do lote (duas linhas, como na referência) + marcações de medida
  const lotMat = lineMat(1.7, 1.7, new Color(0.45, 0.8, 1.0)); lotMat.uniforms.uAll.value = 1;
  const lotPts = [].concat(rectPts(LOTW, LOTD, 0.08), rectPts(LOTW + 1.6, LOTD + 1.6, 0.08));
  const mz = -LOTD / 2 - 3.6, mx = -LOTW / 2 - 3.6;
  lotPts.push(V(-LOTW / 2 - 0.8, 0.08, mz), V(-2.2, 0.08, mz), V(2.2, 0.08, mz), V(LOTW / 2 + 0.8, 0.08, mz));
  lotPts.push(V(mx, 0.08, -LOTD / 2 - 0.8), V(mx, 0.08, -2.2), V(mx, 0.08, 2.2), V(mx, 0.08, LOTD / 2 + 0.8));
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { const x = sx * (LOTW / 2 + 0.8), z = sz * (LOTD / 2 + 0.8); lotPts.push(V(x, 0.08, z), V(x + sx * 3, 0.08, z), V(x, 0.08, z), V(x, 0.08, z + sz * 3)); });
  const lot = segLines(lotPts, lotMat);

  // estrutura do prédio (andares, colunas e janelas em fio)
  const wirePts = [];
  const faceBays = (n, len) => Array.from({ length: n }, (_, k) => -len / 2 + (len / n) * (k + 0.5));
  for (let f = 0; f <= FLOORS; f++) wirePts.push(...rectPts(BW + 0.8, BD + 0.8, f * FH));
  [-BW / 2, BW / 2].forEach((x) => [-BD / 2, BD / 2].forEach((z) => wirePts.push(V(x, 0, z), V(x, BODY_H, z))));
  for (let k = 1; k < 5; k++) { const z = -BD / 2 + (BD / 5) * k; wirePts.push(V(-BW / 2, 0, z), V(-BW / 2, BODY_H, z), V(BW / 2, 0, z), V(BW / 2, BODY_H, z)); }
  for (let f = 0; f < FLOORS; f++) {
    const y0 = f * FH + 0.7, y1 = f * FH + 2.4;
    faceBays(5, BD).forEach((z) => [-1, 1].forEach((s) => { const x = s * (BW / 2 + 0.06), a = z - 1.3, b = z + 1.3; wirePts.push(V(x, y0, a), V(x, y0, b), V(x, y1, a), V(x, y1, b), V(x, y0, a), V(x, y1, a), V(x, y0, b), V(x, y1, b)); }));
    faceBays(3, BW).forEach((x) => [-1, 1].forEach((s) => { const z = s * (BD / 2 + 0.06), a = x - 1.3, b = x + 1.3; wirePts.push(V(a, y0, z), V(b, y0, z), V(a, y1, z), V(b, y1, z), V(a, y0, z), V(a, y1, z), V(b, y0, z), V(b, y1, z)); }));
  }
  const bt = BODY_H + 0.35; // casa de máquinas e platibanda
  wirePts.push(...rectPts(BW + 0.8, BD + 0.8, bt + 0.9));
  [[2, -5, 4.5, 2.6, 4.5], [-3, 5, 3.2, 2.4, 3.2]].forEach(([x, z, w, h, d]) => { const r = rectPts(w, d, bt).map((p) => p.clone().add(V(x, 0, z))), r2 = rectPts(w, d, bt + h).map((p) => p.clone().add(V(x, 0, z))); wirePts.push(...r, ...r2); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => wirePts.push(V(x + sx * w / 2, bt, z + sz * d / 2), V(x + sx * w / 2, bt + h, z + sz * d / 2))); });
  wirePts.push(V(3, bt, 6), V(3, TOP + 0.4, 6));
  const bLines = segLines(wirePts, lineMat(1.25, 0.4));

  /* ---------- grade da planta no chão do lote ---------- */
  const gridMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uTime: U.uTime, uReveal: { value: 0 } },
    vertexShader: "varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform float uTime, uReveal; varying vec2 vP;
      float gl(vec2 p, float s){ vec2 q = p / s; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - min(min(g.x, g.y), 1.0); }
      void main(){
        float l1 = gl(vP, 1.0), l5 = gl(vP, 5.0);
        float R = uReveal * 32.0; float m = 1.0 - smoothstep(R - 6.0, R, length(vP));
        float foot = step(abs(vP.x), 6.0) * step(abs(vP.y), 11.0);
        float wave = 0.5 + 0.5 * sin(length(vP) * 0.45 - uTime * 2.2);
        vec3 c = vec3(0.08, 0.42, 1.0) * (l1 * 0.2 + l5 * 0.6 + 0.04 + foot * 0.09 * (0.55 + 0.45 * wave));
        gl_FragColor = vec4(c * m, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(LOTW, LOTD).rotateX(-Math.PI / 2), gridMat); m.position.y = 0.05; m.renderOrder = 3; scene.add(m); }

  /* ---------- o prédio ---------- */
  const building = new THREE.Group(); scene.add(building);
  {
    const parts = [], wins = [];
    const SLAB = "#f2f6ff", WALL = "#cfd9ea", COL = "#aab8d1", GLASS = "#8fc4ff";
    const addWin = (w, h, d, x, y, z, lobby) => {
      const g = paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), rng() < 0.38 ? "#4ab4ff" : "#ffb85a");
      const c = g.attributes.color; for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * 1.8, c.getY(i) * 1.8, c.getZ(i) * 1.8);
      const r = lobby ? 0 : rng(), a = new Float32Array(g.attributes.position.count).fill(r);
      g.setAttribute("aRand", new THREE.BufferAttribute(a, 1)); wins.push(g);
    };
    for (let f = 0; f < FLOORS; f++) {
      const y0 = f * FH;
      parts.push(box(BW + 0.8, 0.35, BD + 0.8, 0, y0 + 0.175, 0, SLAB), box(BW, FH - 0.35, BD, 0, y0 + 0.35 + (FH - 0.35) / 2, 0, WALL, 0.04));
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => parts.push(box(0.5, FH - 0.35, 0.5, sx * BW / 2, y0 + 0.35 + (FH - 0.35) / 2, sz * BD / 2, COL))));
      faceBays(5, BD).forEach((z, k) => [-1, 1].forEach((s) => {
        addWin(0.08, 1.7, 2.6, s * (BW / 2 + 0.04), y0 + 1.55, z, false);
        if (f > 0 && (k === 1 || k === 3)) parts.push(box(1.5, 0.18, 2.8, s * (BW / 2 + 0.75), y0 + 0.09, z, SLAB), box(0.06, 0.95, 2.8, s * (BW / 2 + 1.47), y0 + 0.66, z, GLASS));
      }));
      faceBays(3, BW).forEach((x, k) => [-1, 1].forEach((s) => { if (f === 0 && s === 1) return; addWin(2.6, 1.7, 0.08, x, y0 + 1.55, s * (BD / 2 + 0.04), false); }));
    }
    addWin(8.4, 2.3, 0.1, 0, 1.55, BD / 2 + 0.05, true);
    parts.push(box(10, 0.22, 2.6, 0, 2.95, BD / 2 + 1.3, SLAB), box(0.2, 2.95, 0.2, -4.7, 1.47, BD / 2 + 2.4, COL), box(0.2, 2.95, 0.2, 4.7, 1.47, BD / 2 + 2.4, COL));
    const rt0 = BODY_H;
    parts.push(box(BW + 0.8, 0.35, BD + 0.8, 0, rt0 + 0.175, 0, SLAB));
    [[0, -(BD / 2 + 0.2), BW + 0.8, 0.3], [0, BD / 2 + 0.2, BW + 0.8, 0.3]].forEach(([x, z, w, d]) => parts.push(box(w, 0.9, d, x, rt0 + 0.8, z, SLAB)));
    [-(BW / 2 + 0.2), BW / 2 + 0.2].forEach((x) => parts.push(box(0.3, 0.9, BD + 0.8, x, rt0 + 0.8, 0, SLAB)));
    parts.push(box(4.5, 2.6, 4.5, 2, rt0 + 0.35 + 1.3, -5, WALL), box(3.2, 2.4, 3.2, -3, rt0 + 0.35 + 1.2, 5, COL));
    parts.push(paint(new THREE.CylinderGeometry(1.2, 1.2, 1.8, 10).translate(-3, rt0 + 0.35 + 2.4 + 0.9, 5), "#8a97ad"));
    parts.push(box(0.12, 4.4, 0.12, 3, rt0 + 0.35 + 2.2, 6, "#d8e2f5"));
    for (let i = 0; i < 3; i++) parts.push(box(1.6, 0.8, 1.0, -3.5 + i * 2.0, rt0 + 0.75, -8, "#9fb0c8"));

    const sg = mergeGeometries(parts), wg = mergeGeometries(wins);
    const solid = new THREE.Mesh(sg, clipStd(stdMat({ roughness: 0.55, metalness: 0.1 })));
    solid.castShadow = solid.receiveShadow = true; solid.customDepthMaterial = clipDepth(); solid.frustumCulled = false; building.add(solid);

    const wm = new THREE.MeshBasicMaterial({ vertexColors: true });
    wm.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uSolid: BU.uSolid, uLit: BU.uLit, uHi: BU.uHi, uTime: U.uTime });
      sh.vertexShader = "attribute float aRand; varying float vR; varying float vWY;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vR = aRand; vWY = (modelMatrix * vec4(transformed, 1.0)).y;");
      sh.fragmentShader = "uniform float uSolid, uLit, uTime; uniform vec2 uHi; varying float vR; varying float vWY;\n" + sh.fragmentShader
        .replace("void main() {", "void main() {\n if (vWY > uSolid) discard;")
        .replace("#include <color_fragment>", `#include <color_fragment>
          float lit = step(vR, uLit);
          diffuseColor.rgb = mix(vec3(0.012, 0.035, 0.08), diffuseColor.rgb, lit);
          float hi = step(uHi.x, vWY) * step(vWY, uHi.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.25, 0.9, 2.6), hi * (0.7 + 0.2 * sin(uTime * 3.0)));`);
    };
    wm.customProgramCacheKey = () => "wins";
    const wmesh = new THREE.Mesh(wg, wm); wmesh.frustumCulled = false; building.add(wmesh);

    // preenchimento holográfico (entre o sólido e a frente da construção)
    const holo = new THREE.Mesh(sg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uBuild: BU.uBuild, uSolid: BU.uSolid, uTime: U.uTime },
      vertexShader: "varying vec3 vN; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: `
        uniform float uBuild, uSolid, uTime; varying vec3 vN; varying vec3 vW;
        void main(){
          if (vW.y > uBuild || vW.y < uSolid) discard;
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW))), 2.0);
          float stripes = 0.5 + 0.5 * sin(vW.y * 7.0 - uTime * 3.0);
          float band = smoothstep(uBuild - 1.6, uBuild, vW.y);
          vec3 c = vec3(0.06, 0.38, 1.0) * (0.12 + f * 0.6 + stripes * 0.08) + vec3(0.4, 0.85, 1.0) * band * 1.2;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }));
    holo.frustumCulled = false; holo.renderOrder = 4; building.add(holo);
  }

  /* ---------- canteiro: contêineres, paletes ---------- */
  {
    const parts = [];
    [[-6.5, 13.4, "#2f6fb0"], [-2.2, 13.4, "#c8552d"], [3.4, 13.8, "#2f6fb0"]].forEach(([x, z, c]) => { parts.push(box(5.6, 2.5, 2.3, x, 1.25, z, c, 0.08), box(5.7, 0.12, 2.4, x, 2.56, z, "#1a2233")); });
    for (let i = 0; i < 5; i++) parts.push(box(1.6, 0.25 + (i % 3) * 0.3, 1.1, 7 + (i % 2) * 1.8, 0.2 + (i % 3) * 0.15, 12 + Math.floor(i / 2) * 1.5, "#b08a55", 0.2));
    for (let i = 0; i < 4; i++) parts.push(paint(new THREE.ConeGeometry(0.28, 0.7, 8).translate(-8 + i * 1.2, 0.35, 15.4), "#ff7a2e"));
    const m = new THREE.Mesh(mergeGeometries(parts), stdMat({ roughness: 0.8 })); m.castShadow = m.receiveShadow = true; scene.add(m);
  }

  /* ---------- guindaste de torre ---------- */
  const crane = new THREE.Group(); crane.position.set(CX, 0, CZ); scene.add(crane);
  const topG = new THREE.Group(); const MH = 42; topG.position.y = MH; crane.add(topG);
  let hookG, trolleyG, cable, beacon;
  {
    const Y = "#f2a81d", D = "#d98a0c", S = 0.9, parts = [];
    [[-S, -S], [S, -S], [S, S], [-S, S]].forEach(([x, z]) => parts.push(box(0.3, MH, 0.3, x, MH / 2, z, Y)));
    for (let y = 0; y < MH; y += 2.8) {
      parts.push(box(2 * S, 0.12, 0.12, 0, y, -S, Y), box(2 * S, 0.12, 0.12, 0, y, S, Y), box(0.12, 0.12, 2 * S, -S, y, 0, Y), box(0.12, 0.12, 2 * S, S, y, 0, Y));
      parts.push(bar(V(-S, y, -S), V(S, y + 2.8, -S), 0.1, D), bar(V(S, y, S), V(-S, y + 2.8, S), 0.1, D), bar(V(-S, y, S), V(-S, y + 2.8, -S), 0.1, D), bar(V(S, y, -S), V(S, y + 2.8, S), 0.1, D));
    }
    const mast = new THREE.Mesh(mergeGeometries(parts), stdMat({ roughness: 0.6, metalness: 0.2 })); mast.castShadow = true; crane.add(mast);

    const jp = [];
    jp.push(box(0.26, 0.26, 32, -0.7, 0, 14, Y), box(0.26, 0.26, 32, 0.7, 0, 14, Y), box(0.26, 0.26, 32, 0, 1.5, 14, Y));
    for (let z = -2; z < 29; z += 2.2) { jp.push(bar(V(-0.7, 0, z), V(0, 1.5, z + 1.1), 0.09, D), bar(V(0, 1.5, z + 1.1), V(0.7, 0, z + 2.2), 0.09, D), box(1.4, 0.09, 0.09, 0, 0, z, Y)); }
    jp.push(box(0.26, 0.26, 12, -0.7, 0, -7, Y), box(0.26, 0.26, 12, 0.7, 0, -7, Y), box(2.6, 1.8, 2.6, 0, 0.3, -10, "#6b7a90"), box(1.8, 1.8, 1.6, 0, 0.3, -12, "#6b7a90"));
    jp.push(box(1.5, 1.7, 1.5, 1.6, 0.9, 1.6, "#e9eef7"), box(1.3, 0.8, 0.05, 1.6, 1.1, 2.4, "#6ab4ff"));
    jp.push(box(0.3, 7, 0.3, 0, 4, -0.4, Y), bar(V(0, 7.4, -0.4), V(0, 1.5, 28), 0.07, "#cfd6e4"), bar(V(0, 7.4, -0.4), V(0, 0.4, -12), 0.07, "#cfd6e4"));
    const jib = new THREE.Mesh(mergeGeometries(jp), stdMat({ roughness: 0.6, metalness: 0.2 })); jib.castShadow = true; topG.add(jib);

    trolleyG = new THREE.Group(); topG.add(trolleyG);
    const trolley = new THREE.Mesh(box(1.1, 0.5, 1.2, 0, -0.5, 0, "#333b4a"), stdMat()); trolleyG.add(trolley);
    cable = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.06), new THREE.MeshBasicMaterial({ color: 0x9fb0c8 })); trolleyG.add(cable);
    hookG = new THREE.Group(); trolleyG.add(hookG);
    hookG.add(new THREE.Mesh(mergeGeometries([box(0.5, 0.6, 0.5, 0, 0, 0, "#d93a2f"), box(3.2, 0.4, 1.4, 0, -0.9, 0, "#8b97ab"), box(0.05, 1.2, 0.05, -1.3, -0.3, 0, "#444"), box(0.05, 1.2, 0.05, 1.3, -0.3, 0, "#444")]), stdMat()));
    beacon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: new Color(3.5, 0.2, 0.2) })); beacon.position.set(0, 7.6, -0.4); topG.add(beacon);
  }
  crane.visible = false;

  /* ---------- vizinhança escura, postes, árvores ---------- */
  const keepClear = (x, z) => (Math.abs(x) < LOTW / 2 + 7 && Math.abs(z) < LOTD / 2 + 7) || Math.abs(z - ROADZ) < 9;
  {
    const parts = [];
    [[-40, -10, 14, 10, 8], [-48, 16, 10, 16, 6], [42, -12, 16, 10, 9], [46, 12, 12, 12, 6], [-32, -44, 18, 10, 7], [30, -44, 14, 14, 11], [2, -56, 26, 10, 6], [64, -38, 14, 12, 7], [-66, -30, 12, 12, 9], [-60, 42, 16, 10, 5], [58, 46, 16, 12, 7]].forEach(([x, z, w, d, h]) => {
      parts.push(box(w, h, d, x, h / 2, z, "#25344b", 0.1), box(w + 0.6, 0.4, d + 0.6, x, h + 0.2, z, "#3a4d6a"));
      for (let i = 0; i < 3; i++) parts.push(box(1.4, 0.7, 0.1, x - w / 3 + i * (w / 3), h * 0.55, z + d / 2 + 0.05, "#7fb4ff"));
    });
    const m = new THREE.Mesh(mergeGeometries(parts), stdMat({ roughness: 0.9 })); m.castShadow = m.receiveShadow = true; scene.add(m);
    // detalhes que brilham (bloom)
    const gl = [];
    [[-40, -10, 14, 10, 8], [42, -12, 16, 10, 9], [30, -44, 14, 14, 11], [-32, -44, 18, 10, 7]].forEach(([x, z, w, d, h]) => gl.push(box(w - 1, 0.15, 0.15, x, h + 0.5, z + d / 2, "#ffffff")));
    paintGlow(gl, new Color(0.5, 1.3, 2.6));
    for (let x = -80; x <= 80; x += 14) { const g = box(0.3, 0.3, 1.4, x, 6.2, ROADZ - 5.6, "#ffffff"); gl.push(g); }
    paintGlow(gl.slice(4), new Color(1.8, 1.9, 2.4));
  }
  function paintGlow(list, c) {
    if (!list.length) return;
    list.forEach((g) => { const a = g.attributes.color; for (let i = 0; i < a.count; i++) a.setXYZ(i, c.r, c.g, c.b); });
    const m = new THREE.Mesh(mergeGeometries(list), new THREE.MeshBasicMaterial({ vertexColors: true })); scene.add(m);
  }
  {
    const poles = []; for (let x = -80; x <= 80; x += 14) poles.push(box(0.18, 6.2, 0.18, x, 3.1, ROADZ - 5.6, "#2a3345"), box(0.18, 0.18, 1.5, x, 6.15, ROADZ - 5.0, "#2a3345"));
    scene.add(new THREE.Mesh(mergeGeometries(poles), stdMat()));
  }
  {
    const pine = mergeGeometries([paint(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6).translate(0, 0.75, 0), "#2b2118"), paint(new THREE.ConeGeometry(1.7, 2.3, 7).translate(0, 2.2, 0), "#14402a", 0.2), paint(new THREE.ConeGeometry(1.3, 2.1, 7).translate(0, 3.5, 0), "#195033", 0.2), paint(new THREE.ConeGeometry(0.9, 1.9, 7).translate(0, 4.7, 0), "#1e5e3b", 0.2)]);
    const round = mergeGeometries([paint(new THREE.CylinderGeometry(0.22, 0.32, 2.2, 6).translate(0, 1.1, 0), "#33261b"), paint(jitterGeo(new THREE.IcosahedronGeometry(1.7, 0), 0.4).translate(0, 3.2, 0), "#1c4a2a", 0.2), paint(jitterGeo(new THREE.IcosahedronGeometry(1.2, 0), 0.4).translate(0.9, 2.6, 0.4), "#23572f", 0.2)]);
    const spots = [];
    for (let k = 0; k < 900 && spots.length < (isMobile ? 80 : 150); k++) {
      const a = rng() * 6.283, r = 22 + Math.pow(rng(), 0.8) * 110, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (keepClear(x, z) || spots.some((s) => Math.hypot(s.x - x, s.z - z) < 4)) continue;
      spots.push({ x, z, y: height(x, z), s: rr(0.9, 1.7), t: rng() < 0.6 });
    }
    const mat = windPatch(stdMat({ roughness: 0.9 }), 0.0095, 1.5), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new Color();
    [[true, pine], [false, round]].forEach(([isPine, geo]) => {
      const list = spots.filter((s) => s.t === isPine), im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((s, i) => { q.setFromEuler(new THREE.Euler(0, rng() * 6.28, 0)); m4.compose(new Vector3(s.x, s.y - 0.1, s.z), q, new Vector3(s.s, s.s * rr(0.9, 1.25), s.s)); im.setMatrixAt(i, m4); const v = rr(0.8, 1.2); im.setColorAt(i, c.setRGB(v, v, v)); });
      im.castShadow = true; scene.add(im);
    });
  }

  /* ---------- caminhões na estrada ---------- */
  const trucks = [];
  [[1, -1.6, "#2f4058"], [-1, 1.8, "#58412f"]].forEach(([dir, lz, col], i) => {
    const g = new THREE.Group(), body = mergeGeometries([box(5.2, 1.9, 2.2, 0, 1.5, -1, col), box(1.9, 1.5, 2.1, 0, 1.3, 2.1, "#d9dfe9"), box(1.7, 0.7, 0.05, 0, 1.7, 3.17, "#6ab4ff")]);
    g.add(Object.assign(new THREE.Mesh(body, stdMat()), { castShadow: true }));
    [[-1, 2.9], [1, 2.9], [-1, 0], [1, 0], [-1, -2.4], [1, -2.4]].forEach(([sx, z]) => { const w = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 10).rotateZ(Math.PI / 2), "#0b0e14"), stdMat()); w.position.set(sx * 1.1, 0.45, z - 0.2); g.add(w); });
    const hl = mergeGeometries([box(0.45, 0.3, 0.1, -0.7, 0.9, 3.17, "#fff"), box(0.45, 0.3, 0.1, 0.7, 0.9, 3.17, "#fff")]);
    const hc = hl.attributes.color; for (let k = 0; k < hc.count; k++) hc.setXYZ(k, 3.2, 3.0, 2.4);
    g.add(new THREE.Mesh(hl, new THREE.MeshBasicMaterial({ vertexColors: true })));
    const tl = box(1.8, 0.2, 0.05, 0, 1.0, -2.1, "#f00"); const tc = tl.attributes.color; for (let k = 0; k < tc.count; k++) tc.setXYZ(k, 3, 0.1, 0.1);
    g.add(new THREE.Mesh(tl, new THREE.MeshBasicMaterial({ vertexColors: true })));
    g.position.set(i ? 60 : -60, 0, ROADZ + lz); g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(g); trucks.push({ g, dir, sp: 7 + i * 2.5 });
  });

  /* ---------- pulsos no chão, poeira, drones ---------- */
  const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new Color(0.25, 0.8, 2.2), fog: false })); m.position.y = 0.1; m.frustumCulled = false; scene.add(m); return m; });
  const dust = (() => {
    const n = 280, a = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { a.set([rr(-LOTW, LOTW), rr(0, 40), rr(-LOTD, LOTD)], i * 3); s[i] = rng(); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(a, 3)); g.setAttribute("seed", new THREE.BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: U.uTime, uPR: { value: 1 }, uOp: { value: 0 } },
      vertexShader: "attribute float seed; uniform float uTime, uPR; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y + uTime * (0.8 + seed * 1.6), 44.0); p.x += sin(uTime * 0.5 + seed * 30.0) * 1.2; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vA = smoothstep(0.0, 6.0, p.y) * smoothstep(44.0, 30.0, p.y); gl_PointSize = (90.0 * uPR) / -mv.z; }",
      fragmentShader: "uniform float uOp; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard; gl_FragColor = vec4(0.3, 0.75, 1.0, smoothstep(0.5, 0.0, d) * vA * 0.55 * uOp); }"
    });
    const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); return p;
  })();
  const drones = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: new Color(0.5, 1.6, 3.2) })); scene.add(m); return { m, ph: i * 2.1, r: 26 + i * 6, h: 22 + i * 5, sp: 0.22 + i * 0.07 }; });

  /* ---------- rótulos HTML (medidas e pinos) ---------- */
  const dimsBox = document.getElementById("dims"), pinBox = document.getElementById("pins");
  const labels = [], pins = [];
  const mkLabel = (txt, pos, cls) => { if (!dimsBox) return; const e = document.createElement("div"); e.className = "dim " + (cls || ""); e.textContent = txt; dimsBox.appendChild(e); labels.push({ el: e, pos }); };
  mkLabel(LOTW + " m", V(0, 0.4, mz - 1.8)); mkLabel(LOTD + " m", V(mx - 2.2, 0.4, 0));
  mkLabel(FLOORS + " andares · " + (BODY_H).toFixed(1).replace(".", ",") + " m", V(BW / 2 + 2, TOP + 3, BD / 2), "dim--sm");
  function setExploreFromPin(to) { setExplore(false); const t = document.querySelector(to); if (t) t.scrollIntoView({ behavior: "smooth" }); }
  [
    { label: "🏢 Imóveis em destaque", pos: V(0, TOP + 1.5, 0), to: "#destaques" },
    { label: "💬 Fale com a gente", pos: V(0, 2, LOTD / 2 + 2.5), to: "#contato" },
    { label: "🏗️ Quanto vale o seu?", pos: V(CX, MH + 6, CZ), to: "#vender" }
  ].forEach((d) => {
    if (!pinBox) return;
    const a = document.createElement("a"); a.className = "pin"; a.href = d.to; a.textContent = d.label;
    a.addEventListener("click", (ev) => { ev.preventDefault(); setExploreFromPin(d.to); });
    pinBox.appendChild(a); pins.push({ el: a, pos: d.pos });
  });

  /* ---------- construção: linha do tempo ---------- */
  const build = { p: 0, playing: false, t0: 0, dur: reduceMotion ? 0.01 : 11 };
  let bp = 0, bpT = 0; // modo blueprint
  const hud = { box: document.getElementById("hud"), p: document.getElementById("hudP"), bar: document.querySelector("#hudBar u"), t: document.getElementById("hudT") };
  function play() { build.playing = true; build.p = 0; build.t0 = clock.elapsedTime; shadowDirty = 4; }
  document.querySelectorAll("[data-replay]").forEach((b) => b.addEventListener("click", () => { if (explore) setExplore(false); play(); }));
  document.querySelectorAll("[data-blueprint]").forEach((b) => b.addEventListener("click", () => { bpT = bpT ? 0 : 1; b.classList.toggle("is-on", !!bpT); b.setAttribute("aria-pressed", !!bpT); shadowDirty = 4; }));

  function applyBuild(t) {
    const p = build.p, lag = 5, H = TOP;
    lotMat.uniforms.uLen.value = lot.total * smooth(0.0, 0.2, p) * 1.02;
    gridMat.uniforms.uReveal.value = smooth(0.02, 0.32, p);
    const q = smooth(0.16, 0.93, p), wire = Math.min(H, q * (H + lag)), solid = Math.max(0, q * (H + lag) - lag);
    BU.uBuild.value = p >= 1 ? H + 20 : wire;
    BU.uSolid.value = (p >= 1 ? H + 20 : solid) * (1 - bp);
    BU.uLit.value = smooth(0.9, 1.0, p) * 0.9 * (1 - bp);
    const done = p >= 1 && bp < 0.5;
    BU.uScan.value = done ? ((t * 0.1) % 1.5) * (H + 14) - 4 : -100;
    glowA.intensity = glowB.intensity = 36 * smooth(0.2, 0.7, p);
    dust.material.uniforms.uOp.value = smooth(0.1, 0.5, p);
    const cs = smooth(0.04, 0.16, p); crane.visible = cs > 0.001; crane.scale.set(1, cs, 1);
    rings.forEach((r, i) => { const u = (t * 0.17 + i * 0.5) % 1, s = 6 + u * 50, a = p >= 1 ? 1 : 0; r.scale.set(s, 1, s); r.material.opacity = (1 - u) * (1 - u) * 0.85 * a; r.visible = a > 0; });
    if (hud.box) {
      hud.bar.style.width = Math.round(p * 100) + "%"; hud.p.textContent = Math.round(p * 100) + "%";
      hud.t.textContent = p >= 1 ? (E.entrega ? "Entrega " + E.entrega : "Obra concluída") : "Obra em andamento";
      hud.box.classList.toggle("is-done", p >= 1);
    }
  }

  /* ---------- câmera: jornada guiada pelo scroll + exploração ---------- */
  const keys = [
    { p: V(12, 40, 80), t: V(-20, 10, 0) },    // 0 hero: visão de drone, prédio à direita
    { p: V(-40, 12, 42), t: V(-7, 16, 0) },    // 1 vitrine: fachada vista de baixo
    { p: V(40, 32, -40), t: V(4, 20, -4) },    // 2 cotação: guindaste e topo (card à direita)
    { p: V(0, 32, 78), t: V(-30, 10, 0) }      // 3 contato: vista geral, tudo aceso
  ];
  // tela vertical (celular): texto em cima/cards embaixo, prédio centralizado
  const keysM = [
    { p: V(8, 34, 95), t: V(-2, 27, 0) },
    { p: V(-40, 14, 46), t: V(0, 0, 0) },
    { p: V(46, 34, -46), t: V(0, 6, -4) },
    { p: V(0, 34, 90), t: V(0, 0, 0) }
  ];
  const KS = () => (camera.aspect < 0.8 ? keysM : keys);
  const sections = Array.prototype.slice.call(document.querySelectorAll("[data-cam]"));
  const camPos = keys[0].p.clone(), lookT = keys[0].t.clone(), want = new Vector3(), wantT = new Vector3(), tmpP = new Vector3(), tmpT = new Vector3();
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, minDistance: 14, maxDistance: 130, maxPolarAngle: Math.PI * 0.49, enabled: false, autoRotateSpeed: 0.5, rotateSpeed: 0.6, zoomSpeed: 0.8 });
  controls.addEventListener("start", () => { controls.autoRotate = false; idleSince = performance.now(); });
  controls.addEventListener("end", () => { idleSince = performance.now(); });
  let explore = false, idleSince = 0;
  function setExplore(on) {
    explore = on; html.classList.toggle("explore", on); controls.enabled = on;
    if (on) { controls.target.copy(lookT); camera.position.copy(camPos); controls.update(); idleSince = performance.now(); } else controls.autoRotate = false;
    shadowDirty = 3;
  }
  document.querySelectorAll("[data-explore]").forEach((b) => b.addEventListener("click", () => setExplore(!explore)));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && explore) setExplore(false); });
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener("pointermove", (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  function scrollPose() {
    if (!sections.length) return [0, 0, 0];
    const tops = sections.map((s) => s.getBoundingClientRect().top);
    let i = 0; for (let k = 0; k < tops.length; k++) if (tops[k] <= 1) i = k;
    const next = Math.min(i + 1, keys.length - 1), span = tops[i + 1] !== undefined ? tops[i + 1] - tops[i] : 0;
    const f = i === next || span <= 0 ? 0 : MathUtils.clamp(-tops[i] / span, 0, 1);
    return [i, smooth(0, 1, f), next];
  }
  function keyAt(idx) { const ks = KS(); return ks[Math.min(idx, ks.length - 1)]; }

  /* ---------- redimensionamento e qualidade adaptativa ---------- */
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false); composer.setPixelRatio(pr); composer.setSize(w, h);
    camera.aspect = w / h; camera.fov = w / h < 0.8 ? 64 : w / h < 1.2 ? 52 : 42; camera.updateProjectionMatrix();
    window.__starMat.uniforms.uPR.value = pr; dust.material.uniforms.uPR.value = pr * (h / 800);
  }
  addEventListener("resize", resize); resize();
  let accT = 0, accN = 0, warm = 0;
  function adapt(dt) {
    if (dt > 0.2 || ++warm < 100) return;
    accT += dt; accN++;
    if (accN >= 40) {
      const avg = accT / accN;
      if (avg > 0.0215) { if (pr > 0.7) { pr = Math.max(0.7, pr - 0.15); resize(); } else if (bloom.enabled) bloom.enabled = false; }
      else if (avg < 0.0135 && pr < maxPR) { pr = Math.min(maxPR, pr + 0.1); resize(); }
      accT = accN = 0;
    }
  }
  const fpsEl = /[?&]fps/.test(location.search) ? Object.assign(document.body.appendChild(document.createElement("div")), { className: "fps" }) : null;
  let fpsAcc = 0, fpsN = 0;

  /* ---------- loop ---------- */
  const clock = new THREE.Clock(), wp = new Vector3();
  let frame = 0, shadowDirty = 4, ready = false, startAt = 0;
  const yawBase = Math.atan2(0 - CX, 0 - CZ);

  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
    U.uTime.value = t; frame++;

    if (build.playing) {
      const u = MathUtils.clamp((t - build.t0) / build.dur, 0, 1);
      build.p = u * 0.75 + smooth(0, 1, u) * 0.25; if (u >= 1) { build.p = 1; build.playing = false; }
    }
    bp += (bpT - bp) * (1 - Math.exp(-dt * 3));
    if (Math.abs(bp - bpT) < 0.002) bp = bpT;
    applyBuild(t);

    const [i, f, nx] = scrollPose(), active = f > 0.5 ? nx : i;
    if (html.dataset.sec !== String(active)) html.dataset.sec = String(active);

    // câmera
    if (!explore) {
      const a = keyAt(i), ap = a.p, at = a.t, b = keyAt(nx);
      want.lerpVectors(ap, b.p, f); wantT.lerpVectors(at, b.t, f);
      const k = 1 - Math.exp(-dt * (reduceMotion ? 8 : 3.2));
      camPos.lerp(want, k); lookT.lerp(wantT, k);
      mouse.sx += (mouse.x - mouse.sx) * 0.05; mouse.sy += (mouse.y - mouse.sy) * 0.05;
      const off = tmpP.copy(camPos).sub(lookT), yaw = reduceMotion ? 0 : Math.sin(t * 0.12) * 0.1;
      off.applyAxisAngle(V(0, 1, 0), yaw); camera.position.copy(lookT).add(off); camera.lookAt(lookT);
      if (!reduceMotion) { camera.translateX(mouse.sx * 1.2); camera.translateY(-mouse.sy * 0.7); camera.lookAt(lookT); }
    } else {
      if (!controls.autoRotate && performance.now() - idleSince > 7000) controls.autoRotate = !reduceMotion;
      controls.target.x = MathUtils.clamp(controls.target.x, -40, 40); controls.target.z = MathUtils.clamp(controls.target.z, -40, 40); controls.target.y = MathUtils.clamp(controls.target.y, 0, 32);
      controls.update();
      const fl = height(camera.position.x, camera.position.z) + 1.6; if (camera.position.y < fl) camera.position.y = fl;
      camPos.copy(camera.position); lookT.copy(controls.target);
    }

    // animações da obra
    if (crane.visible) {
      topG.rotation.y = yawBase + (reduceMotion ? 0 : Math.sin(t * 0.18) * 1.0);
      const tz = 15 + Math.sin(t * 0.5) * 8, len = 9 + (0.5 + 0.5 * Math.sin(t * 0.7)) * 14;
      trolleyG.position.set(0, 0, tz); cable.scale.y = len; cable.position.y = -len / 2 - 0.5; hookG.position.y = -len - 0.8; hookG.rotation.z = Math.sin(t * 1.3) * 0.05;
      const bl = 0.5 + 0.5 * Math.sin(t * 4); beacon.scale.setScalar(0.5 + bl);
    }
    trucks.forEach((tr) => { tr.g.position.x += tr.dir * tr.sp * dt; if (tr.g.position.x > 70) tr.g.position.x = -70; if (tr.g.position.x < -70) tr.g.position.x = 70; tr.g.position.y = Math.sin(t * 9 + tr.sp) * 0.02; });
    drones.forEach((d) => { const a = t * d.sp + d.ph; d.m.position.set(Math.cos(a) * d.r, d.h + Math.sin(t * 0.8 + d.ph) * 1.5, Math.sin(a) * d.r); d.m.scale.setScalar(0.7 + 0.5 * (0.5 + 0.5 * Math.sin(t * 6 + d.ph))); d.m.visible = build.p > 0.6; });

    if (shadowDirty > 0 || frame % 2 === 0) { renderer.shadowMap.needsUpdate = true; if (shadowDirty > 0) shadowDirty--; }
    composer.render();

    // rótulos HTML
    const proj = (obj, vis, shown) => {
      wp.copy(obj.pos).project(camera);
      const ok = shown && wp.z < 1 && Math.abs(wp.x) < 1.1 && Math.abs(wp.y) < 1.1;
      obj.el.style.opacity = ok ? vis : 0; obj.el.style.pointerEvents = ok && obj.el.tagName === "A" ? "auto" : "none";
      obj.el.style.transform = `translate(-50%,-100%) translate(${(wp.x * 0.5 + 0.5) * innerWidth}px, ${(-wp.y * 0.5 + 0.5) * innerHeight}px)`;
    };
    const showDims = explore || active === 0;
    labels.forEach((l) => proj(l, smooth(0.25, 0.4, build.p), showDims));
    pins.forEach((p) => proj(p, 1, explore));

    adapt(dt);
    if (fpsEl) { fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fpsEl.textContent = Math.round(fpsN / fpsAcc) + " fps · " + pr.toFixed(2) + "x" + (bloom.enabled ? " · bloom" : ""); fpsAcc = fpsN = 0; } }
    if (!ready) { ready = true; startAt = t + 0.6; html.classList.add("scene-ready"); window.__sceneReady = true; }
    else if (startAt && t >= startAt) { startAt = 0; play(); }
  }
  window.__scene = { setExplore, play, camera, renderer, scene, controls, keys, build, info: { FLOORS, FH, BW, BD, TOP, LOTW, LOTD } };
  tick();
}

if (webglOK()) { try { init(); } catch (e) { console.error(e); html.classList.add("nogl"); } } else html.classList.add("nogl");
