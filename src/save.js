// Persistent progress: localStorage, mirrored to Capacitor Preferences on device (survives WebView storage purges).
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";

const KEY = "smr.save.v1";
const DEFAULT = () => ({ v: 1, stars: [], best: [], unlocked: 1, coins: 0, skins: ["classic"], skin: "classic", settings: { music: true, sfx: true, language: "auto", quality: "high", difficulty: "normal" }, lessonDone: false });
const native = () => { try { return Capacitor.isNativePlatform(); } catch (e) { return false; } };

function merge(d) { const s = DEFAULT(); if (!d || typeof d !== "object") return s; Object.assign(s, d); s.settings = Object.assign(DEFAULT().settings, d.settings || {}); if (!Array.isArray(s.skins) || !s.skins.includes("classic")) s.skins = ["classic", ...(Array.isArray(s.skins) ? s.skins : [])]; return s; }

export async function loadSave() {
  let raw = null;
  if (native()) { try { raw = (await Preferences.get({ key: KEY })).value; } catch (e) {} }
  if (!raw) { try { raw = localStorage.getItem(KEY); } catch (e) {} }
  try { return merge(raw ? JSON.parse(raw) : null); } catch (e) { return DEFAULT(); }
}
let timer = null;
export function writeSave(s) {
  const raw = JSON.stringify(s);
  try { localStorage.setItem(KEY, raw); } catch (e) {}
  if (native()) { clearTimeout(timer); timer = setTimeout(() => { Preferences.set({ key: KEY, value: raw }).catch(() => {}); }, 150); }
}
export function resetSave() { const s = DEFAULT(); writeSave(s); return s; }
