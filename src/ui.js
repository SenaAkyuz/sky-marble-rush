const ICON = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="#fff"></path></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8.2" fill="none" stroke="#fff" stroke-width="2.6"></circle><path d="M12 13V8.6M12 13l3.2 2" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"></path><rect x="9.5" y="1.6" width="5" height="2.6" rx="1" fill="#fff"></rect></svg>',
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#fff"></circle><circle cx="12" cy="12" r="6.2" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="2"></circle><path d="M12 7.5v9" stroke="rgba(0,0,0,.22)" stroke-width="2.4" stroke-linecap="round"></path></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"></path><path d="M16 8.5c1.6 1.8 1.6 5.2 0 7M18.6 6c3 3.2 3 8.8 0 12" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"></path></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"></path><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"></path></svg>',
  boost: '<svg viewBox="0 0 24 24"><path d="M13.5 2L5 13.5h5.5L9.5 22 19 9.5h-5.6z" fill="#fff"></path></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 2.5l8 3v5.5c0 5-3.4 9-8 10.5C7.4 20 4 16 4 11V5.5z" fill="#fff"></path></svg>',
  magnet: '<svg viewBox="0 0 24 24"><path d="M6 4v8a6 6 0 0012 0V4" stroke="#fff" stroke-width="4" fill="none"></path></svg>',
  double: '<svg viewBox="0 0 24 24"><text x="12" y="17" text-anchor="middle" font-size="13" font-weight="900" fill="#fff" font-family="system-ui,sans-serif">x2</text></svg>',
  giant: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#fff"></circle><circle cx="9" cy="9" r="2.2" fill="rgba(0,0,0,.2)"></circle></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2.2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.2l-6 3.3 1.3-6.7-5-4.6 6.8-.8z" fill="#fff"></path></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="#fff"></rect><rect x="14" y="5" width="4" height="14" rx="1.5" fill="#fff"></rect></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"></rect><path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="currentColor" stroke-width="2.6" fill="none"></path></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm8.4 4.6l1.6 1.2-1.8 3.2-1.9-.7a7.6 7.6 0 01-1.9 1.1l-.3 2h-3.7l-.3-2a7.6 7.6 0 01-1.9-1.1l-1.9.7-1.8-3.2 1.6-1.2a7.4 7.4 0 010-2.2L2.5 9.7l1.8-3.2 1.9.7a7.6 7.6 0 011.9-1.1l.3-2h3.7l.3 2a7.6 7.6 0 011.9 1.1l1.9-.7 1.8 3.2-1.6 1.2a7.4 7.4 0 010 2.2z" fill="currentColor"></path></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor"></rect><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor"></rect><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor"></rect><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor"></rect></svg>',
  ball: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor"></circle><path d="M5 9c4 1 9-3 14 1M5.5 15c5-2 8 2 13-1" stroke="#fff" stroke-width="1.8" fill="none" opacity=".8"></path><circle cx="9" cy="8" r="1.6" fill="#fff"></circle></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
  hand: '<svg viewBox="0 0 64 64"><path d="M26 30V10a5 5 0 0110 0v16l12.5 3.2c3.6.9 5.8 4.4 5.1 8L51 51c-.6 3.2-3.4 5.5-6.7 5.5H31.5c-2.4 0-4.6-1.2-5.9-3.2L16 38.6c-1.6-2.5-.9-5.8 1.6-7.3 2.2-1.4 5.1-.9 6.8 1.1z" fill="#fff" stroke="#2a2a3a" stroke-width="3" stroke-linejoin="round"></path></svg>'
};
const PU_COL = { boost: "#FF8A1A", shield: "#3FB8FF", magnet: "#FF3B5C", double: "#FFC21A", giant: "#9B6CFF" };

export function buildUI(o) {
  const { T } = o; const root = document.getElementById("ui");
  root.innerHTML = `
  <div class="hud" id="hud">
    <div class="hrow">
      <div class="stat" id="hLives">${ICON.heart}<b data-hud="lives">3</b></div>
      <div class="clockbox"><div class="lvl" id="hLvl"></div><div class="stat big" id="hClock">${ICON.clock}<b data-hud="clock">45</b></div></div>
      <div class="stat" id="hCoins">${ICON.coin}<b data-hud="coins">0</b></div>
    </div>
    <div class="prog"><div class="bar"><i id="hBar"></i><span id="hDot"></span></div></div>
    <div class="pus" id="hPus"></div>
  </div>
  <button class="mute pausebtn" id="bPause" data-ui aria-label="Pause">${ICON.pause}</button>
  <div class="banner" id="banner" data-cover></div>
  <div class="lbanner" id="lbanner" data-cover><small></small><b></b></div>
  <div class="fmult" id="fmult" data-cover></div>
  <div class="hint" id="hint" data-cover><div class="hand" id="hand">${ICON.hand}</div><div class="htext" id="htext"></div></div>
  <div class="ec" id="ec">
    <div class="dim"></div><div class="rays"></div>
    <div class="ecwrap">
      <div class="ec-copy-panel" data-end-copy-panel>
        <div class="chip" data-end-id><img id="ecIcon" alt=""><span id="ecName"></span></div>
        <div class="ectitle" id="ecTitle"></div>
        <div class="ecsub" id="ecSub"></div>
        <div class="ecstars" id="ecStars"></div>
        <div class="ecreward" id="ecReward"></div>
      </div>
      <div class="ecbtns"><button class="btn secondary ad" id="bAd" data-ui></button><button class="btn primary" id="bNext" data-ui></button><button class="btn secondary" id="bReplay" data-ui></button><button class="btn link" id="bMenu" data-ui></button></div>
    </div>
  </div>
  <div class="menu" id="menu" data-ui></div>
  <div class="pause" id="pause" data-ui><div class="dim"></div><div class="pbox"><div class="ptitle" id="pTitle"></div><button class="btn primary" id="pResume" data-ui></button><button class="btn secondary" id="pRestart" data-ui></button><button class="btn secondary" id="pQuit" data-ui></button></div></div>
  <div class="toast" id="toast"></div>`;
  const $ = (id) => document.getElementById(id);
  const ov = document.createElement("canvas"); ov.id = "ov"; root.prepend(ov); const og = ov.getContext("2d");
  const ui = { cardShown: false, levelCardShown: false, hintKind: null, hintAnchor: false };
  let W = 390, H = 844, dpr = 1; const lines = []; let speed = 0, boosting = false, danger = 0, lowClock = false, tAcc = 0;
  const bindBtn = (el, fn) => { let lastP = 0; el.addEventListener("pointerdown", (e) => { e.stopPropagation(); }); el.addEventListener("pointerup", (e) => { e.stopPropagation(); if (!el.dataset.ready) return; lastP = performance.now(); fn(); }); el.addEventListener("click", (e) => { e.stopPropagation(); if (performance.now() - lastP < 600 || !el.dataset.ready) return; fn(); }); };
  bindBtn($("bAd"), () => o.onAd && o.onAd(ec.dataset.ad)); bindBtn($("bNext"), () => o.onNext()); bindBtn($("bReplay"), () => o.onReplay()); bindBtn($("bMenu"), () => { o.tap(); o.onMenu(); });
  for (const id of ["bPause", "pResume", "pRestart", "pQuit"]) $(id).dataset.ready = 1;
  bindBtn($("bPause"), () => { o.tap(); o.onPause(); }); bindBtn($("pResume"), () => { o.tap(); o.onResume(); }); bindBtn($("pRestart"), () => { o.tap(); o.onRestart(); }); bindBtn($("pQuit"), () => { o.tap(); o.onQuit(); });
  const icon = document.querySelector('link[rel="icon"]'); if (icon) $("ecIcon").src = icon.href;
  $("ecName").textContent = (window.CONFIG && CONFIG.meta.title) || "";

  ui.showHud = (on) => { $("hud").style.display = on ? "" : "none"; $("bPause").style.display = on ? "" : "none"; };
  ui.showPause = () => { $("pTitle").textContent = T("ui.paused"); $("pResume").textContent = T("ui.resume"); $("pRestart").textContent = T("ui.restart"); $("pQuit").textContent = T("ui.menu"); $("pause").classList.add("show"); };
  ui.hidePause = () => $("pause").classList.remove("show");
  let toastT = null; ui.toast = (txt) => { const t = $("toast"); t.textContent = txt; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1600); };
  ui.setAccent = (c) => document.documentElement.style.setProperty("--accent", c);
  ui.setLevel = (n, world) => { $("hLvl").textContent = T("lvl.n", { n }) + " · " + T("lvl." + world); ui._lvl = [n, world]; };
  ui.relabel = () => { if (ui._lvl) ui.setLevel(ui._lvl[0], ui._lvl[1]); if (ui.hintKind) ui.showHint(ui.hintKind, ui._hand); if (ui._card) ui._card(); if (ui.menuScreen && ui._ms) ui.showMenu(ui.menuScreen, ui._ms); if ($("pause").classList.contains("show")) ui.showPause(); };
  let bannerT = null;
  ui.banner = (txt, col) => { const b = $("banner"); b.textContent = txt; b.style.color = col || "#fff"; b.classList.remove("show"); void b.offsetWidth; b.classList.add("show"); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove("show"), 1100); };
  ui.levelBanner = (a, b) => { const el = $("lbanner"); el.querySelector("small").textContent = a; el.querySelector("b").textContent = b; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2200); };
  ui.pulse = (id) => { const el = { coins: $("hCoins"), lives: $("hLives"), clock: $("hClock") }[id]; if (!el) return; el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); };
  const HINTS = { start: "hint.start", hold: "hint.hold", holdHand: "hint.hold", brake: "hint.brake", field: "hint.field" };
  ui.showHint = (kind, hand) => {
    ui.hintKind = kind; ui._hand = hand; const h = $("hint"); h.classList.add("show"); $("htext").textContent = T(HINTS[kind] || kind);
    const showHand = hand || kind === "holdHand" || kind === "start"; $("hand").style.display = showHand ? "block" : "none";
    h.className = "hint show " + (kind === "start" ? "anim-slide" : kind === "brake" ? "anim-release brake" : kind === "field" ? "anim-release" : "anim-hold");
    ui.hintAnchor = kind === "hold" || kind === "holdHand";
    if (!ui.hintAnchor) { h.style.left = "50%"; h.style.top = ""; h.style.bottom = "16%"; }
    if (kind === "field") setTimeout(() => { if (ui.hintKind === "field") ui.hideHint(); }, 2600);
  };
  ui.flashHint = (txt) => { const h = $("hint"); if (ui.hintKind === "brake") return; ui.hintKind = "flash"; h.className = "hint show"; $("hand").style.display = "none"; $("htext").textContent = txt; h.style.left = "50%"; h.style.top = ""; h.style.bottom = "16%"; ui.hintAnchor = false; setTimeout(() => { if (ui.hintKind === "flash") ui.hideHint(); }, 1800); };
  ui.hideHint = () => { ui.hintKind = null; ui.hintAnchor = false; $("hint").classList.remove("show"); };
  ui.setHandPos = () => {};
  ui.setHintAnchor = (x, y) => { const h = $("hint"); x = Math.max(W * 0.3, Math.min(W * 0.7, x)); h.style.left = x + "px"; h.style.top = Math.max(120, y - 40) + "px"; h.style.bottom = "auto"; };
  ui.fieldMult = (m) => { const el = $("fmult"); if (m === null || m === undefined) { el.classList.remove("show"); return; } el.classList.add("show"); el.textContent = "x" + m; };
  const shownVals = {};
  let lastCoins = -1, lastLives = -1, lastClock = -1;
  ui.update = (s) => {
    const c = Math.ceil(Math.max(0, s.clock));
    if (s.coins !== lastCoins) { lastCoins = s.coins; root.querySelector('[data-hud="coins"]').textContent = s.coins; }
    if (s.lives !== lastLives) { lastLives = s.lives; root.querySelector('[data-hud="lives"]').textContent = s.lives; }
    if (c !== lastClock) { lastClock = c; root.querySelector('[data-hud="clock"]').textContent = c; }
    lowClock = s.st === "play" && s.phase === "run" && c <= 8; $("hClock").classList.toggle("low", lowClock);
    $("hBar").style.width = (s.progress * 100).toFixed(1) + "%"; $("hDot").style.left = (s.progress * 100).toFixed(1) + "%";
    const act = []; if (s.boostT > 0) act.push(["boost", s.boostT / s.P.boostTime]); if (s.shield) act.push(["shield", 1]); if (s.magnetT > 0) act.push(["magnet", s.magnetT / s.P.magnetTime]); if (s.doubleT > 0) act.push(["double", s.doubleT / s.P.doubleTime]); if (s.giantT > 0) act.push(["giant", s.giantT / s.P.giantTime]);
    const key = act.map((a) => a[0]).join(",");
    if (key !== ui._puKey) { ui._puKey = key; $("hPus").innerHTML = act.map((a) => `<div class="pu" data-k="${a[0]}" style="--c:${PU_COL[a[0]]}">${ICON[a[0]]}<svg class="ring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="106.8" stroke-dashoffset="0" stroke-linecap="round"></circle></svg></div>`).join(""); }
    act.forEach((a) => { const el = $("hPus").querySelector(`[data-k="${a[0]}"] circle`); if (el) el.setAttribute("stroke-dashoffset", (106.8 * (1 - a[1])).toFixed(1)); });
    $("hud").style.opacity = s.st === "end" || ui.levelCardShown ? 0 : 1; $("bPause").style.opacity = s.st === "end" || ui.levelCardShown || s.phase === "clear" ? 0 : 1; $("bPause").style.pointerEvents = s.st === "end" || ui.levelCardShown || s.phase === "clear" ? "none" : "";
    speed = s.speed; boosting = s.boosting; danger = s.danger; tAcc += s.dt;
  };
  ui.shown = (id) => { const el = root.querySelector(`[data-hud="${id}"]`); return el ? Number(el.textContent) : null; };
  ui.layout = (w, h) => {
    W = w; H = h; dpr = Math.min(2, window.devicePixelRatio || 1); ov.width = w * dpr; ov.height = h * dpr; ov.style.width = w + "px"; ov.style.height = h + "px";
    const s = Math.min(w / 390, h / 844); const u = Math.max(0.82, Math.min(1.5, s * 1.0)); document.documentElement.style.setProperty("--u", u.toFixed(3));
    root.classList.toggle("land", w > h);
  };
  ui.drawOverlay = () => {
    og.setTransform(dpr, 0, 0, dpr, 0, 0); og.clearRect(0, 0, W, H);
    // speed lines
    const rate = (boosting ? 120 : 60) * Math.max(0, Math.min(1, (speed - 0.7) / 0.3));
    let spawn = rate / 60; while (spawn > 0) { if (Math.random() < spawn) lines.push({ a: Math.random() * Math.PI * 2, r: 0.3 + Math.random() * 0.3, l: 0.1 + Math.random() * 0.25, life: 0.12 + Math.random() * 0.08 }); spawn -= 1; }
    const cx = W / 2, cy = H * 0.52, R = Math.hypot(W, H) * 0.5;
    og.strokeStyle = "rgba(255,255,255,0.4)"; og.lineWidth = 1.2;
    for (let i = lines.length - 1; i >= 0; i--) { const L = lines[i]; L.life -= 1 / 60; L.r += 0.06; if (L.life <= 0 || lines.length > 40) { lines.splice(i, 1); continue; } const r0 = L.r * R, r1 = (L.r + L.l) * R; og.beginPath(); og.moveTo(cx + Math.cos(L.a) * r0, cy + Math.sin(L.a) * r0); og.lineTo(cx + Math.cos(L.a) * r1, cy + Math.sin(L.a) * r1); og.stroke(); }
    if (lowClock) { const a = 0.18 + 0.12 * Math.sin(tAcc * 10); const g = og.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.35, cx, H / 2, R); g.addColorStop(0, "rgba(255,40,60,0)"); g.addColorStop(1, `rgba(255,40,60,${a})`); og.fillStyle = g; og.fillRect(0, 0, W, H); }
  };
  // ---- cards ----
  const ec = $("ec");
  function openCard(cfg) {
    ui.cardShown = true; ec.classList.remove("show"); void ec.offsetWidth; ec.classList.add("show");
    const bs = ["bAd", "bNext", "bReplay", "bMenu"]; bs.forEach((b) => ($(b).dataset.ready = "")); setTimeout(() => bs.forEach((b) => ($(b).dataset.ready = 1)), 900);
    $("ecTitle").textContent = cfg.title; $("ecSub").textContent = cfg.sub; $("ecReward").textContent = cfg.reward || ""; $("ecReward").style.display = cfg.reward ? "" : "none";
    $("ecStars").innerHTML = cfg.stars ? [0, 1, 2].map((i) => `<span class="st ${i < cfg.stars ? "on" : ""}" style="animation-delay:${0.45 + i * 0.18}s">${ICON.star}</span>`).join("") : ""; $("ecStars").style.display = cfg.stars ? "" : "none";
    $("bNext").textContent = cfg.outcome === "win" ? T("ui.menu") : T("ui.next"); $("bReplay").textContent = cfg.win ? T("ui.playAgain") : T("ui.replay"); $("bMenu").textContent = T("ui.menu");
    $("bNext").style.display = cfg.showNext === false ? "none" : ""; $("bMenu").style.display = cfg.outcome === "win" ? "none" : ""; $("bMenu").className = "btn " + (cfg.outcome === "level" ? "link" : "secondary");
    $("bNext").className = "btn " + (cfg.primary === "next" ? "primary" : "secondary"); $("bReplay").className = "btn " + (cfg.primary === "replay" ? "primary" : "secondary");
    ec.dataset.outcome = cfg.outcome || ""; ec.dataset.ad = cfg.ad || "";
    const adB = $("bAd"); adB.style.display = cfg.ad ? "" : "none";
    if (cfg.ad) adB.innerHTML = '<svg class="adic" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="3.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M10 9v6l5-3z" fill="currentColor"/></svg>' + esc(cfg.ad === "revive" ? T("ad.continue") : T("ad.double", { total: cfg.adTotal || 0 }));
  }
  ui.showLevelCard = (c) => { ui.levelCardShown = true; ui._bonus = false; ui._lastTotal = c.total; ui._card = () => openCard({ title: T("end.level.title"), sub: T("end.level.sub", { coins: c.coins, mult: c.mult, total: c.total }) + (c.best ? " · " + T("end.best") : ""), reward: T("end.reward", { total: ui._bonus ? c.total * 2 : c.total }), stars: c.stars, primary: c.hasNext ? "next" : "replay", showNext: c.hasNext, win: true, outcome: "level", ad: c.ad && !ui._bonus ? "bonus" : "", adTotal: c.total }); ui._card(); };
  ui.showEndCard = (c) => { ui.levelCardShown = false; ui._card = () => openCard({ ...c, win: c.outcome === "win", showNext: c.outcome === "win" }); ui._card(); };
  ui.adDone = () => { ui._bonus = true; $("bAd").style.display = "none"; ec.dataset.ad = ""; if (ui.levelCardShown && ui._lastTotal != null) $("ecReward").textContent = T("end.reward", { total: ui._lastTotal * 2 }); };
  ui.hideCard = () => { ui.cardShown = false; ui.levelCardShown = false; ui._card = null; ec.classList.remove("show"); };
  // ---- menus ----
  const menu = $("menu"); ui.menuScreen = null;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const starRow = (n, cls = "") => `<span class="mstars ${cls}">${[0, 1, 2].map((i) => `<i class="${i < n ? "on" : ""}">${ICON.star}</i>`).join("")}</span>`;
  const pills = (st) => `<div class="mpills"><span class="mpill">${ICON.star}<b>${st.starsTotal}</b></span><span class="mpill gold">${ICON.coin}<b>${st.save.coins}</b></span></div>`;
  const head = (title, st) => `<div class="mhead"><button class="mback" data-act="home" data-ui aria-label="${esc(T("ui.back"))}">${ICON.back}</button><h2>${esc(title)}</h2>${st ? pills(st) : ""}</div>`;
  const swatch = (sk) => `<span class="swatch" style="--a:${sk.a};--b:${sk.b}"></span>`;
  let confirmOpen = false;
  function render(sc, st) {
    const S = st.save; let h = "";
    if (sc === "home") {
      const cur = st.current; const world = st.worlds[Math.floor(cur / st.perWorld)];
      h = `<div class="mscreen home">${pills(st)}<div class="logo"><div class="logo1">SKY MARBLE</div><div class="logo2">RUSH</div></div>
        <div class="homebtns"><button class="btn primary big" data-act="play" data-i="${cur}" data-ui>${esc(T("ui.play"))}<small>${esc(T("lvl.n", { n: cur + 1 }))} · ${esc(T("lvl." + world))}</small></button>
        <div class="iconrow"><button class="ibtn" data-act="levels" data-ui>${ICON.grid}<span>${esc(T("ui.levels"))}</span></button><button class="ibtn" data-act="shop" data-ui>${ICON.ball}<span>${esc(T("ui.shop"))}</span></button><button class="ibtn" data-act="settings" data-ui>${ICON.gear}<span>${esc(T("ui.settings"))}</span></button></div></div></div>`;
    } else if (sc === "levels") {
      h = `<div class="mscreen panel">${head(T("ui.levels"), st)}<div class="mscroll">`;
      st.worlds.forEach((w, wi) => {
        const gate = st.gates[wi]; const open = st.starsTotal >= gate; let ws = 0; for (let k = 0; k < st.perWorld; k++) ws += S.stars[wi * st.perWorld + k] || 0;
        h += `<section class="world w-${w} ${open ? "" : "locked"}"><div class="wtitle"><small>${esc(T("ui.world", { n: wi + 1 }))}</small><b>${esc(T("lvl." + w))}</b><span class="wst">${ICON.star}${ws}/${st.perWorld * 3}</span></div>`;
        if (!open) h += `<div class="wlock">${ICON.lock}${esc(T("ui.locked", { n: gate }))}</div>`;
        h += `<div class="lgrid">`;
        for (let k = 0; k < st.perWorld; k++) { const i = wi * st.perWorld + k; const un = open && i < S.unlocked; h += `<button class="ltile ${un ? "" : "off"} ${i === st.current ? "cur" : ""}" ${un ? `data-act="play" data-i="${i}"` : ""} data-ui><b>${i + 1}</b>${un ? starRow(S.stars[i] || 0) : `<span class="lk">${ICON.lock}</span>`}</button>`; }
        h += `</div></section>`;
      });
      h += `</div></div>`;
    } else if (sc === "shop") {
      h = `<div class="mscreen panel">${head(T("shop.title"), st)}<div class="mscroll"><div class="sgrid">`;
      for (const sk of st.skins) { const own = S.skins.includes(sk.id), use = S.skin === sk.id; h += `<button class="stile ${use ? "use" : ""} ${own ? "" : (S.coins >= sk.price ? "can" : "cant")}" data-act="${own ? "use" : "buy"}" data-id="${sk.id}" data-ui>${swatch(sk)}<b>${esc(T("skin." + sk.id))}</b><span class="sbtn">${use ? esc(T("shop.inUse")) : own ? esc(T("shop.use")) : `${ICON.coin}${sk.price}`}</span></button>`; }
      h += `</div></div></div>`;
    } else if (sc === "settings") {
      const se = S.settings; const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${se[k] === v ? "on" : ""}" data-act="set" data-k="${k}" data-v="${v}" data-ui>${esc(l)}</button>`).join("")}</div>`;
      const tog = (k) => seg(k, [[true, T("set.on")], [false, T("set.off")]]).replace(/data-v="(true|false)"/g, 'data-v="$1" data-bool="1"');
      h = `<div class="mscreen panel">${head(T("ui.settings"))}<div class="mscroll"><div class="srows">
        <div class="srow"><span>${esc(T("set.music"))}</span>${tog("music")}</div>
        <div class="srow"><span>${esc(T("set.sfx"))}</span>${tog("sfx")}</div>
        <div class="srow"><span>${esc(T("set.lang"))}</span>${seg("language", [["auto", T("set.auto")], ["tr", "Türkçe"], ["en", "English"]])}</div>
        <div class="srow"><span>${esc(T("set.diff"))}</span>${seg("difficulty", [["easy", T("diff.easy")], ["normal", T("diff.normal")], ["hard", T("diff.hard")]])}</div>
        <div class="srow"><span>${esc(T("set.quality"))}</span>${seg("quality", [["high", T("set.high")], ["low", T("set.low")]])}</div>
        <button class="slink" data-act="privacy" data-ui>${esc(T("set.privacy"))}</button>${o.adPrivacy && o.adPrivacy() ? `<button class="slink" data-act="adprivacy" data-ui>${esc(T("set.adPrivacy"))}</button>` : ""}
        <button class="slink danger" data-act="reset" data-ui>${esc(T("set.reset"))}</button>
        <div class="ver">Sky Marble Rush ${esc((window.CONFIG && CONFIG.meta.appVersion) || "")} · Ordino Games</div></div></div></div>`;
    }
    menu.innerHTML = h + `<div class="confirm" id="confirm"><div class="cbox"><p>${esc(T("set.resetQ"))}</p><button class="btn secondary dark" data-act="cno" data-ui>${esc(T("set.no"))}</button><button class="btn primary red" data-act="cyes" data-ui>${esc(T("set.yes"))}</button></div></div>`;
    confirmOpen = false;
  }
  menu.addEventListener("pointerdown", (e) => e.stopPropagation());
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return; e.stopPropagation(); const act = b.dataset.act; o.tap();
    if (act === "play") { o.onPlay(Number(b.dataset.i)); return; }
    if (act === "home" || act === "levels" || act === "shop" || act === "settings") { ui.showMenu(act, ui._ms); return; }
    if (act === "buy") { o.onBuy(b.dataset.id); return; }
    if (act === "use") { o.onUseSkin(b.dataset.id); return; }
    if (act === "set") { let v = b.dataset.v; if (b.dataset.bool) v = v === "true"; o.onSetting(b.dataset.k, v); return; }
    if (act === "privacy") { o.onPrivacy(); return; }
    if (act === "adprivacy") { o.onAdPrivacy && o.onAdPrivacy(); return; }
    if (act === "reset") { $("confirm").classList.add("show"); confirmOpen = true; return; }
    if (act === "cno") { $("confirm").classList.remove("show"); confirmOpen = false; return; }
    if (act === "cyes") { o.onReset(); return; }
  });
  ui.showMenu = (sc, st) => { const keep = sc === ui.menuScreen ? (menu.querySelector(".mscroll") || {}).scrollTop : 0; ui.menuScreen = sc; ui._ms = st; render(sc, st); menu.classList.add("show"); const sEl = menu.querySelector(".mscroll"); if (sEl) { if (keep) sEl.scrollTop = keep; else if (sc === "levels") { const c = menu.querySelector(".ltile.cur"); if (c) sEl.scrollTop = Math.max(0, c.closest("section").offsetTop - 10); } } };
  ui.refreshMenus = (st) => { ui._ms = st; if (ui.menuScreen) ui.showMenu(ui.menuScreen, st); };
  ui.hideMenus = () => { ui.menuScreen = null; menu.classList.remove("show"); menu.innerHTML = ""; };
  ui.closeTopMenu = () => { if (confirmOpen) { $("confirm").classList.remove("show"); confirmOpen = false; return true; } return false; };
  return ui;
}
