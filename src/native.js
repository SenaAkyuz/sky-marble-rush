// Native shell glue (no-ops in a browser): status bar, splash, Android back button, app pause/resume, external links.
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Browser } from "@capacitor/browser";

export const isNative = () => { try { return Capacitor.isNativePlatform(); } catch (e) { return false; } };

export function initNative({ onBack, onPause, onResume }) {
  if (!isNative()) return;
  StatusBar.hide().catch(() => {});
  App.addListener("backButton", () => { if (!onBack()) App.exitApp(); });
  App.addListener("appStateChange", ({ isActive }) => { if (isActive) onResume(); else onPause(); });
}
export function hideSplash() { if (isNative()) SplashScreen.hide().catch(() => {}); }
export function openUrl(url) { if (isNative()) Browser.open({ url }).catch(() => {}); else try { window.open(url, "_blank", "noopener"); } catch (e) {} }
