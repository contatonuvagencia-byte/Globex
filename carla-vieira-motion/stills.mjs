// Quick QA: screenshot specific timestamps. usage: node stills.mjs W H outdir t1 t2 ...
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const [W, H, outdir, ...ts] = process.argv.slice(2);
const dir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +W, height: +H } });
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
await page.goto(pathToFileURL(path.join(dir, process.env.PAGE || 'index.html')).href + `?render&w=${W}&h=${H}`);
await page.evaluate(() => document.fonts.ready);
for (const t of ts) {
  await page.evaluate((t) => window.renderFrame(t), +t);
  await page.screenshot({ path: path.join(outdir, `t${String(t).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 80 });
}
await browser.close();
