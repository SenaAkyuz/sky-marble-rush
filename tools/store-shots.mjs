// Store screenshots with device frame + caption, Turkish + English.
//   npm run shots            (builds a QA build first, see package.json)
//   node tools/store-shots.mjs [html] [outDir]
// Output: store/screens/<android|ios>-<tr|en>/NN-name.png   (android 1080x1920, ios 1290x2796)
import { chromium } from "playwright";
import fs from "fs"; import path from "path"; import { pathToFileURL } from "url";
const file = path.resolve(process.argv[2] || "dist/sky-marble-rush-v01.html");
const outRoot = path.resolve(process.argv[3] || "store/screens");
const LANGS = (process.env.LANGS || "tr,en").split(",");
const FORMATS = { android: { w: 1080, h: 1920 }, ios: { w: 1290, h: 2796 } };
const VP = { width: 390, height: 844 };
const FONT = `'Arial Black','Segoe UI Black','Archivo Black',Impact,system-ui,sans-serif`;
// scene id -> caption per language
const CAPTION = {
  "01-oyun": { tr: "Basılı tut, yuvarlan!", en: "Hold to roll!" },
  "02-cekic": { tr: "Çekiçlerden kaç!", en: "Dodge the hammers!" },
  "03-rampa": { tr: "Mega rampadan uç!", en: "Fly off the mega ramp!" },
  "04-carpan": { tr: "x20 çarpana kon!", en: "Land on the x20!" },
  "05-tamam": { tr: "Yıldız ve altın topla", en: "Collect stars & coins" },
  "06-bolumler": { tr: "4 dünya, 24 bölüm", en: "4 worlds, 24 levels" },
  "07-bilyeler": { tr: "Bilye kostümlerini aç", en: "Unlock marble skins" },
};
const browser = await chromium.launch({ args: ["--ignore-gpu-blocklist"] });

async function capture(lang) {
  const page = await browser.newPage({ viewport: VP, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(file).href + "?test&still&lang=" + lang);
  await page.waitForFunction(() => window.__game && window.__game.info().st !== "boot", null, { timeout: 120000 });
  const raw = {};
  const shot = async (n) => { raw[n] = (await page.screenshot({ timeout: 120000 })).toString("base64"); };
  const until = (cond, max = 400) => page.evaluate(([c, max]) => { const f = new Function("i", "return " + c); for (let k = 0; k < max; k++) { const i = window.__game.step(2, 1 / 30, (g) => g.bot()); if (f(i)) return true; } return false; }, [cond, max]);
  const step = (n, bot) => page.evaluate(([n, bot]) => window.__game.step(n, 1 / 30, bot ? (g) => g.bot() : null), [n, bot]);
  await page.evaluate(() => window.__game.play(1)); await until("i.t > 4.5"); await shot("01-oyun");
  await page.evaluate(() => window.__game.play(7)); await until("i.t > 7"); await shot("02-cekic");
  await page.evaluate(() => window.__game.play(14)); await until("i.phase === 'air'", 2000); await step(12, true); await shot("03-rampa");
  await page.evaluate(() => window.__game.play(19)); await until("i.phase === 'field'", 2000); await until("i.phase === 'clear'", 2000); await step(3, false); await shot("04-carpan");
  await step(70, false); await page.waitForTimeout(1800); await shot("05-tamam");
  // pretty progress for the menus: most levels done with stars, coins to spend
  await page.evaluate(() => { const s = window.__game.save(); s.stars = [3,3,3,3,3,3,3,2,3,3,3,3,3,2,3,3,3,3,2,3,3,2,1,0]; s.best = s.stars.map((x) => (x ? 900 + x * 300 : 0)); s.unlocked = 24; s.coins = 3480; });
  await page.evaluate(() => window.__game.menu("levels")); await step(20, false); await page.waitForTimeout(600);
  await page.evaluate(() => { const m = document.querySelector(".mscroll"); if (m) m.scrollTop = 0; }); await page.waitForTimeout(300); await shot("06-bolumler");
  await page.evaluate(() => window.__game.menu("shop")); await step(10, false); await page.waitForTimeout(600); await shot("07-bilyeler");
  await page.close(); return raw;
}

function html(W, H, caption, b64) {
  const capH = Math.round(H * 0.175), pw = Math.round(W * 0.74), bz = Math.round(W * 0.018);
  const iw = pw - 2 * bz, ih = Math.round(iw * VP.height / VP.width), ph = ih + 2 * bz, rad = Math.round(pw * 0.115);
  const fs = Math.round(W * 0.088);
  return `<!doctype html><html><body style="margin:0"><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:linear-gradient(180deg,#2C7FE6 0%,#5DB1FA 55%,#A9DCFF 100%);font-family:${FONT}">
  <div style="position:absolute;width:${W * 0.9}px;height:${W * 0.9}px;border-radius:50%;left:${-W * 0.35}px;top:${H * 0.5}px;background:rgba(255,255,255,.14)"></div>
  <div style="position:absolute;width:${W * 0.7}px;height:${W * 0.7}px;border-radius:50%;right:${-W * 0.3}px;top:${H * 0.12}px;background:rgba(255,255,255,.12)"></div>
  <div style="position:absolute;left:0;right:0;top:0;height:${capH}px;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 ${W * 0.06}px;box-sizing:border-box">
    <div style="font-size:${fs}px;line-height:1.08;font-weight:900;color:#fff;text-wrap:balance;letter-spacing:.01em;text-shadow:0 ${Math.round(fs * 0.07)}px 0 rgba(18,58,140,.45),0 ${Math.round(fs * 0.14)}px ${Math.round(fs * 0.3)}px rgba(10,40,110,.35)">${caption}</div></div>
  <div style="position:absolute;left:${(W - pw) / 2}px;top:${capH}px;width:${pw}px;height:${ph}px;border-radius:${rad}px;background:linear-gradient(145deg,#2b3140,#0c0f16);box-shadow:0 ${W * 0.035}px ${W * 0.08}px rgba(8,36,100,.5),inset 0 0 0 ${Math.max(2, Math.round(W * 0.003))}px rgba(255,255,255,.18)">
    <img src="data:image/png;base64,${b64}" style="position:absolute;left:${bz}px;top:${bz}px;width:${iw}px;height:${ih}px;border-radius:${rad - bz}px;display:block"></div>
  </div></body></html>`;
}

// start clean; a locked file (open in Photos / Explorer preview) is reported with its name instead of a cryptic error
for (const dev of Object.keys(FORMATS)) for (const lang of LANGS) {
  try { fs.rmSync(path.join(outRoot, `${dev}-${lang}`), { recursive: true, force: true }); }
  catch (e) { console.error(`\nKapatilamadi: ${path.join(outRoot, dev + "-" + lang)}\nBu klasordeki bir gorsel baska bir programda acik (Fotograflar, Explorer onizleme). Kapatip tekrar dene.`); process.exit(1); }
}
for (const lang of LANGS) {
  const raw = await capture(lang);
  for (const [dev, { w, h }] of Object.entries(FORMATS)) {
    const dir = path.join(outRoot, `${dev}-${lang}`); fs.mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    for (const [id, b64] of Object.entries(raw)) {
      await page.setContent(html(w, h, CAPTION[id][lang], b64), { waitUntil: "load" });
      await page.screenshot({ path: path.join(dir, id + ".png") });
    }
    await page.close(); console.log("ok", dev, lang);
  }
}
await browser.close();
