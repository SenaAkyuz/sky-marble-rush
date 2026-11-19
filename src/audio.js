// Synth audio engine: sfx + music loop + rolling noise. No samples.
export function createAudio(getVol) {
  let ctx = null, master = null, sfxBus = null, musBus = null, rollGain = null, rollFilter = null;
  let muted = false, suspended = false, musicOn = false, nextNoteT = 0, step = 0;
  const last = {}; const log = [];
  const gaps = { tap: 0.05, coin: 0.035, power: 0.2, whoosh: 0.5, hit: 0.1, smash: 0.2, jump: 0.2, fall: 1, launch: 1, land: 0.4, tick: 0.05, tick2: 0.8, win: 1, lose: 1, life: 0.5, bump: 0.15 };

  function unlock() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.connect(ctx.destination);
        sfxBus = ctx.createGain(); sfxBus.connect(master);
        musBus = ctx.createGain(); musBus.connect(master);
        // rolling noise
        const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = buf.getChannelData(0);
        let b = 0; for (let i = 0; i < d.length; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 4; }
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        rollFilter = ctx.createBiquadFilter(); rollFilter.type = "lowpass"; rollFilter.frequency.value = 300;
        rollGain = ctx.createGain(); rollGain.gain.value = 0;
        src.connect(rollFilter); rollFilter.connect(rollGain); rollGain.connect(sfxBus); src.start();
        // one-sample buffer for iOS
        const o = ctx.createBufferSource(); o.buffer = ctx.createBuffer(1, 1, 22050); o.connect(ctx.destination); o.start(0);
      }
      if (ctx.state === "suspended" && !suspended) ctx.resume();
      applyVol();
    } catch (e) {}
  }
  function applyVol() {
    if (!ctx) return; const v = getVol();
    sfxBus.gain.value = muted ? 0 : v.sfx * 2.2; musBus.gain.value = muted ? 0 : v.music * 1.6;
  }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(type, f0, f1, dur, vol, t0 = 0, bus) {
    const t = ctx.currentTime + t0; const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, 0.006, vol, dur); o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, fType, f0, f1, t0 = 0, q = 1) {
    const t = ctx.currentTime + t0; const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf; const f = ctx.createBiquadFilter(); f.type = fType; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain(); env(g, t, 0.01, vol, dur); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur + 0.05);
  }
  const SFX = {
    tap() { tone("sine", 880, 660, 0.06, 0.25); },
    coin(k = 0) { const b = 1320 * Math.pow(1.06, k % 6); tone("square", b, b, 0.05, 0.12); tone("square", b * 1.5, b * 1.5, 0.09, 0.1, 0.045); },
    power() { [523, 659, 784, 1046].forEach((f, i) => tone("triangle", f, f, 0.12, 0.3, i * 0.06)); },
    whoosh() { noise(0.45, 0.5, "bandpass", 400, 1800, 0, 1.5); },
    hit() { tone("sine", 160, 50, 0.25, 0.8); noise(0.12, 0.4, "lowpass", 2000, 300); },
    bump() { tone("sine", 220, 120, 0.1, 0.35); },
    smash() { noise(0.5, 0.8, "lowpass", 3000, 200); tone("square", 110, 40, 0.3, 0.35); for (let i = 0; i < 5; i++) tone("triangle", 600 + Math.random() * 900, 300, 0.08, 0.15, 0.03 * i); },
    jump() { tone("sine", 300, 900, 0.25, 0.45); tone("triangle", 600, 1500, 0.2, 0.15, 0.03); },
    fall() { tone("sine", 700, 80, 1.0, 0.45); noise(0.9, 0.2, "bandpass", 1500, 200, 0, 2); },
    launch() { tone("sawtooth", 120, 900, 0.9, 0.25); noise(1.0, 0.4, "bandpass", 300, 3000, 0, 1.2); [784, 988, 1175].forEach((f, i) => tone("triangle", f, f, 0.2, 0.2, 0.3 + i * 0.08)); },
    land() { tone("sine", 140, 60, 0.3, 0.7); noise(0.18, 0.3, "lowpass", 1200, 200); },
    tick() { tone("triangle", 1900, 1900, 0.03, 0.12); },
    tick2() { tone("square", 1000, 1000, 0.07, 0.15); },
    life() { [659, 880, 1318].forEach((f, i) => tone("triangle", f, f, 0.15, 0.3, i * 0.08)); },
    win() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone("triangle", f, f, 0.22, 0.3, i * 0.1)); tone("sine", 262, 262, 0.9, 0.3, 0); },
    lose() { [523, 466, 415, 349].forEach((f, i) => tone("triangle", f, f, 0.3, 0.3, i * 0.17)); }
  };
  function play(id, arg) {
    log.push(id); if (log.length > 400) log.shift();
    if (!ctx || muted || suspended) return;
    const now = ctx.currentTime; if (last[id] !== undefined && now - last[id] < (gaps[id] || 0.05)) return; last[id] = now;
    try { SFX[id] && SFX[id](arg); } catch (e) {}
  }
  // Music: 128 bpm, C - G - Am - F, bass + plucks + soft hats
  const prog = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]];
  const mel = [72, 76, 79, 76, 74, 79, 83, 79, 76, 72, 76, 81, 77, 81, 84, 81];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function schedule() {
    if (!ctx || !musicOn || suspended) return;
    const spb = 60 / 128 / 2; // eighth notes
    while (nextNoteT < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % 4, s = step % 8, ch = prog[bar], t0 = nextNoteT - ctx.currentTime;
      if (s % 2 === 0) tone("triangle", mtof(ch[0] - 12), mtof(ch[0] - 12), spb * 1.6, 0.35, t0, musBus);
      if (s === 2 || s === 6) ch.forEach((n) => tone("sine", mtof(n + 12), mtof(n + 12), spb * 1.2, 0.08, t0, musBus));
      if (s % 2 === 1) { tone("square", mtof(mel[(step >> 1) % 16]), mtof(mel[(step >> 1) % 16]), spb * 0.8, 0.045, t0, musBus); }
      // hat
      const t = ctx.currentTime + Math.max(0, t0); const n = 800; const buf = ctx.createBuffer(1, n, ctx.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ctx.createBufferSource(); src.buffer = buf; const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.value = s % 2 ? 0.05 : 0.09; src.connect(f); f.connect(g); g.connect(musBus); src.start(t);
      nextNoteT += spb; step++;
    }
  }
  setInterval(schedule, 60);
  return {
    unlock, play, log,
    startMusic() { if (!ctx) return; if (!musicOn) { musicOn = true; nextNoteT = ctx.currentTime + 0.05; } },
    stopMusic() { musicOn = false; },
    setRoll(speed, onGround) { if (!ctx || !rollGain) return; const tgt = muted || suspended || !onGround ? 0 : Math.min(1, speed / 18) * 0.5; rollGain.gain.setTargetAtTime(tgt, ctx.currentTime, 0.05); rollFilter.frequency.setTargetAtTime(150 + speed * 40, ctx.currentTime, 0.05); },
    setMuted(m) { muted = m; applyVol(); if (ctx && rollGain && m) rollGain.gain.value = 0; },
    isMuted() { return muted; },
    suspend(s) { suspended = s; try { if (ctx) { if (s) ctx.suspend(); else { ctx.resume(); setTimeout(() => { try { !suspended && ctx.resume(); } catch (e) {} }, 1000); } } } catch (e) {} },
    applyVol
  };
}
