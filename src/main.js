import * as THREE from "three";
import { createLevel, mulberry32, LEVEL_IDS, LEVELS_PER_WORLD, TOTAL_LEVELS } from "./level.js";
import { loadSave, writeSave, resetSave } from "./save.js";
import { initNative, hideSplash, openUrl } from "./native.js";
import { THEMES, makeSky, marbleTexture, PU_COLORS } from "./theme.js";
import { createAudio } from "./audio.js";
import { buildUI } from "./ui.js";
import { Ads } from "./ads.js";

const CONFIG = window.CONFIG, STRINGS = window.STRINGS;
const URLP = new URLSearchParams(location.search);
// QA hooks exist only in builds made with QA=1 (node build.mjs); store builds drop them entirely.
const TEST = __QA__ && URLP.has("test"), TRAILER = TEST && URLP.has("trailer");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, r, dt) => a + (b - a) * (1 - Math.exp(-r * dt));
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const snake = (s) => s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());

// ================= params =================
const DEF = CONFIG.params; const base = {}; const P = {};
for (const k in DEF) base[k] = DEF[k].def;
function clampParam(k, v) {
  const d = DEF[k]; if (!d) return undefined;
  if (d.type === "int" || d.type === "float") { v = Number(v); if (!isFinite(v)) return undefined; v = clamp(v, d.min, d.max); if (d.type === "int") v = Math.round(v); return v; }
  if (d.type === "enum") return d.options.includes(v) ? v : undefined;
  if (d.type === "color") return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : undefined;
  if (d.type === "text") return String(v ?? "").slice(0, d.max || 60);
  if (d.type === "bool") return v === true || v === "on" || v === "true";
  return v;
}
if (TEST) { for (const [k, v] of URLP) if (DEF[k]) { const c = clampParam(k, v); if (c !== undefined) base[k] = c; } if (URLP.get("lang")) base.language = clampParam("language", URLP.get("lang")) || base.language; if (URLP.get("diff")) base.difficulty = clampParam("difficulty", URLP.get("diff")) || base.difficulty; }
let SAVE = null; // persistent progress, loaded at boot
function recomputeP() {
  Object.assign(P, base);
  const ov = CONFIG.difficultyOverrides[base.difficulty]; if (ov) for (const k in ov) if (!(k in userSet)) P[k] = ov[k];
  if (TRAILER) Object.assign(P, CONFIG.trailer);
}
const userSet = {}; // ids explicitly edited are not overridden by difficulty
recomputeP();

// ================= language =================
function pickLang() {
  let l = P.language; if (l === "auto" || !STRINGS[l]) { const nav = (navigator.language || "en").toLowerCase(); l = nav.startsWith("tr") ? "tr" : "en"; }
  return STRINGS[l] ? l : "en";
}
let LANG = pickLang();
const T = (k, vars) => { let s = (STRINGS[LANG] && STRINGS[LANG][k]) ?? STRINGS.en[k] ?? k; if (vars) for (const v in vars) s = s.replace("{" + v + "}", vars[v]); return s; };

// ================= renderer / scene =================
const container = document.getElementById("game");
let renderer;
// Android WebViews are the slow case: no MSAA there, lower pixel-ratio cap, adaptive resolution (see adaptQuality).
const ANDROID = /Android/i.test(navigator.userAgent);
const perf = { scale: 1, noShadow: false, tuned: false };
try { renderer = new THREE.WebGLRenderer({ antialias: !ANDROID, powerPreference: "high-performance" }); }
catch (e) { document.getElementById("loader").innerHTML = '<div class="nogl">WebGL is not available.<br><button id="retry" data-ui>Retry</button></div>'; document.getElementById("retry")?.addEventListener("click", () => location.reload()); window.__game = { info: () => ({ st: "boot", nogl: true }) }; throw e; }
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.domElement.setAttribute("data-game-scene", "");
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 390 / 844, 0.3, 900);
const hemi = new THREE.HemisphereLight("#ffffff", "#888888", 1.3); scene.add(hemi);
const sun = new THREE.DirectionalLight("#ffffff", 2.4); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 60 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
scene.add(sun); scene.add(sun.target);
const pmrem = new THREE.PMREMGenerator(renderer);
let sky = null, envRT = null, level = null;

// ================= ball =================
const ballGroup = new THREE.Group(); scene.add(ballGroup);
const ballMat = new THREE.MeshPhysicalMaterial({ map: marbleTexture(P.playerColor, P.playerColor2), roughness: 0.08, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.25 });
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), ballMat); ballMesh.castShadow = true; ballGroup.add(ballMesh);
const shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 20), new THREE.MeshPhysicalMaterial({ color: "#7FD6FF", transparent: true, opacity: 0.28, roughness: 0.02, clearcoat: 1, depthWrite: false, emissive: "#3FB8FF", emissiveIntensity: 0.35 }));
shieldMesh.visible = false; ballGroup.add(shieldMesh);
const shadowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,0.5)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; scene.add(blob);

// ================= particles =================
const SPARK_N = 500; const sparkPos = new Float32Array(SPARK_N * 3), sparkCol = new Float32Array(SPARK_N * 3); const sparks = [];
const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3)); sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkCol, 3));
const sparkTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
const sparkPts = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.32, map: sparkTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sparkPts.frustumCulled = false; scene.add(sparkPts);
for (let i = 0; i < SPARK_N; i++) sparks.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color(), g: 0 });
let sparkI = 0;
function burst(pos, n, col, speed = 4, grav = 6, life = 0.7) { const c = new THREE.Color(col); for (let i = 0; i < n; i++) { const s = sparks[sparkI++ % SPARK_N]; s.life = life * (0.6 + Math.random() * 0.6); s.max = s.life; s.p.copy(pos); s.v.set(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random())); s.c.copy(c); s.g = grav; } }
const CONF_N = 260; const confGeo = new THREE.PlaneGeometry(0.16, 0.26); const confMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const confIM = new THREE.InstancedMesh(confGeo, confMat, CONF_N); confIM.frustumCulled = false; scene.add(confIM); const confs = [];
const CONF_COLS = ["#FF3B5C", "#FFC93C", "#3FA9F5", "#35D07F", "#9B6CFF", "#FF7A2F", "#FFFFFF"];
for (let i = 0; i < CONF_N; i++) { confs.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), s: new THREE.Vector3() }); confIM.setColorAt(i, new THREE.Color(CONF_COLS[i % CONF_COLS.length])); }
function confetti(pos, n = 140, spread = 7) { let k = 0; for (const c of confs) { if (k >= n) break; if (c.life > 0) continue; c.life = 2.2 + Math.random() * 1.5; c.p.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)); c.v.set((Math.random() - 0.5) * spread, 7 + Math.random() * 7, (Math.random() - 0.5) * spread); c.s.set(Math.random() * 8, Math.random() * 8, Math.random() * 8); k++; } }
const mtx = new THREE.Matrix4(), qq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0, 0, 0);
function updateParticles(dt) {
  for (let i = 0; i < SPARK_N; i++) { const s = sparks[i]; if (s.life > 0) { s.life -= dt; s.v.y -= s.g * dt; s.p.addScaledVector(s.v, dt); const k = Math.max(0, s.life / s.max); sparkPos.set([s.p.x, s.p.y, s.p.z], i * 3); sparkCol.set([s.c.r * k, s.c.g * k, s.c.b * k], i * 3); } else { sparkPos.set([0, -999, 0], i * 3); } }
  sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.color.needsUpdate = true;
  for (let i = 0; i < CONF_N; i++) { const c = confs[i]; if (c.life > 0) { c.life -= dt; c.v.y -= 9 * dt; c.v.multiplyScalar(1 - 1.6 * dt); c.p.addScaledVector(c.v, dt); c.r.x += c.s.x * dt; c.r.y += c.s.y * dt; qq.setFromEuler(c.r); mtx.compose(c.p, qq, one); } else mtx.compose(zero, qq.identity(), zero); confIM.setMatrixAt(i, mtx); }
  confIM.instanceMatrix.needsUpdate = true;
}

// ================= audio + UI =================
const audio = createAudio(() => ({ sfx: P.sfxVolume, music: P.musicVolume }));
const UI = buildUI({ T, onNext: () => onNext(), onReplay: () => onReplay(), onMenu: () => goMenu("levels"), onPause: () => setUserPause(true), onResume: () => setUserPause(false), onRestart: () => { setUserPause(false); playLevel(G.level); }, onQuit: () => { setUserPause(false); goMenu("levels"); },
  onPlay: (i) => playLevel(i), onSetting: (k, v) => changeSetting(k, v), onBuy: (id) => buySkin(id), onUseSkin: (id) => useSkin(id), onReset: () => { SAVE = resetSave(); applySettings(); applySkin(); UI.refreshMenus(menuState()); }, onPrivacy: () => openUrl(CONFIG.meta.privacyUrl[LANG] || CONFIG.meta.privacyUrl.en), onAd: (k) => onAd(k), adPrivacy: () => Ads.privacyOptionsRequired(), onAdPrivacy: () => Ads.showPrivacyOptions(), tap: () => { audio.unlock(); audio.startMusic(); audio.play("tap"); } });
function applyVolumes() { base.sfxVolume = SAVE && !SAVE.settings.sfx ? 0 : DEF.sfxVolume.def; base.musicVolume = SAVE && !SAVE.settings.music ? 0 : DEF.musicVolume.def; recomputeP(); audio.applyVol(); }

// ================= game state =================
const G = {
  st: "boot", phase: "ready", level: 0, lives: P.lives, clock: P.levelTime, coinsLevel: 0, total: 0, mult: 1, t: 0, ht: 0, playT: 0,
  events: [], outcome: null, won: false, gated: false, cause: null, danger: 0, maxDanger: 0, maxDangerByStage: {},
  timeScale: 1, tsTarget: 1, lessonDone: false, lessonOn: 0, hintFlags: {}, releaseT: 0, introT: 0, fallT: 0, clearT: 0,
  levelStars: 0, levelResults: [], seed: 0, endT: 0, firstRewardAt: null, firstPayoffAt: null, lastInputT: 0
};
const B = { z: 0, u: 0, y: 0.5, vz: 0, vu: 0, vy: 0, ground: true, r: 0.5, scale: 1, giantT: 0, shield: false, boostT: 0, magnetT: 0, doubleT: 0, knockT: 0, invulnT: 0, targetU: 0, quat: new THREE.Quaternion() };
const input = { hold: false, targetU: 0, kbDir: 0 };
let rng = mulberry32(1);
function newSeed() { if (TEST && URLP.get("seed")) return Number(URLP.get("seed")) >>> 0; if (TEST || TRAILER) return CONFIG.meta.seed; return (Date.now() ^ (Math.random() * 4294967296)) >>> 0; }
function ev(type, extra) { const e = { t: +G.playT.toFixed(3), type, ...(extra || {}) }; G.events.push(e); if (G.events.length > 2000) G.events.shift(); return e; }

// ================= level management =================
const worldOf = (i) => Math.floor(i / LEVELS_PER_WORLD);
function themeFor(i) { return LEVEL_IDS[worldOf(i)]; }
function applyTheme(themeId) {
  const th = THEMES[themeId];
  if (sky) { scene.remove(sky); sky.geometry.dispose(); sky.material.dispose(); }
  sky = makeSky(th); scene.add(sky);
  scene.fog = new THREE.Fog(th.fog, th.fogNear, th.fogFar); renderer.setClearColor(th.horizon);
  hemi.color.set(th.hemiSky); hemi.groundColor.set(th.hemiGround); hemi.intensity = th.hemiI;
  sun.color.set(th.sunCol); sun.intensity = th.sunI; G.sunDir = new THREE.Vector3(...th.sunDir).normalize();
  // env map from sky
  const envScene = new THREE.Scene(); const s2 = makeSky(th); s2.scale.setScalar(0.1); envScene.add(s2);
  if (envRT) envRT.dispose(); envRT = pmrem.fromScene(envScene, 0.02); s2.geometry.dispose(); s2.material.dispose();
  ballMat.envMap = envRT.texture; ballMat.needsUpdate = true;
  G.themeId = themeId;
}
function loadLevel(i) {
  if (level) { scene.remove(level.root); level.dispose(); }
  const themeId = themeFor(i);
  applyTheme(themeId);
  level = createLevel(i, P, CONFIG.meta.seed, envRT.texture);
  scene.add(level.root);
  G.level = i; G.levelTime = Math.round(P.levelTime * level.timeFactor); G.clock = G.levelTime; G.coinsLevel = 0; G.total = 0; G.mult = 1; G.phase = "ready"; G.hintFlags = {}; G.lives = P.lives;
  resetBall(0);
  UI.setLevel(i + 1, themeId);
  UI.hideCard();
  G.introT = 0; G.st = "intro"; G.releaseT = 0;
  camIntro = 1; placeCameraImmediate(true);
  UI.showHint("start", true); UI.levelBanner(T("lvl.n", { n: i + 1 }), T("lvl." + themeId));
  ev("level_start", { id: "level" + (i + 1) });
}
function resetBall(z) {
  Object.assign(B, { z, u: 0, vz: 0, vu: 0, vy: 0, ground: true, y: 0.5, r: 0.5, scale: 1, giantT: 0, boostT: 0, magnetT: 0, doubleT: 0, knockT: 0, invulnT: 0, targetU: 0 });
  input.targetU = 0;
}

// ================= begin / restart =================
function begin() {
  if (G.st !== "intro") return;
  audio.unlock(); audio.startMusic();
  G.st = "play"; G.phase = "run"; UI.hideHint(); UI.banner(T("banner.go"), "#FFFFFF");
  ev(G.level === 0 && !G.begun ? "start" : "level_go"); G.begun = true;
}
function startRun() { // fresh session state (used by tests)
  G.seed = CONFIG.meta.seed; rng = mulberry32(G.seed);
  Object.assign(G, { lives: P.lives, total: 0, playT: 0, ht: 0, events: [], outcome: null, won: false, cause: null, maxDanger: 0, maxDangerByStage: {}, levelResults: [], begun: false, firstRewardAt: null, firstPayoffAt: null });
}
function playLevel(i) {
  i = clamp(i, 0, TOTAL_LEVELS - 1);
  Object.assign(G, { outcome: null, won: false, cause: null, playT: 0, events: [], revived: false, bonusClaimed: false });
  UI.hideMenus(); UI.showHud(true); loadLevel(i);
}
// menu: the current level's scene idles behind the menu panels
function goMenu(screen) {
  if (G.st === "boot") return;
  if (!level || G.st === "play" || G.st === "end" || G.st === "intro") { const i = clamp(Math.min((SAVE ? SAVE.unlocked : 1) - 1, TOTAL_LEVELS - 1), 0, TOTAL_LEVELS - 1); if (!level || worldOf(i) !== worldOf(G.level) || G.st !== "menu") loadLevel(screen === "levels" && level ? G.level : i); }
  G.st = "menu"; input.hold = false; UI.hideCard(); UI.hideHint(); UI.showHud(false); audio.setRoll(0, false);
  UI.showMenu(screen || "home", menuState());
}
function menuState() { return { save: SAVE, total: TOTAL_LEVELS, perWorld: LEVELS_PER_WORLD, worlds: LEVEL_IDS, gates: CONFIG.worldGates, skins: CONFIG.skins, starsTotal: starsTotal(), current: clamp(SAVE.unlocked - 1, 0, TOTAL_LEVELS - 1) }; }
const starsTotal = () => (SAVE ? SAVE.stars.reduce((a, b) => a + (b || 0), 0) : 0);
function isUnlocked(i) { if (!SAVE) return true; if (i >= SAVE.unlocked) return false; return starsTotal() >= CONFIG.worldGates[worldOf(i)]; }
function nextPlayable(i) { const n = i + 1; if (n >= TOTAL_LEVELS) return -1; return isUnlocked(n) ? n : -1; }
let adGate = false; // blocks double taps while an interstitial may be opening
const onResult = () => G.st === "end" || (G.phase === "clear" && UI.levelCardShown);
function afterAd(fn) { if (adGate) return; if (!onResult()) { fn(); return; } adGate = true; Ads.maybeInterstitial(G.level).then(() => { adGate = false; fn(); }, () => { adGate = false; fn(); }); }
function onReplay() {
  audio.play("tap");
  const lv = G.level; afterAd(() => playLevel(lv));
}
function onNext() {
  audio.play("tap");
  if (G.st === "end" && G.outcome === "win") { goMenu("levels"); return; }
  const n = nextPlayable(G.level); afterAd(() => { if (n >= 0) playLevel(n); else goMenu("levels"); });
}
// ---- rewarded ads ----
let adBusy = false;
async function onAd(kind) {
  if (adBusy || !onResult()) return; adBusy = true; audio.play("tap");
  try {
    if (kind === "revive") {
      if (G.revived || G.outcome !== "lose") return;
      const ok = await Ads.showRewarded();
      if (!ok) { UI.toast(T("ad.none")); return; }
      revive();
    } else if (kind === "bonus") {
      if (G.bonusClaimed || !SAVE || !UI.levelCardShown) return;
      const ok = await Ads.showRewarded();
      if (!ok) { UI.toast(T("ad.none")); return; }
      G.bonusClaimed = true; const n = G.lastReward || 0; SAVE.coins += n; writeSave(SAVE);
      UI.adDone(); UI.toast(T("ad.got", { n })); audio.play("win"); ev("ad_bonus", { id: String(n) });
    }
  } finally { adBusy = false; }
}
function revive() {
  // Second chance: one per attempt. Fall -> 1 life back at the last checkpoint; time-up -> extra seconds.
  G.revived = true; UI.hideCard(); G.st = "play"; G.outcome = null; G.won = false; input.hold = false;
  if (G.cause === "time") { G.clock = Math.max(G.clock, 12); B.invulnT = 1.6; if (G.phase !== "run") G.phase = "run"; UI.pulse("clock"); }
  else { G.lives = Math.max(G.lives, 1); let cp = 0; for (const c of level.checkpoints) if (c <= B.z - 1) cp = c; resetBall(cp + 1); B.invulnT = 1.6; G.phase = "run"; input.targetU = 0; UI.pulse("lives"); }
  audio.startMusic && audio.startMusic(); ev("ad_revive", { id: G.cause || "" });
}
function recordClear(stars, coins) {
  if (!SAVE) return { best: false };
  const i = G.level; const prevBest = SAVE.best[i] || 0;
  SAVE.stars[i] = Math.max(SAVE.stars[i] || 0, stars); SAVE.best[i] = Math.max(prevBest, coins);
  SAVE.coins += coins; SAVE.unlocked = Math.max(SAVE.unlocked, Math.min(TOTAL_LEVELS, i + 2));
  if (G.lessonDone) SAVE.lessonDone = true;
  writeSave(SAVE); return { best: coins > prevBest && prevBest > 0 };
}
// settings / skins
function changeSetting(k, v) {
  SAVE.settings[k] = v; writeSave(SAVE);
  if (k === "language") setParam("language", v);
  if (k === "music" || k === "sfx") applyVolumes();
  if (k === "quality") applyQuality();
  if (k === "difficulty") { base.difficulty = v; recomputeP(); }
  UI.refreshMenus(menuState());
}
function applySettings() { base.language = SAVE.settings.language; base.difficulty = SAVE.settings.difficulty; recomputeP(); LANG = pickLang(); document.documentElement.lang = LANG; UI.relabel(); applyVolumes(); applyQuality(); G.lessonDone = !!SAVE.lessonDone; }
let qualityLow = false;
function applyQuality() { const want = !!((SAVE && SAVE.settings.quality === "low") || perf.noShadow); if (want === qualityLow && renderer.shadowMap.enabled === !want) return; qualityLow = want; renderer.shadowMap.enabled = !want; scene.traverse((o) => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => (mm.needsUpdate = true)); }); layout(); }
function applySkin() { const sk = CONFIG.skins.find((x) => x.id === (SAVE && SAVE.skin)) || CONFIG.skins[0]; base.playerColor = sk.a; base.playerColor2 = sk.b; recomputeP(); ballMat.map.dispose(); ballMat.map = marbleTexture(P.playerColor, P.playerColor2); ballMat.needsUpdate = true; }
function buySkin(id) { const sk = CONFIG.skins.find((x) => x.id === id); if (!sk || SAVE.skins.includes(id)) return; if (SAVE.coins < sk.price) { UI.toast(T("shop.need")); return; } SAVE.coins -= sk.price; SAVE.skins.push(id); SAVE.skin = id; writeSave(SAVE); audio.play("power"); applySkin(); UI.refreshMenus(menuState()); }
function useSkin(id) { if (!SAVE.skins.includes(id)) return; SAVE.skin = id; writeSave(SAVE); applySkin(); UI.refreshMenus(menuState()); }

// ================= input =================
const ptr = { id: null, x: 0, y: 0, downT: 0 };
let axisScreen = { x: 1, y: 0, len: 60 };
function onDown(e) {
  if (e.target.closest && e.target.closest("[data-ui]")) return;
  e.preventDefault(); audio.unlock(); G.lastInputT = G.t;
  try { container.setPointerCapture(e.pointerId); } catch (er) {}
  ptr.id = e.pointerId; ptr.x = e.clientX; ptr.y = e.clientY;
  if (G.st === "menu" || paused) return;
  input.hold = true; input.targetU = B.u;
  if (G.st === "intro") begin();
}
function onMove(e) {
  if (ptr.id !== e.pointerId) return;
  const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY;
  const d = (dx * axisScreen.x + dy * axisScreen.y) / axisScreen.len; // finger movement in world units
  input.targetU += d; // ball follows the finger 1:1 on screen
}
function onUp(e) { if (ptr.id !== e.pointerId) return; ptr.id = null; input.hold = false; }
container.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
container.addEventListener("contextmenu", (e) => e.preventDefault());
const keys = {};
window.addEventListener("keydown", (e) => { if (e.code === "Escape") { handleBack(); return; } if (G.st === "menu" || paused) return; if (["Space", "ArrowUp", "KeyW"].includes(e.code)) { if (!keys.hold) { input.targetU = B.u; } keys.hold = true; input.hold = true; audio.unlock(); if (G.st === "intro") begin(); e.preventDefault(); } if (["ArrowLeft", "KeyA"].includes(e.code)) keys.l = 1; if (["ArrowRight", "KeyD"].includes(e.code)) keys.r = 1; });
window.addEventListener("keyup", (e) => { if (["Space", "ArrowUp", "KeyW"].includes(e.code)) { keys.hold = false; if (ptr.id === null) input.hold = false; } if (["ArrowLeft", "KeyA"].includes(e.code)) keys.l = 0; if (["ArrowRight", "KeyD"].includes(e.code)) keys.r = 0; });

// ================= physics =================
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
function hammerHit(h, z, u, y, t, r) { if (h.broken || Math.abs(z - h.z) > 0.78 + r) return false; const hp = level.hammerHead(h, t); const du = u - hp.u, dy = y - hp.y; return du * du + dy * dy < (0.62 + r) * (0.62 + r); }
function sweepGeom(s, z, u, t) {
  const phi = level.sweepAngle(s, t, P.sweeperRpm); const du = -Math.cos(phi), dz = -Math.sin(phi); const ru = u, rz = z - s.z;
  const proj = clamp(ru * du + rz * dz, 0, s.Lb); const cu = proj * du, cz = proj * dz; const ou = ru - cu, oz = rz - cz;
  return { dist: Math.hypot(ou, oz), ou, oz, proj, phi };
}
function sweepHit(s, z, u, y, t, r) { if (s.broken || Math.abs(z - s.z) > s.Lb + r || y > 1.1 + r) return false; return sweepGeom(s, z, u, t).dist < r + 0.18; }
function predictHit(hold, horizon, u) {
  let z = B.z, vz = B.vz; const maxV = B.boostT > 0 ? P.boostSpeed : P.maxSpeed; const dt = 0.04;
  for (let t = 0; t <= horizon; t += dt) {
    if (hold) vz = Math.min(maxV, vz + P.accel * dt); else vz = Math.max(0, vz - P.brakeDecel * dt);
    z += vz * dt; const tt = G.ht + t; if (B.giantT > t + 0.1) continue; // the giant ball smashes through
    for (const h of level.hammers) if (hammerHit(h, z, u, 0.5, tt, 0.5 + 0.08)) { predictHit.entry = h.z - 1.3 - B.z; return t; }
    for (const s of level.sweepers) if (sweepHit(s, z, u, 0.5, tt, 0.5 + 0.1)) { predictHit.entry = s.z - s.Lb - 0.5 - B.z; return t; }
  }
  return -1;
}
function shake(a) { camShake = Math.max(camShake, a * P.cameraShake); }

function gainCoin(c) {
  c.taken = true; const n = B.doubleT > 0 ? 2 : 1; G.coinsLevel += n; audio.play("coin", G.coinsLevel); burst(c.pos, 8, "#FFD84A", 3, 4, 0.5);
  ev("coin", { id: "coin", pos: [c.pos.x, c.pos.y, c.pos.z] }); if (G.firstRewardAt === null) G.firstRewardAt = G.playT; UI.pulse("coins");
}
function applyPU(p) {
  p.taken = true; audio.play("power"); burst(p.group.position, 30, PU_COLORS[p.kind], 5, 3, 0.8); ev("powerup", { id: p.kind });
  if (G.firstRewardAt === null) G.firstRewardAt = G.playT;
  const k = p.kind;
  if (k === "boost") B.boostT = P.boostTime;
  if (k === "shield") B.shield = true;
  if (k === "magnet") B.magnetT = P.magnetTime;
  if (k === "double") B.doubleT = P.doubleTime;
  if (k === "life") { G.lives = Math.min(5, G.lives + 1); audio.play("life"); UI.pulse("lives"); }
  if (k === "time") { G.clock += P.extraTime; UI.pulse("clock"); }
  if (k === "giant") B.giantT = P.giantTime;
  UI.banner(T("pu." + k, { n: P.extraTime }), PU_COLORS[k]);
}
function loseLife(cause) {
  G.lives -= 1; ev("life_lost", { id: cause }); ev("fall"); audio.play("fall"); UI.pulse("lives"); UI.banner(T("banner.ohno"), "#FF5A6A");
  G.phase = "falling"; G.fallT = 0; G.cause = cause;
}
function smashWall(wl) {
  wl.intact = false; audio.play("smash"); shake(0.35); ev("wall_smashed", { id: "wall", pos: [0, 0, wl.z] }); UI.banner(T("banner.smash"), "#FFC93C");
  for (const c of wl.cubes) { c.v.set((c.u - B.u) * 2.2 + (Math.random() - 0.5) * 3, 3 + c.row * 1.5 + Math.random() * 4, B.vz * 0.7 + 2 + Math.random() * 5); c.spin.set((Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12); }
  burst(level.P(wl.z, 0, 1), 40, "#FFFFFF", 7, 8, 0.6);
}

function stepPhysics(dt) {
  const L = level; const prevZ = B.z;
  const giant = B.giantT > 0;
  // timers
  for (const k of ["boostT", "magnetT", "doubleT", "giantT", "knockT", "invulnT"]) B[k] = Math.max(0, B[k] - dt);
  const tgtScale = giant ? 2.2 : 1; B.scale = damp(B.scale, tgtScale, 8, dt); B.r = 0.5 * B.scale;
  const hold = input.hold;
  if (hold) G.releaseT = 0; else G.releaseT += dt;
  // forward
  if (G.phase === "field" && B.ground) {
    if (hold) { B.vz = B.vz > 9 ? Math.max(9, B.vz - 4 * dt) : Math.min(9, B.vz + P.accel * 0.5 * dt); }
    else { B.vz = Math.max(0, B.vz - P.brakeDecel * 0.6 * dt); }
  } else if (B.ground) {
    const maxV = B.boostT > 0 ? P.boostSpeed : P.maxSpeed;
    if (hold) { if (B.vz < maxV) B.vz = Math.min(maxV, B.vz + P.accel * dt * (B.boostT > 0 ? 2.2 : 1)); else B.vz = Math.max(maxV, B.vz - 10 * dt); }
    else { if (B.vz > 0) { B.vz = Math.max(0, B.vz - P.brakeDecel * dt); if (!G.brakeEv || G.playT - G.brakeEv > 0.6) { G.brakeEv = G.playT; ev("brake"); } } else B.vz = Math.min(0, B.vz + P.brakeDecel * dt); }
  }
  // lateral
  if (keys.l || keys.r) input.targetU += ((keys.r ? 1 : 0) - (keys.l ? 1 : 0)) * P.steerSpeed * dt * Math.sign(axisScreen.x || 1);
  const sp0 = L.surface(B.z); const wNow = sp0 ? sp0.w : L.w;
  input.targetU = clamp(input.targetU, -(wNow / 2 + 1.2), wNow / 2 + 1.2);
  if (B.knockT > 0) { B.vu = damp(B.vu, 0, 2.5, dt); input.targetU = B.u; }
  else {
    const tv = hold ? clamp((input.targetU - B.u) * 9, -P.steerSpeed, P.steerSpeed) : 0;
    B.vu = damp(B.vu, tv, B.ground ? (hold ? 14 : 20) : 4, dt);
  }
  B.z += B.vz * dt; B.u += B.vu * dt;
  // surface
  const sp = L.surface(B.z);
  if (giant && sp && G.phase !== "field") B.u = clamp(B.u, -sp.w / 2 + 0.2, sp.w / 2 - 0.2);
  let supported = !!sp && Math.abs(B.u) <= sp.w / 2 + B.r * 0.15;
  // rails
  if (sp && sp.rail && B.ground) { const lim = sp.w / 2 - B.r * 0.95 - 0.08; if (Math.abs(B.u) > lim) { B.u = Math.sign(B.u) * lim; if (Math.abs(B.vu) > 2) { audio.play("bump"); burst(L.P(B.z, B.u, 0.4), 4, "#FFFFFF", 2, 2, 0.3); } B.vu = -B.vu * 0.4; input.targetU = clamp(input.targetU, -lim, lim); } supported = true; }
  const gy = sp ? sp.y : -99;
  // ramp launch
  if (G.phase === "ramp" && prevZ <= L.rampEnd && B.z > L.rampEnd && B.ground) {
    const lv = clamp(B.vz, 9, P.maxSpeed); B.ground = false; B.vy = lv * (2 * L.rampH / L.rampLen) + 3.5; B.vz = lv * 1.05; B.boostT = 0; G.phase = "air";
    audio.play("launch"); ev("ramp_launch", { id: "ramp" }); UI.banner(T("banner.ramp"), "#FFC93C"); shake(0.2); burst(L.P(B.z, B.u, L.rampH), 50, "#FFD84A", 6, 3, 0.9);
  }
  if (B.ground) {
    if (supported && !(G.phase === "air")) { B.y = gy + B.r; B.vy = 0; }
    else if (!supported) {
      // leaving the track
      if (B.shield && G.phase === "run") { B.shield = false; ev("shield_used", { id: "fall" }); audio.play("power"); if (sp) { B.u = Math.sign(B.u) * (sp.w / 2 - 0.8); B.vu = 0; input.targetU = B.u; } B.vy = 8; B.vz = Math.max(B.vz, 11); B.ground = false; UI.banner(T("banner.nice"), "#7FD6FF"); }
      else { B.ground = false; B.vy = Math.min(B.vy, 0); }
    }
  } else {
    B.vy -= L.gravity * dt; B.y += B.vy * dt;
    if (sp && supported && B.y - B.r <= gy + 0.02 && B.vy <= 0 && B.y - B.r > gy - 0.6) {
      const impact = -B.vy; B.y = gy + B.r;
      if (G.phase === "air") { G.phase = "field"; B.vz *= 0.72; ev("landing", { id: "field" }); audio.play("land"); shake(0.25); burst(L.P(B.z, B.u, 0.1), 30, "#FFFFFF", 5, 6, 0.6); UI.showHint("field", false); if (G.firstPayoffAt === null) G.firstPayoffAt = G.playT; }
      if (impact > 7 && G.phase === "field") { B.vy = impact * 0.28; } else { B.vy = 0; B.ground = true; if (impact > 3) audio.play("land"); }
      // landed after a gap?
      for (const gp of L.gaps) if (B.z > gp.z1 && B.z < gp.z1 + 6 && !gp.done) { gp.done = true; ev("gap_jumped", { id: "gap" }); UI.banner(T("banner.jump"), "#3DE0FF"); }
    }
    if (B.y < -2.5 && G.phase === "run") { loseLife(sp ? "edge" : "gap"); return; }
    if (B.y < -2.5 && (G.phase === "field" || G.phase === "air")) { finishField(true); return; }
    if (B.y < -2.5 && G.phase === "ramp") { loseLife("edge"); return; }
  }
  // pads
  for (const pd of L.pads) if (prevZ < pd.z && B.z >= pd.z && B.ground && Math.abs(B.u) < L.w / 2) { B.vy = 9; B.ground = false; audio.play("jump"); ev("jump", { id: "pad" }); burst(L.P(pd.z, B.u, 0.2), 16, "#3DE0FF", 4, 3, 0.5); }
  // hazards
  if (G.phase === "run") {
    for (const h of L.hammers) {
      if (hammerHit(h, B.z, B.u, B.y, G.ht, B.r) && B.invulnT <= 0) {
        if (giant) { h.broken = true; h.flyV = new THREE.Vector3(0, 8, 0); const yaw = L.yaw(h.z); h.flyV.set(Math.sin(yaw) * 10, 8, Math.cos(yaw) * 10); audio.play("smash"); shake(0.35); ev("hazard_smashed", { id: "hammer" }); UI.banner(T("banner.smash"), "#9B6CFF"); continue; }
        const hp = L.hammerHead(h, G.ht), hp2 = L.hammerHead(h, G.ht + 0.02); const dir = Math.sign(hp2.u - hp.u) || Math.sign(B.u - hp.u) || 1;
        audio.play("hit"); shake(0.4); burst(L.P(B.z, B.u, B.y), 20, "#FFFFFF", 5, 4, 0.5);
        if (B.shield) { B.shield = false; B.vu = dir * 4; B.knockT = 0.2; B.invulnT = 0.6; ev("shield_used", { id: "hammer" }); UI.banner(T("banner.nice"), "#7FD6FF"); }
        else { B.vu = dir * 14; B.vy = 4; B.ground = false; B.vz *= 0.4; B.knockT = 0.5; B.invulnT = 0.7; ev("hit", { id: "hammer" }); }
      }
      if (!h.passed && B.z > h.z + 1.2) { h.passed = true; ev("hammer_passed", { id: "hammer" }); }
      // whoosh telegraph
      const hp = L.hammerHead(h, G.ht); const near = h.z - B.z;
      if (!h.broken && near > -2 && near < 16 && Math.abs(hp.u) < 0.6 && (!h.lastW || G.ht - h.lastW > 0.4)) { h.lastW = G.ht; audio.play("whoosh"); }
    }
    for (const s of L.sweepers) {
      if (s.broken) continue;
      if (sweepHit(s, B.z, B.u, B.y, G.ht, B.r) && B.invulnT <= 0) {
        if (giant) { s.broken = true; audio.play("smash"); shake(0.35); ev("hazard_smashed", { id: "sweeper" }); UI.banner(T("banner.smash"), "#9B6CFF"); continue; }
        const gm = sweepGeom(s, B.z, B.u, G.ht); const n = Math.hypot(gm.ou, gm.oz) || 1; let nu = gm.ou / n, nz = gm.oz / n;
        const om = s.dir * (P.sweeperRpm * Math.PI * 2 / 60); const vtu = gm.proj * om * Math.sin(gm.phi), vtz = -gm.proj * om * Math.cos(gm.phi);
        audio.play("hit"); shake(0.35); burst(L.P(B.z, B.u, B.y), 16, "#FFFFFF", 5, 4, 0.5);
        if (B.shield) { B.shield = false; ev("shield_used", { id: "sweeper" }); B.vz *= 0.5; B.invulnT = 0.6; B.u += nu * 0.3; }
        else { B.vu = nu * 7 + vtu * 1.6; B.vz = B.vz * 0.25 + nz * 6 + vtz; B.knockT = 0.45; B.invulnT = 0.6; B.u += nu * 0.15; B.vy = 2.5; B.ground = false; ev("hit", { id: "sweeper" }); }
      }
      // post
      const ru = B.u, rz = B.z - s.z; const pd = Math.hypot(ru, rz); if (pd < 0.22 + B.r) { const k = (0.22 + B.r - pd); B.u += (ru / (pd || 1)) * k; B.z += (rz / (pd || 1)) * k; if (rz < 0) { B.vz *= 0.6; B.vu += (Math.sign(ru) || 1) * 2; } audio.play("bump"); }
      if (!s.passed && B.z > s.z + 1.5) { s.passed = true; ev("sweeper_passed", { id: "sweeper" }); }
    }
    for (const wl of L.walls) {
      if (!wl.intact) continue;
      if (B.z + B.r > wl.z - wl.cs / 2 && B.z - B.r < wl.z + wl.cs / 2 && B.y < wl.h) {
        if (B.vz >= P.smashSpeed || giant) { smashWall(wl); B.vz *= giant ? 1 : 0.85; }
        else { B.z = wl.z - wl.cs / 2 - B.r - 0.01; B.vz = -4; G.clock = Math.max(0, G.clock - 1); audio.play("bump"); shake(0.15); ev("wall_bounce", { id: "wall" }); if (!G.hintFlags.smash2) { G.hintFlags.smash2 = 1; UI.flashHint(T("hint.smash")); } }
      }
    }
  }
  // coins & power-ups
  const ballP = L.P(B.z, B.u, B.y, tmpV);
  for (const c of L.coins) {
    if (c.taken) continue; const dz = c.z - B.z; if (dz > 8 || dz < -3) continue;
    const d = c.pos.distanceTo(ballP);
    if (B.magnetT > 0 && d < 3.8) { tmpV2.subVectors(ballP, c.pos).normalize(); c.pos.addScaledVector(tmpV2, Math.min(d, (14 + B.vz) * dt)); }
    if (d < 0.75 + B.r * 0.6) gainCoin(c);
  }
  for (const p of L.pus) if (!p.taken && p.group.position.distanceTo(ballP) < 0.95 + B.r * 0.7) applyPU(p);
  // checkpoints / phase transitions
  if (G.phase === "run" && B.z >= L.rampZ) { G.phase = "ramp"; ev("ramp_reached", { id: "ramp" }); }
  if (G.phase === "field" && B.ground && B.vz <= 0.05 && B.z >= L.fieldZ0) finishField(false);
  if (G.phase === "field" && B.z > L.fieldEnd + 0.6 && B.ground === false) { /* falling off end handled above */ }
  // marble rotation
  L.frame(B.z, fr);
  const velW = tmpV2.set(fr.tx * B.vz + fr.nx * B.vu, 0, fr.tz * B.vz + fr.nz * B.vu); const sp2 = velW.length();
  if (sp2 > 0.001 && (B.ground || G.phase === "air")) { const axis = new THREE.Vector3(velW.z, 0, -velW.x).normalize(); qq.setFromAxisAngle(axis, (sp2 * dt) / B.r); B.quat.premultiply(qq); }
}
const fr = {};
function finishField(fellOff) {
  const L = level; const band = fellOff ? 0 : L.bandAt(B.z); const mult = fellOff ? 1 : L.BANDS[band];
  G.mult = mult; G.phase = "clear"; G.clearT = 0; input.hold = false;
  const total = G.coinsLevel * mult; G.total += total; G.levelResults.push(total); const rawCoins = G.coinsLevel; G.coinsLevel = 0;
  G.levelStars = mult >= 10 ? 3 : mult >= 5 ? 2 : 1;
  const rec = recordClear(G.levelStars, total);
  ev("stage_complete", { id: "level" + (L.levelIndex + 1), mult }); if (G.firstPayoffAt === null) G.firstPayoffAt = G.playT;
  audio.play("win"); confetti(L.P(B.z, 0, 1)); confetti(L.P(B.z + 3, 0, 1), 80); UI.hideHint();
  const last = G.level + 1 >= TOTAL_LEVELS;
  G.pendingCard = { last, total, mult, coins: rawCoins, fellOff, best: rec.best };
}
function endGame(outcome, cause) {
  if (G.st === "end") return;
  G.st = "end"; G.outcome = outcome; G.won = outcome === "win"; G.cause = cause || G.cause; G.endT = 0; input.hold = false;
  ev(outcome === "win" ? "win" : outcome === "timeout" ? "timeout" : "lose", { id: cause || "" });
  audio.play(outcome === "win" ? "win" : "lose");
  UI.hideHint();
}

// ================= danger =================
function computeDanger() {
  if (G.phase !== "run") return 0;
  let d = 0.6 * (1 - G.clock / (G.levelTime || P.levelTime));
  const sp = level.surface(B.z); const w = sp ? sp.w : level.w;
  let near = false; for (const h of level.hammers) if (Math.abs(h.z - B.z) < 6 && !h.broken) near = true; for (const s of level.sweepers) if (Math.abs(s.z - B.z) < 6 && !s.broken) near = true;
  if (near) d = Math.max(d, 0.55 + 0.35 * clamp(1 - Math.abs(Math.abs(B.u) - w / 2) / (w / 2), 0, 1));
  for (const gp of level.gaps) if (gp.z0 - B.z < 6 && gp.z0 - B.z > 0 && B.vz < P.jumpMinSpeed) d = Math.max(d, 0.75);
  if (sp && !sp.rail) d = Math.max(d, clamp((Math.abs(B.u) - w * 0.25) / (w * 0.25), 0, 1) * 0.8);
  d = Math.max(d, 0.5 * (1 - G.lives / 3));
  return clamp(d, 0, 1);
}

// ================= camera =================
let camShake = 0, camIntro = 0; const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(); let fovKick = 0;
function desiredCam(outPos, outLook) {
  const L = level; L.frame(B.z, fr);
  const ss = clamp(B.vz / P.maxSpeed, 0, 1.5);
  let dist = P.cameraDistance * (1 + 0.1 * ss) * Math.max(1, B.scale * 0.75), hgt = P.cameraHeight + 0.35 * ss + (B.scale - 1) * 0.9;
  if (G.phase === "air") { dist *= 1.7; hgt *= 1.9; }
  if (G.phase === "field" || G.phase === "clear") { dist *= 1.35; hgt *= 1.8; }
  const by = G.phase === "falling" ? Math.max(B.y, -1) : B.y;
  const base = L.P(B.z, B.u * 0.55, 0, tmpV);
  outPos.set(base.x - fr.tx * dist, Math.max(by, 0) * 0.6 + hgt, base.z - fr.tz * dist);
  const lead = G.phase === "field" || G.phase === "clear" ? 6 : P.cameraLead;
  L.P(B.z + lead, B.u * 0.35, Math.max(0, by) * 0.5 + 0.2, outLook);
  if (G.phase === "falling") { outLook.copy(L.P(B.z, B.u, B.y)); }
}
function placeCameraImmediate(intro) { desiredCam(camPos, camLook); if (intro) { G.introFrom = camPos.clone().add(new THREE.Vector3(6, 16, -14)); } camera.position.copy(camPos); camera.lookAt(camLook); }
function updateCamera(dt, rdt) {
  const dp = tmpV.clone(), dl = new THREE.Vector3(); desiredCam(dp, dl);
  const k = G.phase === "falling" ? 0.8 : P.cameraFollow;
  camPos.x = damp(camPos.x, dp.x, k, dt); camPos.z = damp(camPos.z, dp.z, k * 1.6, dt); camPos.y = damp(camPos.y, dp.y, k * 0.8, dt);
  camLook.lerp(dl, 1 - Math.exp(-k * 1.4 * dt));
  if (G.phase === "falling") camPos.y = Math.max(camPos.y, 1.5);
  const p = camPos.clone();
  if (G.st === "intro" && G.introFrom) { const t = clamp(G.introT / 1.4, 0, 1); p.lerpVectors(G.introFrom, camPos, easeIO(t)); }
  camShake = Math.max(0, camShake - rdt * 1.6);
  if (camShake > 0) p.add(new THREE.Vector3((Math.random() - 0.5) * camShake, (Math.random() - 0.5) * camShake, 0));
  camera.position.copy(p); camera.lookAt(camLook);
  const ss = clamp(B.vz / P.maxSpeed, 0, 1.4);
  fovKick = damp(fovKick, 8 * ss + (B.boostT > 0 ? 12 : 0), 3, dt);
  camera.fov = clamp(baseVFov + fovKick, 40, 95); camera.updateProjectionMatrix();
  // sun follows
  sun.position.copy(level.P(B.z, 0, 0)).addScaledVector(G.sunDir, 30); sun.target.position.copy(level.P(B.z + 4, 0, 0));
}

// ================= layout =================
let W = 390, H = 844, baseVFov = 58;
function layout() {
  const r = container.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
  if (r.width < 2 || r.height < 2) { G.zero = true; return; } G.zero = false;
  const dpr = Math.max(0.5, Math.min(ANDROID ? 1.5 : 2, 1000 / Math.min(W, H)) * perf.scale * (SAVE && SAVE.settings.quality === "low" ? 0.75 : 1));
  renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); renderer.domElement.style.width = W + "px"; renderer.domElement.style.height = H + "px";
  camera.aspect = W / H;
  // fixed horizontal FOV from the design frame, vertical derived and clamped
  const hf = 2 * Math.atan(Math.tan((P.cameraFov * Math.PI) / 360) * (390 / 844));
  let vf = (2 * Math.atan(Math.tan(hf / 2) / camera.aspect) * 180) / Math.PI;
  if (W > H) vf = clamp(vf, 44, 52); else vf = clamp(vf, 48, 78);
  baseVFov = vf; camera.fov = vf; camera.updateProjectionMatrix();
  UI.layout(W, H);
}
new ResizeObserver(() => requestAnimationFrame(layout)).observe(container);
window.addEventListener("orientationchange", () => setTimeout(layout, 200));

// ================= hints / UI per frame =================
function updateHints(dt) {
  if (G.st === "intro") return;
  if (G.st !== "play" || G.phase !== "run") return;
  // first wall / pad
  for (const wl of level.walls) if (wl.intact && wl.z - B.z < 12 && wl.z - B.z > 0 && !G.hintFlags.smash && !TEST) { G.hintFlags.smash = 1; UI.flashHint(T("hint.smash")); }
  for (const pd of level.pads) if (pd.z - B.z < 12 && pd.z - B.z > 0 && !G.hintFlags.jump) { G.hintFlags.jump = 1; UI.flashHint(T("hint.jump")); }
  // released too long
  if (!input.hold && G.releaseT > 0.9 && B.vz < 1 && G.lessonOn <= 0) UI.showHint(G.releaseT > P.hintDelay ? "holdHand" : "hold", false);
  else if (input.hold && UI.hintKind && (UI.hintKind === "hold" || UI.hintKind === "holdHand")) UI.hideHint();
}
function updateLesson(rdt) {
  if (G.st !== "play" || G.phase !== "run") { G.tsTarget = 1; return; }
  if (!G.lessonDone && G.lessonOn <= 0 && input.hold && level.hammers.length) {
    const h = level.hammers.find((hh) => hh.z > B.z && !hh.broken);
    if (h && h.z - B.z < 9) { const tHit = predictHit(true, 1.0, B.u); if (tHit >= 0) { G.lessonOn = 0.001; G.tsTarget = 0.22; UI.showHint("brake", false); ev("lesson", { id: "brake" }); } }
  }
  if (G.lessonOn > 0) {
    G.lessonOn += rdt;
    if (!input.hold || G.lessonOn > 2.6) { G.lessonDone = true; G.lessonOn = 0; G.tsTarget = 1; UI.hideHint(); if (!input.hold) UI.banner(T("banner.nice"), "#7FD6FF"); }
  }
}

// ================= main step =================
function step(dt) {
  G.t += dt;
  G.timeScale = damp(G.timeScale, G.tsTarget, G.tsTarget < 1 ? 7 : 4, dt);
  const gdt = dt * G.timeScale;
  if (G.st === "intro") { G.introT += dt; level.update(gdt, G.ht += gdt, P.sweeperRpm); ballIdle(dt); }
  else if (G.st === "play") {
    const active = G.phase === "run" || G.phase === "ramp" || G.phase === "air" || G.phase === "field" || G.phase === "falling";
    if (active) { G.playT += gdt; G.ht += gdt; }
    if (G.phase === "run") { G.clock -= gdt; if (G.clock <= 8 && Math.floor(G.clock + gdt) !== Math.floor(G.clock) && G.clock > 0) audio.play("tick2"); if (G.clock <= 0) { G.clock = 0; ev("time_up"); endGame("lose", "time"); } }
    if (G.phase === "run" || G.phase === "ramp" || G.phase === "air" || G.phase === "field") stepPhysics(gdt);
    else if (G.phase === "falling") {
      G.fallT += dt; B.vy -= level.gravity * gdt; B.y += B.vy * gdt; B.z += B.vz * gdt * 0.5; B.u += B.vu * gdt * 0.5;
      if (G.fallT > 1.3) {
        if (G.lives <= 0) { endGame("lose", "fall"); }
        else { let cp = 0; for (const c of level.checkpoints) if (c <= B.z - 1) cp = c; resetBall(cp + 1); B.invulnT = 1.6; G.phase = "run"; input.targetU = 0; ev("respawn"); }
      }
    } else if (G.phase === "clear") {
      G.clearT += dt;
      if (G.pendingCard && G.clearT > 1.4) {
        const pc = G.pendingCard; G.pendingCard = null;
        if (pc.last) { endGame("win"); }
        else G.lastReward = pc.total; UI.showLevelCard({ coins: pc.coins, mult: pc.mult, total: pc.total, stars: G.levelStars, best: pc.best, hasNext: nextPlayable(G.level) >= 0, ad: pc.total > 0 && Ads.rewardedAvailable() });
      }
    }
    level.update(gdt, G.ht, P.sweeperRpm);
    G.danger = computeDanger(); G.maxDanger = Math.max(G.maxDanger, G.danger); const sk = G.level + 1; G.maxDangerByStage[sk] = Math.max(G.maxDangerByStage[sk] || 0, G.danger);
  } else if (G.st === "menu") {
    G.ht += dt; level.update(dt, G.ht, P.sweeperRpm); ballIdle(dt);
  } else if (G.st === "end") {
    G.endT += dt; level.update(gdt * 0.3, G.ht += gdt * 0.3, P.sweeperRpm);
    if (G.endT > 1.0 && !UI.cardShown) showEndCard();
  }
  updateHints(dt); updateLesson(dt);
  updateParticles(gdt);
  // visuals
  const bp = level.P(B.z, B.u, B.y); ballGroup.position.copy(bp); ballMesh.quaternion.copy(B.quat); ballGroup.scale.setScalar(B.scale);
  shieldMesh.visible = B.shield; if (B.shield) shieldMesh.scale.setScalar(1 + Math.sin(G.t * 6) * 0.03);
  ballMesh.visible = !(B.invulnT > 0 && Math.floor(G.t * 12) % 2 === 0 && G.phase === "run");
  const sp = level.surface(B.z); const gy = sp && Math.abs(B.u) < sp.w / 2 + 0.3 ? sp.y : null;
  blob.visible = gy !== null && B.y - gy < 6; if (blob.visible) { blob.position.copy(level.P(B.z, B.u, gy + 0.03)); const h = B.y - B.r - gy; blob.scale.setScalar(B.scale * (1 + h * 0.15)); blob.material.opacity = clamp(1 - h * 0.15, 0.2, 1); }
  if (B.boostT > 0 && Math.random() < 0.8) burst(bp, 1, "#FF9A1A", 1.5, -1, 0.4);
  if (B.giantT > 0 && Math.random() < 0.4) burst(bp, 1, "#B99BFF", 2, -1, 0.5);
  if (B.magnetT > 0 && Math.random() < 0.3) burst(bp, 1, "#FF6A8A", 1.5, -1, 0.35);
  audio.setRoll(Math.abs(B.vz), B.ground && G.st === "play");
  if (sky) { sky.position.copy(camera.position); sky.material.uniforms.time.value = G.t; }
  updateCamera(dt, dt);
  // screen axis for steering (path b: world lateral projected to screen)
  const a0 = level.P(B.z, B.u, B.y).project(camera), a1 = level.P(B.z, B.u + 1, B.y).project(camera);
  const ax = ((a1.x - a0.x) * W) / 2, ay = (-(a1.y - a0.y) * H) / 2; const al = Math.hypot(ax, ay) || 1; axisScreen = { x: ax / al, y: ay / al, len: Math.max(20, al) };
  // HUD
  UI.update({ lives: G.lives, clock: G.clock, coins: G.total + G.coinsLevel, progress: clamp(B.z / level.rampZ, 0, 1), boostT: B.boostT, magnetT: B.magnetT, doubleT: B.doubleT, giantT: B.giantT, shield: B.shield, P, speed: B.vz / P.maxSpeed, boosting: B.boostT > 0, st: G.st, phase: G.phase, dt, danger: G.danger });
  if (G.phase === "field") UI.fieldMult(level.BANDS[level.bandAt(B.z)]); else UI.fieldMult(null);
  if (G.st === "intro") UI.setHandPos(W / 2, H * 0.78);
  if (UI.hintAnchor) { const s = level.P(B.z, B.u, B.y + 1.6).project(camera); UI.setHintAnchor(((s.x + 1) / 2) * W, ((1 - s.y) / 2) * H); }
}
function ballIdle(dt) { B.y = 0.5 + Math.abs(Math.sin(G.t * 3)) * 0.04; }
function showEndCard() {
  const o = G.outcome; let title, sub, reward = "", stars = 0, primary = "next";
  if (o === "win") { title = T("end.win.title"); sub = T("end.win.sub", { n: TOTAL_LEVELS }); reward = T("end.reward", { total: G.total }); stars = G.levelStars; }
  else { const prog = clamp(B.z / level.rampZ, 0, 1); title = prog >= 0.6 ? T("end.lose.title") : T("end.lose.titleFar"); sub = T(G.cause === "time" ? "end.lose.sub.time" : "end.lose.sub.fall"); primary = "replay"; }
  UI.showEndCard({ title, sub, reward, stars, outcome: o, primary, total: G.total, ad: o === "lose" && !G.revived && Ads.rewardedAvailable() ? "revive" : "" });
}

// ================= params live =================
function setParam(k, v, fromHost) {
  const c = clampParam(k, v); if (c === undefined) return; base[k] = c; userSet[k] = 1; const old = { ...P }; recomputeP();
  const d = DEF[k];
  if (k === "language") { LANG = pickLang(); document.documentElement.lang = LANG; UI.relabel(); return; }
  if (k === "playerColor" || k === "playerColor2") { ballMat.map.dispose(); ballMat.map = marbleTexture(P.playerColor, P.playerColor2); ballMat.needsUpdate = true; }
  if (k === "railColor" && level) { /* rebuild needed for stripes */ queueRestart(); }
  if (k === "hazardColor" && level) { level.hazardMats.forEach((m) => m.color.set(P.hazardColor)); }
  if (k === "coinColor" && level) level.coinMat.color.set(P.coinColor);
  if (k === "uiAccent") UI.setAccent(P.uiAccent);
  if (k === "sfxVolume" || k === "musicVolume") audio.applyVol();
  if (k === "cameraFov") layout();
  if (d && d.apply === "restart" && TEST) queueRestart();
  if (paused) renderFrame();
}
let restartQueued = false;
function queueRestart() { if (restartQueued) return; restartQueued = true; requestAnimationFrame(() => { restartQueued = false; if (G.st === "boot" || G.st === "menu") return; playLevel(G.level); }); }
UI.setAccent(P.uiAccent);

// ================= pause =================
let paused = false; const pauseFlags = { hidden: false, app: false, user: false, zero: false };
function updatePause() { const p = pauseFlags.hidden || pauseFlags.app || pauseFlags.user || pauseFlags.zero; const a = pauseFlags.hidden || pauseFlags.app || pauseFlags.user; if (p !== paused) { paused = p; if (!p) lastT = 0; } if (a !== audioSusp) { audioSusp = a; audio.suspend(a); } }
let audioSusp = false;
function setUserPause(on) { if (on && !(G.st === "play" || G.st === "intro")) return; pauseFlags.user = on; input.hold = false; ptr.id = null; updatePause(); if (on) UI.showPause(); else UI.hidePause(); if (on) renderFrame(); }
// leaving the app mid-level opens the pause menu so the run does not resume under the player's thumb
function appHidden(h) { if (h && G.st === "play" && G.phase === "run" && !pauseFlags.user) setUserPause(true); }
function handleBack() { // Android back / Escape: returns true when handled
  if (UI.closeTopMenu()) return true;
  if (pauseFlags.user) { setUserPause(false); return true; }
  if (G.st === "play" || G.st === "intro") { setUserPause(true); return true; }
  if (G.st === "end") { goMenu("levels"); return true; }
  if (G.st === "menu" && UI.menuScreen !== "home") { UI.showMenu("home", menuState()); return true; }
  return false;
}
document.addEventListener("visibilitychange", () => { pauseFlags.hidden = document.hidden; appHidden(document.hidden); updatePause(); });
setInterval(() => { if (pauseFlags.hidden !== document.hidden) { pauseFlags.hidden = document.hidden; updatePause(); } }, 500);

// ================= __game test hook =================
function boxOf(obj) {
  if (!obj || !obj.visible) return null; const b = new THREE.Box3().setFromObject(obj); if (b.isEmpty()) return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const v = new THREE.Vector3(); let behind = 0;
  for (let i = 0; i < 8; i++) { v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera); if (v.z > 1) behind++; const sx = ((v.x + 1) / 2) * W, sy = ((1 - v.y) / 2) * H; x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy); }
  if (behind === 8) return null; return { x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1) };
}
function objEntry(obj, extra) { const box = boxOf(obj); const cz = { x0: 0, y0: Math.max(0, (H - 600 * Math.min(W / 390, 1)) / 2), x1: W, y1: H }; let on = false; if (box) { const iw = Math.max(0, Math.min(box.x1, cz.x1) - Math.max(box.x0, cz.x0)), ih = Math.max(0, Math.min(box.y1, H) - Math.max(box.y0, 0)); const a = Math.max(1, (box.x1 - box.x0) * (box.y1 - box.y0)); on = (iw * ih) / a >= 0.5; } return { exists: !!obj, drawn: !!box, onScreen: on, box, ...(extra || {}) }; }
function nearest(list) { let best = null, bd = 1e9; for (const o of list) { const d = o.z - B.z; if (d > -3 && d < bd) { bd = d; best = o; } } return best; }
function frameStats() {
  try { renderFrame(); const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); g.drawImage(renderer.domElement, 0, 0, 64, 64); const d = g.getImageData(0, 0, 64, 64).data;
    let sat = 0, vivid = 0, white = 0, clip = 0, luma = 0, grey = 0; const lum = [];
    for (let i = 0; i < d.length; i += 4) { const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255; const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); const l = (mx + mn) / 2; const s = mx === mn ? 0 : l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn); sat += s; vivid += mx ? (mx - mn) / mx : 0; if (mn > 0.92) white++; if (d[i] >= 250 && d[i + 1] >= 250 && d[i + 2] >= 250) clip++; const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; luma += y; lum.push(y); if (s < 0.15) grey++; }
    const n = d.length / 4; lum.sort((a, b) => a - b); return { saturation: +(sat / n).toFixed(3), vivid: +(vivid / n).toFixed(3), whiteShare: +(white / n).toFixed(3), clipShare: +(clip / n).toFixed(3), luma: Math.round(luma / n), luma90: Math.round(lum[Math.floor(n * 0.9)]), greyShare: +(grey / n).toFixed(3), dark: G.themeId === "space" };
  } catch (e) { return {}; }
}
function info(opts) {
  const L = level; const h = L && nearest(L.hammers), s = L && nearest(L.sweepers), wl = L && nearest(L.walls.filter((w) => w.intact));
  const objects = L ? {
    marble: objEntry(ballMesh, { x: B.u, y: B.y, pos: [ballGroup.position.x, ballGroup.position.y, ballGroup.position.z], speed: +B.vz.toFixed(2) }),
    hammer: h ? objEntry(h.group, { pos: [h.group.position.x, 0, h.group.position.z] }) : { exists: false },
    sweeper: s ? objEntry(s.group, { pos: [s.group.position.x, 0, s.group.position.z] }) : { exists: false },
    wall: wl ? objEntry(wl.cubes[5].m, { pos: [0, 0, wl.z] }) : { exists: false },
    ramp: objEntry(L.rampMesh), field: objEntry(L.fieldMesh), finale: objEntry(L.arch),
    goal: { id: G.phase === "run" ? (h && h.z - B.z < 20 ? "hammer" : "ramp") : "field" }
  } : {};
  if (opts && opts.scene) objects.scene = frameStats();
  const counters = { coins: { real: G.total + G.coinsLevel, shown: { hud: UI.shown("coins"), goal: null, card: UI.cardShown ? G.total : null } }, lives: { real: G.lives, shown: { hud: UI.shown("lives"), goal: null, card: null } }, clock: { real: Math.ceil(G.clock), shown: { hud: UI.shown("clock"), goal: null, card: null } } };
  return {
    t: +G.playT.toFixed(3), st: G.st, stage: G.level + 1, phase: G.phase, won: G.won, gated: false, outcome: G.outcome, cause: G.cause,
    progress: L ? +clamp(B.z / L.rampZ, 0, 1).toFixed(3) : 0, danger: +G.danger.toFixed(3), maxDanger: +G.maxDanger.toFixed(3), maxDangerByStage: G.maxDangerByStage,
    seed: G.seed, lockedFor: G.st === "intro" || G.phase === "clear" ? 0 : 0, lives: G.lives, clock: +G.clock.toFixed(2), coins: G.total + G.coinsLevel, levelCoins: G.coinsLevel, mult: G.mult,
    counters, hud: { lives: G.lives, clock: Math.ceil(G.clock), coins: G.total + G.coinsLevel, level: G.level + 1 },
    textures: { total: 0, loaded: 0 }, scenario: TRAILER ? Number(URLP.get("trailer")) || 1 : 0, events: G.events.slice(), rewards: ["coin", "powerup", "stage_complete"],
    visible: L ? { count: L.hammers.length + L.sweepers.length + L.walls.length + L.gaps.length, pace: +(1 / (L.hammers[0]?.period || P.hammerPeriod) + P.sweeperRpm / 60).toFixed(3), layout: [L.hammers.length > 0, L.sweepers.length > 0, L.walls.length > 0, L.gaps.length > 0].filter(Boolean).length + (L.railSpans.length ? 0 : 1) } : {},
    labels: [], objects, assets: { loaded: [], fallback: [] }, layout: { design: "390x844", min: "320x480", critical: "390x600", framing: framing() },
    loop: { zones: ["track", "ramp", "field"], firstRewardAt: G.firstRewardAt, firstPayoffAt: G.firstPayoffAt, inFlight: 0, inFlightByStage: {} },
    fx: true, nogl: false, lang: LANG, difficulty: P.difficulty
  };
}
function framing() { if (!level) return {}; const v = ballGroup.position.clone().project(camera); const f = level.P(B.z + 20, 0, 0).project(camera); return { playerY: +((1 - v.y) / 2).toFixed(3), farY: +((1 - f.y) / 2).toFixed(3), heroPx: (boxOf(ballMesh) ? boxOf(ballMesh).y1 - boxOf(ballMesh).y0 : 0) }; }
function botInput(mode) {
  const L = level; if (!L) return { hold: false, targetU: 0 };
  if (G.st === "intro") return { begin: true, hold: true, targetU: 0 };
  if (G.st !== "play") return { hold: false, targetU: B.u };
  if (G.phase === "field" || G.phase === "air") { const stop = B.z + (B.vz * B.vz) / (2 * P.brakeDecel * 0.6); const tgt = L.bandCenter(9); return { hold: G.phase === "air" ? true : stop < tgt, targetU: 0 }; }
  if (G.phase !== "run" && G.phase !== "ramp") return { hold: true, targetU: 0 };
  const w = L.w; let tu = 0;
  const sw = L.sweepers.find((s) => s.z + s.Lb > B.z - 0.5 && s.z - B.z < 14 && !s.broken); if (sw) tu = (L.sweepers.indexOf(sw) % 2 ? 1 : -1) * (w / 2 - 0.42);
  else { const pu = L.pus.find((p) => !p.taken && p.z > B.z + 1 && p.z - B.z < 14); if (pu) tu = pu.u; else { const c = L.coins.find((cc) => !cc.taken && cc.z > B.z + 0.5 && cc.z - B.z < 8); if (c && Math.abs(c.u) < w / 2 - 0.6) tu = c.u; } }
  tu = clamp(tu, -(w / 2 - 0.42), w / 2 - 0.42);
  let hold = true;
  if (mode !== "no:brake" && !(TRAILER && G.playT > 6)) {
    const hit = predictHit(true, 2.2, B.u);
    if (hit >= 0) {
      // distance to the entry of the nearest moving hazard ahead
      const entry = predictHit.entry; // entry of the hazard that would hit
      const stopDist = (B.vz * B.vz) / (2 * P.brakeDecel);
      if (entry > 0.3 && entry < stopDist + 2.5) hold = false; // brake at the last safe moment, wait with a short run-up; inside the zone, commit
      if (!hold && B.vz < 0.5 && Math.abs(tu - B.u) > 0.15 && entry > 1.0 && (G.t * 10) % 2 < 1) hold = true; // tap to slide into the lane while waiting
    }
  }
  return { hold, targetU: tu };
}
function applyBotInput(inp) { if (!inp) return; if (inp.begin && G.st === "intro") { audio.unlock(); begin(); } input.hold = !!inp.hold; if (typeof inp.targetU === "number") input.targetU = inp.targetU; if (inp.next && (UI.cardShown || G.phase === "clear")) { if (G.st === "end") onNext(); else if (UI.levelCardShown) onNext(); } }

function renderFrame() { renderer.render(scene, camera); UI.drawOverlay(); }
let frames = 0, fpsEMA = 60, lastRaf = 0;
const __game = {
  step(n = 1, dt = 1 / 30, inp = null) { for (let i = 0; i < n; i++) { const sub = Math.ceil(dt / (1 / 60)); for (let k = 0; k < sub; k++) { let ii = typeof inp === "function" ? inp(__game) : inp; if (ii) applyBotInput(ii); step(dt / sub); } } renderFrame(); return info(); },
  render() { renderFrame(); }, info, begin() { audio.unlock(); begin(); },
  bot(mode) { return botInput(mode); },
  next() { onNext(); }, replay() { onReplay(); },
  stats() { const r = renderer.info; return { tris: r.render.triangles, calls: r.render.calls, fps: Math.round(fpsEMA), geometries: r.memory.geometries, textures: r.memory.textures, programs: r.programs ? r.programs.length : 0 }; },
  params() { const o = {}; for (const k in DEF) { const d = DEF[k]; o[k] = { label: d.label, group: d.group, type: d.type, def: d.def, min: d.min, max: d.max, step: d.step, options: d.options, apply: d.apply, value: base[k] }; } return o; },
  setParam(id, v) { const k = DEF[id] ? id : Object.keys(DEF).find((kk) => snake(kk) === id); if (!k) return; if (DEF[k].pct && Number(v) > 1) v = Number(v) / 100; setParam(k, v); },
  play(i) { playLevel(i); }, ad(k) { return onAd(k); }, ads() { return Ads; }, ui() { return UI; }, pause(on) { setUserPause(on); }, menu(sc) { goMenu(sc); }, save() { return SAVE; }, back() { return handleBack(); },
  probe() { return { hero: { x: ballGroup.position.x, y: ballGroup.position.y, z: ballGroup.position.z, yaw: 0, scale: B.scale }, camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z }, counters: info().counters, threats: level ? level.hammers.length + level.sweepers.length : 0, ball: { ...B, quat: undefined } }; },
  project(x, y, z) { const v = new THREE.Vector3(x, y, z).project(camera); return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, on: v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 }; },
  audioLog() { return audio.log.slice(); },
  restart() { playLevel(G.level); },
  _predict(h, hz, u) { const t = predictHit(h, hz, u === undefined ? B.u : u); return { t, entry: predictHit.entry }; }
};

// ================= loop =================
let lastT = 0;
// Adaptive quality: if the phone cannot hold ~50 fps while playing, lower the render resolution step by step (min 55%),
// then switch shadows off. The result is saved so the next launch starts at the right level.
let perfLow = 0, perfCool = 4;
function adaptQuality(dt) {
  if (G.st !== "play" || paused || G.zero) { perfLow = 0; return; }
  if ((perfCool -= dt) > 0) return;
  if (fpsEMA >= 50) { perfLow = Math.max(0, perfLow - dt); return; }
  if ((perfLow += dt) < 1.5) return;
  perfLow = 0; perfCool = 3; perf.tuned = true;
  if (perf.scale > 0.56) perf.scale = Math.max(0.55, perf.scale - 0.15);
  else if (!perf.noShadow) perf.noShadow = true; else return;
  applyQuality(); layout(); if (SAVE) { SAVE.perf = { scale: perf.scale, noShadow: perf.noShadow }; writeSave(SAVE); }
}
function frame(ts) {
  requestAnimationFrame(frame);
  if (TEST && URLP.has("still")) return; // QA: only render when the test harness steps (fast, stable screenshots)
  if (lastRaf) { const iv = (ts - lastRaf) / 1000; if (iv > 0) fpsEMA = fpsEMA * 0.9 + (1 / iv) * 0.1; } lastRaf = ts;
  if (G.zero || paused) { lastT = 0; return; }
  let dt = lastT ? (ts - lastT) / 1000 : 1 / 60; lastT = ts; dt = clamp(dt, 0, 0.05);
  if (!TEST) adaptQuality(dt);
  if (TEST && !URLP.has("live")) { renderFrame(); return; }
  if (TRAILER || (TEST && URLP.has("autoplay"))) { const inp = botInput(); applyBotInput(inp); if (UI.levelCardShown && G.phase === "clear") onNext(); }
  const n = Math.max(1, Math.ceil(dt / (1 / 60))); for (let i = 0; i < n; i++) step(dt / n);
  renderFrame();
}

// ================= boot =================
async function boot() {
  SAVE = await loadSave();
  if (TEST && !URLP.has("keepsave")) SAVE = { ...SAVE, unlocked: 999, settings: { ...SAVE.settings, language: base.language, difficulty: base.difficulty } };
  if (SAVE.perf) { perf.scale = clamp(Number(SAVE.perf.scale) || 1, 0.55, 1); perf.noShadow = !!SAVE.perf.noShadow; }
  else if (ANDROID && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3)) { perf.scale = 0.8; perf.noShadow = true; }
  applySettings(); applySkin(); applyQuality();
  layout(); startRun();
  initNative({ onBack: handleBack, onPause: () => { pauseFlags.app = true; appHidden(true); updatePause(); }, onResume: () => { pauseFlags.app = false; updatePause(); } });
  if (TEST && !URLP.has("menu")) playLevel(clamp((Number(URLP.get("level")) || 1) - 1, 0, TOTAL_LEVELS - 1));
  else { G.st = "menu"; goMenu("home"); }
  const ld = document.getElementById("loader"); ld.style.opacity = "0"; setTimeout(() => (ld.style.display = "none"), 320); hideSplash();
  Ads.init({ start: () => audio.setMuted(true), end: () => audio.setMuted(false) }, SAVE.adsRemoved, TEST && URLP.has("fakeads")).then(() => UI.refreshMenus && UI.refreshMenus(menuState()));
  if (TEST) window.__game = __game;
  requestAnimationFrame(frame);
}
boot();
