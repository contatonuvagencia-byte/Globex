// Gera out/recap-global-connect-1..5.png (1080x1350). Uso: node render.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 1; i <= 5; i++) {
  await page.goto(pathToFileURL(path.join(dir, 'carrossel.html')).href + '?p=' + i);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  const bad = await page.evaluate(i => [...document.querySelectorAll(`#s${i} .abs`)].filter(e => { const b = e.getBoundingClientRect(); return b.right > 1000 || b.bottom > 1290; }).map(e => e.textContent.trim().slice(0, 25)), i);
  if (bad.length) console.log(i, 'FORA:', bad.join(' | '));
  await page.screenshot({ path: path.join(out, `recap-global-connect-${i}.png`) });
}
await browser.close(); console.log('ok');
