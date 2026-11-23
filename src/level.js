import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { THEMES, tileTexture, sideTexture, stripeTexture, chevronTexture, fieldTexture, iconTexture, PU_COLORS, buildScenery, BANDS, coinTexture, coinGeometry } from "./theme.js";

export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const LEVEL_IDS = ["islands", "cliffs", "canyon", "space"];
// beat scripts per level: type[:powerup]
const SCRIPTS = [
  ["c:boost", "w", "c", "c:magnet", "g", "o", "w", "c:double", "h", "c", "h", "o"],
  ["c", "h", "c:shield", "o", "h", "w", "c:time", "g", "h:magnet", "c", "H", "g", "c:double"],
  ["c:giant", "s", "w", "w", "c", "s:life", "g", "c:time", "h", "s", "g:double", "h", "c:boost"],
  ["c:shield", "H", "s", "g", "w:giant", "c:time", "s", "h", "g", "c:life", "H", "w", "s", "c:double", "g"]
];
// rails per world and beat type (true = railed)
function railFor(level, type, i) {
  if (level === 0) return type !== "o";
  if (level === 1) return type === "c" ? i % 2 === 0 : type === "w";
  if (level === 2) return !(type === "s" || type === "g" || type === "o");
  return type === "w";
}
export const LEVELS_PER_WORLD = 6, TOTAL_LEVELS = LEVEL_IDS.length * LEVELS_PER_WORLD;
const POOLS = [
  ["c", "w", "g", "h", "c", "o"],
  ["c", "h", "w", "g", "H", "o", "h"],
  ["c", "s", "w", "g", "h", "s"],
  ["c", "H", "s", "g", "w", "h", "s"]
];
const PU_KINDS = [["boost", "magnet", "double"], ["boost", "magnet", "double", "shield", "time"], ["boost", "magnet", "double", "shield", "time", "life", "giant"], ["boost", "magnet", "double", "shield", "time", "life", "giant"]];
const BEAT_LEN = (P) => ({ c: 20, w: 18, g: 14 + P.gapLen, h: 18, H: 26, s: 18, o: 18 });
// script for a stage: the first stage of each world is the authored script, later stages are generated from the world's pool
export function scriptFor(stage) {
  const world = Math.floor(stage / LEVELS_PER_WORLD), sub = stage % LEVELS_PER_WORLD;
  if (sub === 0) return SCRIPTS[world].slice();
  const rand = mulberry32(5000 + stage * 131);
  const n = SCRIPTS[world].length + Math.min(5, sub);
  const pool = POOLS[world], kinds = PU_KINDS[world];
  const out = []; let run = 0;
  for (let i = 0; i < n; i++) {
    let t;
    if (i === 0) t = "c";
    else if (run >= 2) t = "c";
    else { t = pool[Math.floor(rand() * pool.length)]; if (t === out[out.length - 1]) t = pool[Math.floor(rand() * pool.length)]; }
    run = t === "c" || t === "o" ? 0 : run + 1;
    out.push(t);
  }
  // power-ups: every third beat, a clock bubble near the middle of longer levels
  for (let i = 1; i < out.length; i += 3) out[i] += ":" + kinds[Math.floor(rand() * kinds.length)];
  if (world >= 1) { const m = Math.floor(out.length / 2); out[m] = out[m].split(":")[0] + ":time"; }
  return out;
}
export function scriptLength(stage, P) { const L = BEAT_LEN(P); return scriptFor(stage).reduce((a, tok) => a + L[tok.split(":")[0]], 0); }

export function createLevel(stage, P, seed, envMap) {
  const levelIndex = Math.floor(stage / LEVELS_PER_WORLD), sub = stage % LEVELS_PER_WORLD;
  const themeId = LEVEL_IDS[levelIndex], theme = THEMES[themeId];
  const rand = mulberry32(seed + stage * 77);
  const step = Math.pow(P.stageScale, levelIndex + sub * 0.12);
  const w = Math.max(2.4, P.trackWidth * Math.pow(0.95, levelIndex) * (1 - 0.012 * sub));
  const root = new THREE.Group();
  const L = { themeId, theme, levelIndex, stage, sub, w, root, pieces: [], railSpans: [], hammers: [], sweepers: [], walls: [], pads: [], gaps: [], coins: [], pus: [], checkpoints: [0], beats: [], gravity: theme.gravity };

  // ----- beats -> layout -----
  const script = scriptFor(stage);
  let z = 0; const spans = []; // {z0,z1,rail,gap}
  spans.push({ z0: -6, z1: 18, rail: true }); z = 18;
  const coinRows = []; const puList = [];
  script.forEach((tok, i) => {
    const [type, pu] = tok.split(":"); const rail = railFor(levelIndex, type, i);
    const len = BEAT_LEN(P)[type];
    L.checkpoints.push(z); L.beats.push({ type, z, len });
    if (type === "c" || type === "o") {
      const n = 7, phase = rand() * 6.28, amp = type === "o" ? 0 : w * 0.28;
      for (let k = 0; k < n; k++) coinRows.push([z + 3 + k * 2, Math.sin(phase + k * 0.7) * amp, 0.55]);
      spans.push({ z0: z, z1: z + len, rail });
    } else if (type === "w") {
      L.walls.push({ z: z + 10, intact: true }); spans.push({ z0: z, z1: z + len, rail });
      for (let k = 0; k < 3; k++) coinRows.push([z + 13 + k * 1.6, 0, 0.55]);
    } else if (type === "g") {
      const padZ = z + 4, g0 = z + 5.5, g1 = z + 5.5 + P.gapLen;
      L.pads.push({ z: padZ }); L.gaps.push({ z0: g0, z1: g1 });
      spans.push({ z0: z, z1: g0, rail }); spans.push({ z0: g1, z1: z + len, rail, after: true });
      // coin arc over the gap
      for (let k = 0; k < 5; k++) { const f = (k + 1) / 6; coinRows.push([padZ + 1 + f * (g1 - padZ + 1), 0, 0.6 + Math.sin(f * Math.PI) * 2.2]); }
    } else if (type === "h") {
      L.hammers.push({ z: z + 9, phase: rand() * 6.28, period: P.hammerPeriod / step }); spans.push({ z0: z, z1: z + len, rail });
      coinRows.push([z + 14, 0, 0.55], [z + 15.5, 0, 0.55]);
    } else if (type === "H") {
      const ph = rand() * 6.28;
      L.hammers.push({ z: z + 8, phase: ph, period: P.hammerPeriod / step }); L.hammers.push({ z: z + 17, phase: ph + Math.PI * 0.5, period: P.hammerPeriod / step });
      spans.push({ z0: z, z1: z + len, rail });
    } else if (type === "s") {
      L.sweepers.push({ z: z + 9, phase: rand() * 6.28, dir: rand() < 0.5 ? 1 : -1 }); spans.push({ z0: z, z1: z + len, rail });
      coinRows.push([z + 4, -w * 0.28, 0.55], [z + 14, w * 0.28, 0.55]);
    }
    if (pu) puList.push({ z: z + (type === "g" ? 2 : len * 0.55), u: type === "c" ? (rand() < 0.5 ? -1 : 1) * w * 0.22 : 0, kind: pu });
    z += len;
  });
  spans.push({ z0: z, z1: z + 14, rail: true }); z += 14;
  L.rampZ = z; L.rampLen = 14; L.rampH = 3.6; L.rampEnd = z + 14; L.rampW = Math.max(w, 3.8);
  L.fieldZ0 = L.rampEnd; L.bandLen = P.bandLen; L.fieldLen = 10 * P.bandLen; L.fieldW = 7; L.fieldEnd = L.fieldZ0 + L.fieldLen;
  L.length = L.rampZ;
  L.timeFactor = Math.max(1, scriptLength(stage, P) / scriptLength(levelIndex * LEVELS_PER_WORLD, P));

  // ----- center line -----
  const p1 = rand() * 6.28, p2 = rand() * 6.28, A = 2.2 + levelIndex * 0.5;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const cxRaw = (zz) => A * (Math.sin(zz * 0.021 + p1) + 0.6 * Math.sin(zz * 0.047 + p2)) * ss(10, 40, zz) * (1 - ss(L.rampZ - 50, L.rampZ - 10, zz));
  const c0 = cxRaw(L.rampZ); // constant after the window (0)
  L.cx = (zz) => cxRaw(zz);
  L.frame = (zz, out = {}) => { const x = L.cx(zz), d = (L.cx(zz + 0.05) - L.cx(zz - 0.05)) / 0.1; const n = Math.hypot(d, 1); out.x = x; out.tx = d / n; out.tz = 1 / n; out.nx = -1 / n; out.nz = d / n; return out; };
  const fr = {};
  L.P = (zz, u, y, out = new THREE.Vector3()) => { L.frame(zz, fr); return out.set(fr.x + u * fr.nx, y, zz + u * fr.nz); };
  L.yaw = (zz) => { L.frame(zz, fr); return Math.atan2(fr.tx, fr.tz); };

  // merge spans into pieces (contiguous), track rails separately
  const pieces = []; let cur = null;
  for (const s of spans) { if (cur && Math.abs(cur.z1 - s.z0) < 1e-6) cur.z1 = s.z1; else { cur = { z0: s.z0, z1: s.z1, w }; pieces.push(cur); } }
  L.pieces = pieces;
  for (const s of spans) if (s.rail) { const last = L.railSpans[L.railSpans.length - 1]; if (last && Math.abs(last.z1 - s.z0) < 1e-6) last.z1 = s.z1; else L.railSpans.push({ z0: s.z0, z1: s.z1 }); }

  L.railAt = function (zz) { for (const r of L.railSpans) if (zz >= r.z0 && zz <= r.z1) return true; return false; };
  // ----- materials -----
  const tileTex = tileTexture(theme), sideTex = sideTexture(theme);
  const topMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.62, metalness: 0.0, envMap, envMapIntensity: 0.35 });
  const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.9, emissive: theme.glow ? theme.accent : "#000000", emissiveIntensity: theme.glow ? 0.12 : 0 });
  L.mats = { topMat, sideMat };

  // ----- strip builder -----
  function strip(z0, z1, ww, yfn, depth, top, side, uvScale = 3.2) {
    const b = 0.12, prof = [[-ww / 2, -depth], [-ww / 2, -b], [-ww / 2 + b, 0], [ww / 2 - b, 0], [ww / 2, -b], [ww / 2, -depth]];
    const strips = [[0, 1, 1], [1, 2, 1], [2, 3, 0], [3, 4, 1], [4, 5, 1], [5, 0, 1]];
    const zs = []; for (let q = z0; q < z1; q += 0.75) zs.push(q); zs.push(z1);
    const pos = [[], []], uv = [[], []]; const v = new THREE.Vector3(), v2 = new THREE.Vector3();
    for (const [a, bI, grp] of strips) {
      const pa = prof[a], pb = prof[bI];
      for (let i = 0; i < zs.length - 1; i++) {
        const za = zs[i], zb = zs[i + 1]; const ya = yfn(za), yb = yfn(zb);
        const A0 = L.P(za, pa[0], ya + pa[1], new THREE.Vector3()), B0 = L.P(za, pb[0], ya + pb[1], new THREE.Vector3());
        const A1 = L.P(zb, pa[0], yb + pa[1], new THREE.Vector3()), B1 = L.P(zb, pb[0], yb + pb[1], new THREE.Vector3());
        const tri = [A0, B0, A1, B0, B1, A1];
        const uvs = grp === 0
          ? [[pa[0] / uvScale, za / uvScale], [pb[0] / uvScale, za / uvScale], [pa[0] / uvScale, zb / uvScale], [pb[0] / uvScale, za / uvScale], [pb[0] / uvScale, zb / uvScale], [pa[0] / uvScale, zb / uvScale]]
          : [[za / 4, pa[1] + pa[0] * 0.3], [za / 4, pb[1] + pb[0] * 0.3], [zb / 4, pa[1] + pa[0] * 0.3], [za / 4, pb[1] + pb[0] * 0.3], [zb / 4, pb[1] + pb[0] * 0.3], [zb / 4, pa[1] + pa[0] * 0.3]];
        tri.forEach((p) => pos[grp].push(p.x, p.y, p.z)); uvs.forEach((t) => uv[grp].push(t[0], t[1]));
      }
    }
    // caps
    for (const [zc, dirSign] of [[z0, -1], [z1, 1]]) {
      const yc = yfn(zc); const pts = prof.map((p) => L.P(zc, p[0], yc + p[1], new THREE.Vector3()));
      for (let i = 1; i < pts.length - 1; i++) {
        let a = pts[0], bb = pts[i], c = pts[i + 1];
        v.subVectors(bb, a); v2.subVectors(c, a); const nrm = v.clone().cross(v2); L.frame(zc, fr);
        if ((nrm.x * fr.tx + nrm.z * fr.tz) * dirSign < 0) { const t = bb; bb = c; c = t; }
        [a, bb, c].forEach((p) => { pos[1].push(p.x, p.y, p.z); uv[1].push(p.x * 0.25, p.y * 0.25); });
      }
    }
    const g = new THREE.BufferGeometry(); const all = pos[0].concat(pos[1]), allUv = uv[0].concat(uv[1]);
    g.setAttribute("position", new THREE.Float32BufferAttribute(all, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(allUv, 2));
    g.addGroup(0, pos[0].length / 3, 0); g.addGroup(pos[0].length / 3, pos[1].length / 3, 1); g.computeVertexNormals();
    const m = new THREE.Mesh(g, [top, side]); m.receiveShadow = true; m.castShadow = false; return m;
  }
  const flat = () => 0;
  for (const pc of pieces) root.add(strip(pc.z0, pc.z1, w, flat, 0.8, topMat, sideMat));

  // ----- rails -----
  const railTex = stripeTexture(P.railColor);
  L.railMats = [];
  const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.55, 8); postGeo.translate(0, 0.27, 0);
  const postMat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.35, envMap, envMapIntensity: 0.6 });
  const posts = [];
  function railLine(z0, z1, u, y, rad, list) {
    const pts = []; for (let q = z0; q <= z1 + 0.01; q += 1.5) pts.push(L.P(Math.min(q, z1), u, y)); if (pts.length < 2) return;
    const curve = new THREE.CatmullRomCurve3(pts); const segs = Math.max(4, Math.floor((z1 - z0) / 0.8));
    const tex = railTex.clone(); tex.needsUpdate = true; tex.repeat.set((z1 - z0) / 0.7, 1);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0, envMap, envMapIntensity: 0.7 });
    L.railMats.push(mat);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, rad, 10, false), mat); tube.castShadow = true; root.add(tube);
    for (let q = z0 + 0.4; q < z1; q += 2.0) list.push(L.P(q, u, y - 0.55));
  }
  for (const rs of L.railSpans) for (const s of [-1, 1]) railLine(rs.z0, rs.z1, s * (w / 2 - 0.07), 0.55, 0.085, posts);
  // ramp + field rails
  const rampY = (zz) => { const s = Math.min(1, Math.max(0, (zz - L.rampZ) / L.rampLen)); return L.rampH * s * s; };
  L.rampY = rampY;
  // pass-by studs along open edges (speed read)
  const studs = [];
  for (const pc of pieces) for (let q = pc.z0 + 1; q < pc.z1 - 0.5; q += 3) if (!L.railAt(q)) { studs.push(L.P(q, w / 2 - 0.18, 0.02)); studs.push(L.P(q, -w / 2 + 0.18, 0.02)); }
  // ----- ramp -----
  const chev = chevronTexture("#FFFFFF", "#FFB52E"); chev.repeat.set(1, 1);
  const rampTop = new THREE.MeshStandardMaterial({ map: chev, roughness: 0.45, emissive: "#FF9A1A", emissiveIntensity: 0.25, envMap, envMapIntensity: 0.5 });
  const rampMesh = strip(L.rampZ, L.rampEnd, L.rampW, rampY, 1.2, rampTop, sideMat, L.rampW);
  root.add(rampMesh); L.rampMesh = rampMesh;
  for (const s of [-1, 1]) {
    const pts = []; for (let q = L.rampZ; q <= L.rampEnd + 0.01; q += 1) pts.push(L.P(q, s * (L.rampW / 2 - 0.07), rampY(q) + 0.55));
    const tex = railTex.clone(); tex.needsUpdate = true; tex.repeat.set(20, 1);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, envMap, envMapIntensity: 0.7 }); L.railMats.push(mat);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.1, 10), mat));
    for (let q = L.rampZ + 0.5; q < L.rampEnd; q += 2) posts.push(L.P(q, s * (L.rampW / 2 - 0.07), rampY(q)));
  }
  // ----- landing field -----
  const fTex = fieldTexture();
  const fMat = new THREE.MeshStandardMaterial({ map: fTex, roughness: 0.4, envMap, envMapIntensity: 0.4, emissive: "#FFFFFF", emissiveMap: fTex, emissiveIntensity: 0.18 });
  const fGeo = new THREE.BoxGeometry(L.fieldW, 0.6, L.fieldLen); fGeo.translate(0, -0.3, L.fieldLen / 2);
  // box uv: top face uses full map; rotate mapping so v runs along +z
  const field = new THREE.Mesh(fGeo, [sideMat, sideMat, fMat, sideMat, sideMat, sideMat]);
  const fUv = fGeo.attributes.uv; // top face is group index 2 (+y), vertices 8..11
  for (let i = 8; i < 12; i++) { const px = fGeo.attributes.position.getX(i), pz = fGeo.attributes.position.getZ(i); fUv.setXY(i, 0.5 - px / L.fieldW, pz / L.fieldLen); }
  field.position.copy(L.P(L.fieldZ0, 0, 0)); field.rotation.y = L.yaw(L.fieldZ0); field.receiveShadow = true; root.add(field); L.fieldMesh = field;
  for (const s of [-1, 1]) {
    const tex = railTex.clone(); tex.needsUpdate = true; tex.repeat.set(L.fieldLen / 0.7, 1);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, envMap, envMapIntensity: 0.7 }); L.railMats.push(mat);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, L.fieldLen, 10), mat); t.rotation.x = Math.PI / 2;
    t.position.copy(L.P(L.fieldZ0 + L.fieldLen / 2, s * (L.fieldW / 2 - 0.08), 0.45)); root.add(t);
    for (let q = L.fieldZ0 + 0.5; q < L.fieldEnd; q += 2) posts.push(L.P(q, s * (L.fieldW / 2 - 0.08), -0.1));
  }
  // finale arch at x20
  const arch = new THREE.Group();
  const archMat = new THREE.MeshStandardMaterial({ color: "#FFD23F", roughness: 0.25, metalness: 0.6, emissive: "#FF9A00", emissiveIntensity: 0.35, envMap });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(L.fieldW / 2 + 0.2, 0.22, 12, 40, Math.PI), archMat); arch.add(torus);
  const star = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), archMat); star.position.y = L.fieldW / 2 + 0.9; arch.add(star); L.archStar = star;
  arch.position.copy(L.P(L.fieldEnd - L.bandLen * 0.5, 0, 0)); arch.rotation.y = L.yaw(L.fieldEnd); root.add(arch); L.arch = arch;
  // posts instanced
  const allPosts = posts.concat([]);
  const postIM = new THREE.InstancedMesh(postGeo, postMat, allPosts.length); const mtx = new THREE.Matrix4();
  allPosts.forEach((p, i) => { mtx.makeTranslation(p.x, p.y, p.z); postIM.setMatrixAt(i, mtx); }); root.add(postIM);
  if (studs.length) {
    const sg = new THREE.CylinderGeometry(0.1, 0.12, 0.06, 10); const sm = new THREE.MeshStandardMaterial({ color: theme.accent, emissive: theme.accent, emissiveIntensity: 0.5, roughness: 0.4 });
    const sIM = new THREE.InstancedMesh(sg, sm, studs.length); studs.forEach((p, i) => { mtx.makeTranslation(p.x, p.y + 0.03, p.z); sIM.setMatrixAt(i, mtx); }); root.add(sIM);
  }

  // ----- hammers -----
  const hammerHeadMat = new THREE.MeshStandardMaterial({ color: P.hazardColor, roughness: 0.35, metalness: 0.1, envMap, envMapIntensity: 0.6 });
  const goldMat = new THREE.MeshStandardMaterial({ color: "#FFCF4A", roughness: 0.25, metalness: 0.8, envMap, envMapIntensity: 1.0 });
  const woodMat = new THREE.MeshStandardMaterial({ color: "#8A5A35", roughness: 0.7 });
  const frameMat = new THREE.MeshStandardMaterial({ color: "#F4F4F8", roughness: 0.4, envMap, envMapIntensity: 0.5 });
  L.hazardMats = [hammerHeadMat];
  for (const h of L.hammers) {
    const g = new THREE.Group(); g.position.copy(L.P(h.z, 0, 0)); g.rotation.y = L.yaw(h.z);
    const pivotY = 5.2, Lr = 4.4; h.pivotY = pivotY; h.Lr = Lr; h.amp = 1.15;
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, pivotY + 1.6, 10), frameMat); post.position.set(s * (w / 2 + 0.45), pivotY / 2 - 0.8, 0); post.castShadow = true; g.add(post); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 1.3, 0.32, 0.32), frameMat); beam.position.y = pivotY + 0.1; g.add(beam);
    const pivot = new THREE.Group(); pivot.position.y = pivotY; g.add(pivot);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, Lr, 8), woodMat); arm.position.y = -Lr / 2; arm.castShadow = true; pivot.add(arm);
    const head = new THREE.Group(); head.position.y = -Lr; pivot.add(head);
    const hm = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.55, 24), hammerHeadMat); hm.rotation.z = Math.PI / 2; hm.castShadow = true; head.add(hm);
    for (const s of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.08, 8, 24), goldMat); ring.rotation.y = Math.PI / 2; ring.position.x = s * 0.6; head.add(ring); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 20), goldMat); cap.rotation.z = Math.PI / 2; cap.position.x = s * 0.8; head.add(cap); }
    h.group = g; h.pivot = pivot; h.head = head; h.broken = false; h.flyV = null; root.add(g);
  }
  L.hammerAngle = (h, t) => h.amp * Math.sin((Math.PI * 2 * t) / h.period + h.phase);
  L.hammerHead = (h, t) => { const a = L.hammerAngle(h, t); return { u: -h.Lr * Math.sin(a), y: h.pivotY - h.Lr * Math.cos(a), a }; };

  // ----- sweepers -----
  const sweepTex = stripeTexture("#FFFFFF", P.hazardColor);
  const sweepMat = new THREE.MeshStandardMaterial({ map: sweepTex, roughness: 0.3, envMap, envMapIntensity: 0.6 });
  L.sweepMat = sweepMat;
  for (const s of L.sweepers) {
    const g = new THREE.Group(); g.position.copy(L.P(s.z, 0, 0)); g.rotation.y = L.yaw(s.z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 1.0, 16), goldMat); post.position.y = 0.5; post.castShadow = true; g.add(post);
    const bar = new THREE.Group(); bar.position.y = 0.42; g.add(bar);
    s.Lb = w / 2 + 0.15;
    const bg = new THREE.BoxGeometry(s.Lb, 0.34, 0.34); bg.translate(s.Lb / 2, 0, 0);
    const bm = new THREE.Mesh(bg, sweepMat); bm.castShadow = true; bar.add(bm);
    sweepTex.repeat.set(s.Lb / 0.7, 1);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), goldMat); tip.position.x = s.Lb; bar.add(tip);
    s.group = g; s.bar = bar; s.broken = false; root.add(g);
  }
  L.sweepAngle = (s, t, rpm) => s.phase + s.dir * (rpm * Math.PI * 2 / 60) * step * t;

  // ----- cube walls -----
  const cubeMats = theme.cube.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.18, metalness: 0, envMap, envMapIntensity: 0.9 }));
  for (const wl of L.walls) {
    const cols = 4, rows = 3, cs = w / cols; wl.cs = cs; wl.h = rows * cs; wl.cubes = [];
    const geo = new RoundedBoxGeometry(cs * 0.96, cs * 0.96, cs * 0.96, 3, cs * 0.12);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const m = new THREE.Mesh(geo, cubeMats[(r + c) % cubeMats.length]); const u = -w / 2 + cs / 2 + c * cs;
      m.position.copy(L.P(wl.z, u, cs / 2 + r * cs)); m.rotation.y = L.yaw(wl.z); m.castShadow = true; m.receiveShadow = true;
      root.add(m); wl.cubes.push({ m, v: new THREE.Vector3(), spin: new THREE.Vector3(), u, row: r });
    }
  }
  // ----- pads -----
  const padTex = chevronTexture("#FFFFFF", "#18C8FF");
  for (const pd of L.pads) {
    const mat = new THREE.MeshStandardMaterial({ map: padTex, emissive: "#3DE0FF", emissiveIntensity: 0.6, roughness: 0.35 });
    const m = new THREE.Mesh(new RoundedBoxGeometry(w - 0.5, 0.12, 2.0, 2, 0.05), mat); m.position.copy(L.P(pd.z, 0, 0.04)); m.rotation.y = L.yaw(pd.z); root.add(m); pd.mesh = m; pd.mat = mat;
  }
  // ----- coins (instanced) -----
  const coinGeo = coinGeometry();
  const coinMat = new THREE.MeshStandardMaterial({ color: P.coinColor, map: coinTexture(), roughness: 0.2, metalness: 0.9, emissive: "#C07A00", emissiveIntensity: 0.32, envMap, envMapIntensity: 1.35 });
  L.coinMat = coinMat;
  const coinIM = new THREE.InstancedMesh(coinGeo, coinMat, coinRows.length); coinIM.castShadow = true;
  coinRows.forEach((c, i) => L.coins.push({ z: c[0], u: c[1], y: c[2], taken: false, i, pos: L.P(c[0], c[1], c[2]) }));
  root.add(coinIM); L.coinIM = coinIM;
  // ----- power-ups -----
  for (const p of puList) {
    const g = new THREE.Group(); const col = PU_COLORS[p.kind];
    const bub = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 20), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.42, clearcoat: 1, envMap, envMapIntensity: 1.4, depthWrite: false }));
    g.add(bub);
    const ic = iconTexture(p.kind); const cnv = document.createElement("canvas"); cnv.width = cnv.height = 128; const cx = cnv.getContext("2d");
    cx.fillStyle = col; cx.beginPath(); cx.arc(64, 64, 58, 0, 7); cx.fill(); cx.strokeStyle = "#FFFFFF"; cx.lineWidth = 6; cx.stroke(); cx.drawImage(ic.image, 14, 14, 100, 100);
    const st = new THREE.CanvasTexture(cnv); st.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, depthWrite: false })); spr.scale.set(0.78, 0.78, 1); g.add(spr);
    p.y = 0.9; g.position.copy(L.P(p.z, p.u, p.y)); root.add(g); p.group = g; p.taken = false; L.pus.push(p);
  }
  // ----- scenery -----
  const scen = buildScenery(themeId, theme, L.fieldEnd + 40, seed + stage * 13); root.add(scen); L.scenery = scen;

  // ----- queries -----
  L.pieceAt = function (zz) { for (const pc of pieces) if (zz >= pc.z0 && zz <= pc.z1) return pc; return null; };
  L.surface = function (zz) { // {kind,w,y,rail}
    if (zz >= L.fieldZ0 && zz <= L.fieldEnd) return { kind: "field", w: L.fieldW, y: 0, rail: true };
    if (zz >= L.rampZ && zz <= L.rampEnd) return { kind: "ramp", w: L.rampW, y: rampY(zz), rail: true };
    const pc = L.pieceAt(zz); if (pc) return { kind: "track", w, y: 0, rail: L.railAt(zz) };
    return null;
  };
  L.bandAt = function (zz) { const i = Math.floor((zz - L.fieldZ0) / L.bandLen); return Math.max(0, Math.min(9, i)); };
  L.bandCenter = (i) => L.fieldZ0 + (i + 0.5) * L.bandLen;
  L.BANDS = BANDS;

  // ----- update -----
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(1, 1, 1), tmpP = new THREE.Vector3(), eul = new THREE.Euler();
  L.update = function (dt, t, rpm) {
    for (const h of L.hammers) {
      if (h.broken) { if (h.flyV) { h.head.position.addScaledVector(h.flyV, dt); h.flyV.y -= 20 * dt; h.head.rotation.x += dt * 8; } continue; }
      h.pivot.rotation.z = L.hammerAngle(h, t);
    }
    for (const s of L.sweepers) if (!s.broken) s.bar.rotation.y = L.sweepAngle(s, t, rpm); else { s.bar.position.y -= dt * 6; s.bar.rotation.z += dt * 4; }
    for (const pd of L.pads) pd.mat.emissiveIntensity = 0.45 + 0.35 * Math.sin(t * 6);
    for (const wl of L.walls) if (!wl.intact) for (const c of wl.cubes) {
      if (c.m.position.y < -40) { c.m.visible = false; continue; }
      c.v.y -= L.gravity * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += c.spin.x * dt; c.m.rotation.z += c.spin.z * dt;
    }
    const yawC = (zz) => L.yaw(zz);
    for (const c of L.coins) {
      if (c.taken && !c.fly) { tmpM.makeScale(0, 0, 0); coinIM.setMatrixAt(c.i, tmpM); continue; }
      eul.set(0, t * 3 + c.z * 0.3, 0); tmpQ.setFromEuler(eul);
      tmpP.copy(c.pos); tmpP.y += Math.sin(t * 3 + c.z) * 0.06; tmpM.compose(tmpP, tmpQ, tmpS); coinIM.setMatrixAt(c.i, tmpM);
    }
    coinIM.instanceMatrix.needsUpdate = true;
    for (const p of L.pus) if (!p.taken) { p.group.position.y = p.y + Math.sin(t * 2.5 + p.z) * 0.15; p.group.children[0].rotation.y = t; }
    else if (p.group.visible) { p.group.scale.multiplyScalar(1 + dt * 8); p.group.children.forEach((c) => c.material.opacity = Math.max(0, (c.material.opacity ?? 1) - dt * 4)); if (p.group.scale.x > 2.5) p.group.visible = false; }
    if (L.archStar) L.archStar.rotation.y = t * 2;
    if (L.scenery) L.scenery.children.forEach((o) => { if (o.userData.spin) { o.rotation.x += o.userData.spin * dt; o.rotation.y += o.userData.spin * dt * 0.7; } });
  };
  L.dispose = function () { root.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => { if (mm.map) mm.map.dispose(); mm.dispose(); }); }); };
  return L;
}
export { LEVEL_IDS };
