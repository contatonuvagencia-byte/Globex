// Exporta cada post (.post) em PNG 2x (out/<id>.png). Os JPEGs para o Instagram saem do exportar.py.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 2 });
await page.goto('file://' + ROOT + '/index.html');
await page.evaluate(async () => {
  await Promise.all(['400 40px Display', 'italic 400 40px Accent', '400 40px Comfortaa', '700 40px Comfortaa'].map(f => document.fonts.load(f, 'Aá')));
  await document.fonts.ready;
  await Promise.all([...document.querySelectorAll('.ph')].map(el => new Promise(r => {
    const u = getComputedStyle(el).backgroundImage.slice(5, -2); const i = new Image(); i.onload = i.onerror = r; i.src = u;
  })));
});
for (const id of await page.evaluate(() => [...document.querySelectorAll('.post')].map(e => e.id))) {
  await page.locator(`[id="${id}"]`).screenshot({ path: `${ROOT}/out/${id}.png` });
  console.log('ok', id);
}
await browser.close();
