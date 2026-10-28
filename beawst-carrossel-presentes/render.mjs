// Gera os 8 slides do carrossel (1080x1350) em out/slide-N.png.
// Uso: node render.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
for (let n = 1; n <= 8; n++) {
  await page.goto(pathToFileURL(path.join(dir, 'carrossel.html')).href + `?s=${n}`);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  // texto não pode sair da área do slide nem encostar na borda (margem de 60px)
  const bad = await page.evaluate(n => [...document.querySelectorAll(`#s${n} .abs, #s${n} .foot`)].filter(e => e.textContent.trim())
    .map(e => e.getBoundingClientRect()).filter(r => r.left < 60 || r.right > 1020 || r.top < 50 || r.bottom > 1300).length, n);
  if (bad) console.warn(`slide ${n}: texto perto da borda`);
  await page.screenshot({ path: path.join(out, `slide-${n}.png`) });
}
await browser.close();
console.log('ok');
