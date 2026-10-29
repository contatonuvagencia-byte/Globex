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
  await Promise.all(["400 40px Display", "italic 400 40px Display", "400 40px Script", "500 40px Sans", "600 40px Sans", "700 40px Sans"].map(f => document.fonts.load(f, 'Aá')));
  await document.fonts.ready;
  await new Promise(r => setTimeout(r, 400));
});
const n = await page.evaluate(() => document.querySelectorAll('.slide').length);
for (let i = 1; i <= n; i++) {
  const png = `${ROOT}/out/slide-${i}.png`;
  await page.locator('#s' + i).screenshot({ path: png });
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', png, '-q:v', '2', `${ROOT}/out/slide-${i}.jpg`]);
  console.log('ok slide', i);
}
await browser.close();
