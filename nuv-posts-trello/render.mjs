// Renderiza cada slide (.post) em PNG 2x em out/png/<id>.png
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const ROOT = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(`${ROOT}/out/png`, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 2 });
await page.goto('file://' + ROOT + '/index.html');
await page.evaluate(async () => {
  await Promise.all(['900 40px Title', 'italic 300 40px TitleI', '400 40px Comfortaa', '700 40px Comfortaa'].map(f => document.fonts.load(f, 'Aá')));
  await document.fonts.ready;
  await Promise.all([...document.querySelectorAll('.ph')].map(el => new Promise(r => {
    const i = new Image(); i.onload = i.onerror = r; i.src = getComputedStyle(el).backgroundImage.slice(5, -2);
  })));
});
for (const id of await page.evaluate(() => [...document.querySelectorAll('.post')].map(e => e.id))) {
  await page.locator(`[id="${id}"]`).screenshot({ path: `${ROOT}/out/png/${id}.png` });
}
await browser.close();
console.log('ok');
