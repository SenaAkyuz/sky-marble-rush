// AdMob glue (no-ops in a browser unless ?fakeads is in the URL during ?test runs).
// Placements: rewarded "continue" after a loss, rewarded "x2 coins" on level clear, paced interstitial between rounds. No banners.
import { Capacitor } from "@capacitor/core";
import { AdMob } from "@capacitor-community/admob";

// Google's public sample units. Used whenever CONFIG.ads.testMode is true or a real ID is empty.
const TEST = {
  android: { interstitial: "ca-app-pub-3940256099942544/1033173712", rewarded: "ca-app-pub-3940256099942544/5224354917" },
  ios: { interstitial: "ca-app-pub-3940256099942544/4411468910", rewarded: "ca-app-pub-3940256099942544/1712485313" },
};

const native = () => { try { return Capacitor.isNativePlatform(); } catch (e) { return false; } };
const platform = () => { try { return Capacitor.getPlatform() === "ios" ? "ios" : "android"; } catch (e) { return "android"; } };
const cfg = () => (window.CONFIG && window.CONFIG.ads) || {};

const S = {
  fake: false, ready: false, removed: false, hooks: { start() {}, end() {} },
  intReady: false, rewReady: false, privacyReq: false,
  lastAdT: Date.now(), rounds: 0, busy: false,
};

function unitId(kind) {
  const c = cfg(); const p = platform();
  const real = c[p] && c[p][kind];
  const useTest = c.testMode !== false || !real;
  return { adId: useTest ? TEST[p][kind] : real, isTesting: useTest };
}

async function prepInterstitial() { S.intReady = false; try { const u = unitId("interstitial"); await AdMob.prepareInterstitial({ adId: u.adId, isTesting: u.isTesting }); S.intReady = true; } catch (e) { S.intReady = false; } }
async function prepRewarded() { S.rewReady = false; try { const u = unitId("rewarded"); await AdMob.prepareRewardVideoAd({ adId: u.adId, isTesting: u.isTesting }); S.rewReady = true; } catch (e) { S.rewReady = false; } }

export const Ads = {
  /** hooks.start()/end(): mute game audio while an ad is on screen. */
  async init(hooks, removed, fake) {
    S.hooks = hooks || S.hooks; S.removed = !!removed;
    if (!native()) { S.fake = !!fake; S.ready = S.fake; return; }
    try {
      // 1) Consent (Google UMP): shows the form only where the law requires it (EEA/UK etc.).
      try {
        const info = await AdMob.requestConsentInfo({});
        S.privacyReq = info.privacyOptionsRequirementStatus === "REQUIRED";
        if (info.isConsentFormAvailable && info.status === "REQUIRED") { await AdMob.showConsentForm(); const i2 = await AdMob.requestConsentInfo({}); S.privacyReq = i2.privacyOptionsRequirementStatus === "REQUIRED"; }
      } catch (e) {}
      // 2) iOS App Tracking Transparency prompt (after consent, as Google recommends).
      if (platform() === "ios") { try { const t = await AdMob.trackingAuthorizationStatus(); if (t.status === "notDetermined") await AdMob.requestTrackingAuthorization(); } catch (e) {} }
      // 3) SDK init + preload.
      await AdMob.initialize({});
      S.ready = true;
      AdMob.addListener("interstitialAdDismissed", () => { prepInterstitial(); });
      prepInterstitial(); prepRewarded();
    } catch (e) { S.ready = false; }
  },
  setRemoved(v) { S.removed = !!v; },
  enabled() { return S.ready && !S.removed; },
  rewardedAvailable() { return this.enabled() && (S.fake || S.rewReady); },
  /** Resolves true only if the player earned the reward. */
  async showRewarded() {
    if (!this.rewardedAvailable() || S.busy) return false;
    S.busy = true; S.hooks.start();
    try {
      if (S.fake) { await new Promise((r) => setTimeout(r, 250)); S.lastAdT = Date.now(); return true; }
      let earned = false; let h = null;
      try { h = await AdMob.addListener("onRewardedVideoAdReward", () => { earned = true; }); } catch (e) {}
      try { const r = await AdMob.showRewardVideoAd(); if (r && (r.amount > 0 || r.type)) earned = true; } catch (e) {}
      try { h && h.remove(); } catch (e) {}
      S.lastAdT = Date.now(); S.rewReady = false; prepRewarded();
      return earned;
    } finally { S.busy = false; S.hooks.end(); }
  },
  /** Call when the player taps NEXT / TRY AGAIN on a result card. Shows at most one interstitial, only when pacing allows. */
  async maybeInterstitial(levelIndex) {
    S.rounds += 1;
    if (!this.enabled() || S.busy) return;
    const c = cfg();
    const minLevel = c.interstitialFromLevel != null ? c.interstitialFromLevel : 3; // 0-based: never during levels 1-3
    const every = c.interstitialEveryRounds || 3, gap = (c.interstitialMinGapSec || 90) * 1000;
    if (levelIndex < minLevel || S.rounds < every || Date.now() - S.lastAdT < gap) return;
    if (S.fake) { S.rounds = 0; S.lastAdT = Date.now(); return; }
    if (!S.intReady) return;
    S.busy = true; S.hooks.start();
    try { await AdMob.showInterstitial(); S.rounds = 0; } catch (e) {} finally { S.lastAdT = Date.now(); S.busy = false; S.hooks.end(); prepInterstitial(); }
  },
  /** Settings -> "Privacy options" row, shown only when Google's UMP says it is required. */
  privacyOptionsRequired() { return S.ready && S.privacyReq; },
  async showPrivacyOptions() { try { await AdMob.showPrivacyOptionsForm(); } catch (e) {} },
};
