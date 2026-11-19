// Store screenshots: iPhone 6.9" (1290x2796) and Android phone (1080x1920), Turkish + English -> store/screens/
import { chromium } from "playwright";
import fs from "fs"; import path from "path"; import { pathToFileURL } from "url";
const file = path.resolve("dist/sky-marble-rush-v01.html");
const SIZES = { ios: { width: 430, height: 932 }, android: { width: 360, height: 640 } };
const LANGS = (process.env.LANGS || "tr,en").split(",");
const browser = await chromium.launch({ args: ["--ignore-gpu-blocklist"] });
for (const lang of LANGS) for (const [dev, vp] of Object.entries(SIZES)) {
  const out = path.resolve("store/screens", `${dev}-${lang}`); fs.mkdirSync(out, { recursive: true });
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 3 });
  await page.goto(pathToFileURL(file).href + "?test&lang=" + lang);
  await page.waitForFunction(() => window.__game && window.__game.info().st !== "boot", null, { timeout: 60000 });
  const shot = (n) => page.screenshot({ path: path.join(out, n + ".png") });
  const until = (cond, max = 400) => page.evaluate(([c, max]) => { const f = new Function("i", "return " + c); for (let k = 0; k < max; k++) { const i = window.__game.step(2, 1 / 30, (g) => g.bot()); if (f(i)) return true; } return false; }, [cond, max]);
  // 1 gameplay with coins, level 2
  await page.evaluate(() => window.__game.play(1)); await until("i.t > 4.5"); await shot("02-oyun");
  // 2 hammers, level 8
  await page.evaluate(() => window.__game.play(7)); await until("i.t > 7"); await shot("03-cekic");
  // 3 mega ramp flight, level 15
  await page.evaluate(() => window.__game.play(14)); await until("i.phase === 'air'", 2000); await page.evaluate(() => window.__game.step(12, 1 / 30, (g) => g.bot())); await shot("04-rampa");
  // 4 rainbow field, level 20
  await page.evaluate(() => window.__game.play(19)); await until("i.phase === 'field'", 2000); await page.evaluate(() => window.__game.step(8, 1 / 30, (g) => g.bot())); await shot("05-carpan");
  // 5 level clear card
  await until("i.phase === 'clear'", 2000); await page.evaluate(() => window.__game.step(70, 1 / 30)); await shot("06-tamam");
  // menus
  await page.evaluate(() => window.__game.menu("home")); await page.evaluate(() => window.__game.step(20, 1 / 30)); await shot("01-ana-menu");
  await page.evaluate(() => window.__game.menu("shop")); await page.evaluate(() => window.__game.step(5, 1 / 30)); await shot("07-bilyeler");
  await page.close(); console.log("ok", dev, lang);
}
await browser.close();
