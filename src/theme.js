import * as THREE from "three";

export const THEMES = {
  islands: {
    skyTop: "#3E96EA", skyMid: "#8CCBFF", horizon: "#E9F8FF", below: "#BFE3FF", sunCol: "#FFF2D6", sunDir: [0.45, 0.62, 0.65],
    fog: "#CDEBFF", fogNear: 70, fogFar: 330, cloud: 1.0, stars: 0, nebula: 0,
    hemiSky: "#DFF2FF", hemiGround: "#9FC48A", hemiI: 1.35, sunI: 2.4,
    tileA: "#FFF1D9", tileB: "#F6E2C1", seam: "#C9A985", side: "#B98A5E", sideDark: "#8E6644", accent: "#7ED957",
    cube: ["#FF6B8B", "#FFB443", "#5BC8FF", "#8EE06A"], gravity: 22, glow: 0
  },
  cliffs: {
    skyTop: "#1F86E8", skyMid: "#71C2FF", horizon: "#DDF6FF", below: "#3BC6D0", sunCol: "#FFFFFF", sunDir: [-0.35, 0.8, 0.5],
    fog: "#BFEAF7", fogNear: 80, fogFar: 360, cloud: 0.55, stars: 0, nebula: 0,
    hemiSky: "#E8F7FF", hemiGround: "#D9B07A", hemiI: 1.4, sunI: 2.6,
    tileA: "#FFE9C7", tileB: "#F3D3A6", seam: "#C59463", side: "#D88E55", sideDark: "#A9643A", accent: "#3FD1C9",
    cube: ["#3FD1C9", "#FF7A59", "#FFD447", "#6D8BFF"], gravity: 22, glow: 0
  },
  canyon: {
    skyTop: "#33276E", skyMid: "#D2588C", horizon: "#FFB15C", below: "#A9483A", sunCol: "#FFC27A", sunDir: [0.15, 0.22, 1.0],
    fog: "#F49A72", fogNear: 120, fogFar: 420, cloud: 0.7, stars: 0.25, nebula: 0,
    hemiSky: "#FFC6A8", hemiGround: "#7A3D5E", hemiI: 1.25, sunI: 2.3,
    tileA: "#FFE0C2", tileB: "#F7C8A2", seam: "#C27A55", side: "#C8643B", sideDark: "#8F3F2A", accent: "#FF8A3C",
    cube: ["#FF5D73", "#FFB03A", "#B678FF", "#FFE066"], gravity: 22, glow: 0
  },
  space: {
    skyTop: "#05041A", skyMid: "#1A1150", horizon: "#4A2A9A", below: "#0A0828", sunCol: "#CFE3FF", sunDir: [-0.5, 0.55, 0.65],
    fog: "#1C1450", fogNear: 90, fogFar: 380, cloud: 0, stars: 1, nebula: 1,
    hemiSky: "#B9C6FF", hemiGround: "#4A2E8A", hemiI: 1.5, sunI: 2.2,
    tileA: "#E3E9FF", tileB: "#CBD5FF", seam: "#7C6CFF", side: "#5B4BC8", sideDark: "#2E2275", accent: "#3DF5FF",
    cube: ["#3DF5FF", "#FF4FD8", "#9B6CFF", "#FFE066"], gravity: 15, glow: 1
  }
};

const C = (h) => new THREE.Color(h);

export function makeSky(theme) {
  const geo = new THREE.SphereGeometry(500, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: C(theme.skyTop) }, mid: { value: C(theme.skyMid) }, hor: { value: C(theme.horizon) }, below: { value: C(theme.below) },
      sunDir: { value: new THREE.Vector3(...theme.sunDir).normalize() }, sunCol: { value: C(theme.sunCol) },
      cloud: { value: theme.cloud }, stars: { value: theme.stars }, nebula: { value: theme.nebula }, time: { value: 0 }
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      uniform vec3 top, mid, hor, below, sunDir, sunCol; uniform float cloud, stars, nebula, time; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*n2(p); p*=2.03; a*=0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 c = y > 0.0 ? mix(hor, mid, smoothstep(0.0, 0.25, y)) : mix(hor, below, smoothstep(0.0, -0.35, y));
        c = y > 0.25 ? mix(mid, top, smoothstep(0.25, 0.85, y)) : c;
        float az = atan(d.x, d.z);
        // painterly brush streaks: stretched fbm
        vec2 q = vec2(az * 3.0, y * 9.0);
        float br = fbm(q * vec2(1.0, 2.6) + vec2(time*0.004, 0.0));
        c *= 0.94 + 0.12 * br;
        // sun glow
        float sd = max(dot(d, normalize(sunDir)), 0.0);
        c += sunCol * (pow(sd, 380.0) * 2.2 + pow(sd, 22.0) * 0.24 + pow(sd, 4.0) * 0.08);
        // clouds band
        float cl = fbm(vec2(az * 2.2 + time*0.006, y * 7.0)) ;
        float band = smoothstep(-0.06, 0.06, y) * (1.0 - smoothstep(0.18, 0.5, y));
        float cm = smoothstep(0.52, 0.75, cl) * band * cloud;
        vec3 cc = mix(vec3(1.0), sunCol, 0.25) * (0.92 + 0.15 * smoothstep(0.55, 0.9, cl));
        c = mix(c, cc, cm * 0.85);
        // below-horizon cloud sea
        float cs = fbm(vec2(az * 4.0, y * 14.0 + 3.0));
        c = mix(c, vec3(1.0) * 0.97, smoothstep(0.45, 0.7, cs) * smoothstep(-0.02, -0.25, y) * cloud * 0.7);
        // nebula
        if (nebula > 0.0) {
          float nb = fbm(vec2(az * 1.6, y * 3.5) + 4.0);
          float nb2 = fbm(vec2(az * 2.4 + 9.0, y * 5.0));
          c += vec3(0.85, 0.2, 0.75) * pow(smoothstep(0.45, 0.85, nb), 1.5) * 0.65 * nebula;
          c += vec3(0.1, 0.65, 1.0) * pow(smoothstep(0.5, 0.9, nb2), 1.6) * 0.5 * nebula;
        }
        if (stars > 0.0) {
          vec2 sp = vec2(az * 120.0, y * 120.0);
          float st = step(0.996, h(floor(sp))) * smoothstep(0.0, 0.3, y + 0.2);
          c += vec3(st) * stars * (0.6 + 0.4*sin(time*2.0 + h(floor(sp))*40.0));
        }
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = -10; m.frustumCulled = false; return m;
}

// ---------- canvas textures ----------
function cv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function rnd(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function tileTexture(theme) {
  const [c, g] = cv(256, 256); const r = rnd(7);
  g.fillStyle = theme.seam; g.fillRect(0, 0, 256, 256);
  const n = 4, s = 256 / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const off = (j % 2) * s * 0.5;
    for (let k = -1; k < 1; k++) {
      const x = i * s + off + k * 256 * 0, y = j * s;
      const col = new THREE.Color(r() < 0.5 ? theme.tileA : theme.tileB); col.offsetHSL(0, 0, (r() - 0.5) * 0.05);
      g.fillStyle = "#" + col.getHexString();
      roundRect(g, x + 4, y + 4, s - 8, s - 8, 10); g.fill();
      // bevel highlight / shadow
      g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 3; roundRect(g, x + 6, y + 6, s - 12, s - 12, 8); g.stroke();
      g.fillStyle = "rgba(0,0,0,0.06)"; g.fillRect(x + 8, y + s - 14, s - 16, 6);
      // speckles
      for (let q = 0; q < 14; q++) { g.fillStyle = `rgba(120,80,40,${0.05 + r() * 0.07})`; g.beginPath(); g.arc(x + 10 + r() * (s - 20), y + 10 + r() * (s - 20), 1 + r() * 2, 0, 7); g.fill(); }
    }
  }
  // wrap the offset row
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

export function sideTexture(theme) {
  const [c, g] = cv(128, 128); const r = rnd(11);
  const grd = g.createLinearGradient(0, 0, 0, 128); grd.addColorStop(0, theme.side); grd.addColorStop(1, theme.sideDark); g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,255,255,${0.06 + r() * 0.05})`; g.fillRect(0, 10 + i * 20 + r() * 6, 128, 2); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(r() * 128, r() * 128, 2 + r() * 6, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function stripeTexture(colA, colB = "#FFFFFF") {
  const [c, g] = cv(128, 32); g.fillStyle = colB; g.fillRect(0, 0, 128, 32); g.fillStyle = colA;
  for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(i * 32, 32); g.lineTo(i * 32 + 16, 32); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 16, 0); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function marbleTexture(a, b) {
  const [c, g] = cv(512, 256); g.fillStyle = a; g.fillRect(0, 0, 512, 256);
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  for (let x = 0; x < 512; x++) for (let y = 0; y < 256; y += 2) {
    const v = Math.sin(x / 512 * Math.PI * 6 + Math.sin(y / 256 * Math.PI * 3) * 2.4 + y / 256 * 4);
    if (v > 0.55) { const k = Math.min(1, (v - 0.55) * 4); const m = ca.clone().lerp(cb, k); g.fillStyle = "#" + m.getHexString(); g.fillRect(x, y, 1, 2); }
    else if (v < -0.85) { g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(x, y, 1, 2); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function chevronTexture(col, bg) {
  const [c, g] = cv(128, 128); g.fillStyle = bg; g.fillRect(0, 0, 128, 128); g.fillStyle = col;
  for (let i = 0; i < 2; i++) { const y = 20 + i * 64; g.beginPath(); g.moveTo(14, y + 40); g.lineTo(64, y); g.lineTo(114, y + 40); g.lineTo(114, y + 58); g.lineTo(64, y + 18); g.lineTo(14, y + 58); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const BANDS = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20];
const RAINBOW = ["#FF3B4E", "#FF7A2F", "#FFB52E", "#FFE23B", "#9BE04A", "#2FD38A", "#2FC7E8", "#3F86FF", "#7A5CFF", "#D04FFF"];
export function fieldTexture() {
  const [c, g] = cv(256, 2560);
  for (let i = 0; i < 10; i++) {
    const y = 2560 - (i + 1) * 256; g.fillStyle = RAINBOW[i]; g.fillRect(0, y, 256, 256);
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(0, y, 256, 10);
    g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, y + 246, 256, 10);
    g.save(); g.translate(128, y + 128); // canvas up = far along the track; the field mesh flips u so canvas right = screen right
    g.font = "900 120px system-ui, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 14; g.strokeStyle = "rgba(0,0,0,0.25)"; g.strokeText("x" + BANDS[i], 0, 6);
    g.fillStyle = "#FFFFFF"; g.fillText("x" + BANDS[i], 0, 0); g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function iconTexture(kind) {
  const [c, g] = cv(128, 128); g.translate(64, 64);
  g.fillStyle = "#FFFFFF"; g.strokeStyle = "#FFFFFF"; g.lineWidth = 10; g.lineCap = "round"; g.lineJoin = "round";
  g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 8;
  const P = (pts) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); };
  if (kind === "boost") P([[8, -44], [-26, 6], [-2, 6], [-10, 44], [26, -8], [2, -8], [12, -44]]);
  if (kind === "shield") { g.beginPath(); g.moveTo(0, -42); g.lineTo(34, -28); g.quadraticCurveTo(34, 26, 0, 44); g.quadraticCurveTo(-34, 26, -34, -28); g.closePath(); g.fill(); }
  if (kind === "magnet") { g.lineWidth = 18; g.beginPath(); g.arc(0, -4, 26, Math.PI, 0, true); g.stroke(); g.beginPath(); g.moveTo(-26, -4); g.lineTo(-26, -34); g.moveTo(26, -4); g.lineTo(26, -34); g.stroke(); }
  if (kind === "double") { g.font = "900 64px system-ui, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("x2", 0, 4); }
  if (kind === "life") { g.beginPath(); g.moveTo(0, 38); g.bezierCurveTo(-56, -4, -28, -48, 0, -20); g.bezierCurveTo(28, -48, 56, -4, 0, 38); g.fill(); }
  if (kind === "time") { g.lineWidth = 10; g.beginPath(); g.arc(0, 4, 34, 0, 7); g.stroke(); g.beginPath(); g.moveTo(0, 4); g.lineTo(0, -18); g.moveTo(0, 4); g.lineTo(16, 12); g.stroke(); g.fillRect(-10, -44, 20, 8); }
  if (kind === "giant") { g.beginPath(); g.arc(0, 0, 36, 0, 7); g.fill(); g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(-12, -12, 9, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const PU_COLORS = { boost: "#FF8A1A", shield: "#3FB8FF", magnet: "#FF3B5C", double: "#FFC21A", life: "#FF4F8B", time: "#35D07F", giant: "#9B6CFF" };

// ---------- scenery ----------
function noiseDisplace(geo, amp, seed) {
  const r = rnd(seed); const p = geo.attributes.position; const v = new THREE.Vector3();
  const offs = []; for (let i = 0; i < 6; i++) offs.push([r() * 10, r() * 10, r() * 10, 0.3 + r() * 0.6]);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); let d = 0;
    for (const o of offs) d += Math.sin(v.x * o[3] + o[0]) * Math.sin(v.y * o[3] * 1.3 + o[1]) * Math.sin(v.z * o[3] + o[2]);
    const n = v.clone().normalize(); v.addScaledVector(n, d * amp); p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals(); return geo;
}
function stdMat(col, rough = 0.9, extra = {}) { return new THREE.MeshStandardMaterial({ color: col, roughness: rough, metalness: 0, flatShading: false, ...extra }); }

function cloudPuff(r, scale, mat) {
  const g = new THREE.Group(); const n = 5 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const s = (0.6 + r() * 0.7) * scale; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 2), mat);
    m.position.set((i - n / 2) * scale * 0.75 + r() * scale * 0.4, r() * scale * 0.35 + (i > 0 && i < n - 1 ? scale * 0.25 : 0), r() * scale * 0.5); m.scale.y = 0.75; g.add(m);
  }
  return g;
}

function floatingIsland(r, size, mats) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(size, size * 0.92, size * 0.25, 24, 1), mats.grass); top.position.y = 0; g.add(top);
  const rockGeo = noiseDisplace(new THREE.ConeGeometry(size * 0.95, size * 1.6, 20, 6), size * 0.08, Math.floor(r() * 999)); rockGeo.rotateX(Math.PI);
  const rock = new THREE.Mesh(rockGeo, mats.rock); rock.position.y = -size * 0.92; g.add(rock);
  const nt = 2 + Math.floor(r() * 4);
  for (let i = 0; i < nt; i++) {
    const a = r() * 6.28, d = r() * size * 0.7; const tr = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.03, size * 0.04, size * 0.25, 6), mats.trunk); trunk.position.y = size * 0.12; tr.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(size * (0.12 + r() * 0.08), 1), mats.leaf); crown.position.y = size * 0.32; tr.add(crown);
    tr.position.set(Math.cos(a) * d, size * 0.12, Math.sin(a) * d); g.add(tr);
  }
  if (r() < 0.5) { const wf = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.18, size * 1.4), mats.water); wf.position.set(size * 0.85, -size * 0.65, 0); wf.rotation.y = Math.PI / 2; g.add(wf); }
  return g;
}

export function buildScenery(themeId, theme, length, seed) {
  const g = new THREE.Group(); const r = rnd(seed);
  const cloudMat = new THREE.MeshLambertMaterial({ color: themeId === "canyon" ? "#FFE6D8" : "#FFFFFF", emissive: themeId === "canyon" ? "#C77A7A" : "#BFD8F0", emissiveIntensity: 0.55 });
  if (themeId === "islands") {
    const mats = { grass: stdMat("#7FD45A", 0.85), rock: stdMat("#B98A5E", 0.95), trunk: stdMat("#7A5236"), leaf: stdMat("#4FB848", 0.8), water: new THREE.MeshBasicMaterial({ color: "#DFF6FF", transparent: true, opacity: 0.8 }) };
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1; const s = 4 + r() * 12; const isl = floatingIsland(r, s, mats);
      isl.position.set(side * (s + 14 + r() * 90), -8 + r() * 22 - s * 0.3, -40 + r() * (length + 160)); isl.rotation.y = r() * 6; g.add(isl);
    }
    for (let i = 0; i < 30; i++) { const c = cloudPuff(r, 3 + r() * 6, cloudMat); const side = i % 2 ? 1 : -1; c.position.set(side * (16 + r() * 120), -38 + r() * 26, -60 + r() * (length + 200)); g.add(c); }
  }
  if (themeId === "cliffs") {
    const rockA = stdMat("#E2A66C", 0.95), rockB = stdMat("#C9864F", 0.95), grass = stdMat("#8BD65A", 0.9);
    for (let i = 0; i < 30; i++) {
      const side = i % 2 ? 1 : -1; const h = 60 + r() * 50, w = 8 + r() * 16;
      const geo = noiseDisplace(new THREE.CylinderGeometry(w * 0.8, w, h, 14, 8), w * 0.12, i * 13 + 5);
      const m = new THREE.Mesh(geo, r() < 0.5 ? rockA : rockB); m.position.set(side * (w * 1.2 + 16 + r() * 70), -80 + h / 2 - 6 + r() * 14, -60 + r() * (length + 200)); g.add(m);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.82, w * 0.82, 1.2, 14), grass); cap.position.set(m.position.x, m.position.y + h / 2, m.position.z); g.add(cap);
    }
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: "#21C4CF", roughness: 0.25, metalness: 0.1, emissive: "#0E6F8A", emissiveIntensity: 0.25 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -80; g.add(sea);
    for (let i = 0; i < 14; i++) { const c = cloudPuff(r, 3 + r() * 5, cloudMat); c.position.set((r() - 0.5) * 300, 8 + r() * 30, -60 + r() * (length + 200)); g.add(c); }
  }
  if (themeId === "canyon") {
    const cols = ["#D4673A", "#E8894A", "#B9502F"];
    const stripes = (() => { const [c, gg] = cv(64, 256); for (let y = 0; y < 256; y += 16) { gg.fillStyle = cols[(y / 16) % 3]; gg.fillRect(0, y, 64, 16); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const mesaMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.95 });
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1; const h = 40 + r() * 60, w = 10 + r() * 22;
      const geo = noiseDisplace(new THREE.CylinderGeometry(w, w * 1.15, h, 12, 6), w * 0.1, i * 7 + 3);
      const m = new THREE.Mesh(geo, mesaMat); m.position.set(side * (w * 1.3 + 16 + r() * 90), -70 + h / 2 + r() * 20, -60 + r() * (length + 220)); g.add(m);
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), stdMat("#B65A3A", 1)); floor.rotation.x = -Math.PI / 2; floor.position.y = -72; g.add(floor);
    for (let i = 0; i < 12; i++) { const c = cloudPuff(r, 4 + r() * 6, cloudMat); c.position.set((r() - 0.5) * 300, 20 + r() * 30, 40 + r() * (length + 200)); g.add(c); }
  }
  if (themeId === "space") {
    const n = 1600; const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(300 + r() * 120); pos.set([v.x, v.y, v.z + length / 2], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: "#FFFFFF", size: 1.4, sizeAttenuation: true, fog: false })));
    const bands = (() => { const [c, gg] = cv(64, 256); const pc = ["#FFB36B", "#E77A5A", "#FFD9A0", "#C9604B", "#F5A86E"]; for (let y = 0; y < 256; y += 8) { gg.fillStyle = pc[Math.floor(r() * 5)]; gg.fillRect(0, y, 64, 8); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const planet = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 32), new THREE.MeshStandardMaterial({ map: bands, roughness: 0.8, emissive: "#3A1A40", emissiveIntensity: 0.3, fog: false }));
    planet.position.set(-140, 30, length * 0.55 + 160); planet.rotation.z = 0.35; g.add(planet);
    const ring = new THREE.Mesh(new THREE.RingGeometry(78, 120, 96), new THREE.MeshBasicMaterial({ color: "#FFD9B0", transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false }));
    ring.position.copy(planet.position); ring.rotation.set(-1.25, 0.2, 0.35); g.add(ring);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 16), new THREE.MeshStandardMaterial({ color: "#9FB8FF", roughness: 0.9, emissive: "#22306A", emissiveIntensity: 0.4, fog: false }));
    moon.position.set(120, 60, length * 0.3 + 90); g.add(moon);
    const astMat = new THREE.MeshStandardMaterial({ color: "#8C83B8", roughness: 0.95, flatShading: true });
    for (let i = 0; i < 40; i++) {
      const s = 1 + r() * 4; const a = new THREE.Mesh(noiseDisplace(new THREE.IcosahedronGeometry(s, 1), s * 0.2, i), astMat);
      const side = i % 2 ? 1 : -1; a.position.set(side * (10 + r() * 60), -20 + r() * 35, -40 + r() * (length + 160)); a.rotation.set(r() * 6, r() * 6, 0); a.userData.spin = (r() - 0.5) * 0.6; g.add(a);
    }
  }
  return g;
}
