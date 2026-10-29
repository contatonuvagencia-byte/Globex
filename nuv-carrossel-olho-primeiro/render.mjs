// Exporta cada slide do carrossel em PNG 1080x1350 (out/slide-N.png) e JPG leve.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1500 } });
await page.goto('file://' + ROOT + '/index.html');
await page.evaluate(async () => {
  await Promise.all(["400 40px Display", "400 40px DisplaySemi", "italic 400 40px Accent", "400 40px Script", "400 40px Comfortaa", "700 40px Comfortaa"].map(f => document.fonts.load(f, 'Aá')));
  await document.fonts.ready;
  await new Promise(r => setTimeout(r, 400));
});
const ids = await page.evaluate(() => [...document.querySelectorAll('.slide')].map(e => e.id));
for (const id of ids) {
  const name = id.startsWith('s') && /^s\d+$/.test(id) ? 'slide-' + id.slice(1) : 'opcao-' + id;
  const png = `${ROOT}/out/${name}.png`;
  await page.locator('#' + id).screenshot({ path: png });
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', png, '-q:v', '2', `${ROOT}/out/${name}.jpg`]);
  console.log('ok', name);
}
await browser.close();
