// Gera out/story-1..6.png (1080x1920) + versões -GUIA com a marcação dos stickers. Uso: node render.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
const NOMES = ['recap-no-feed', 'enquete-assistiu', 'parabens-ganhadoras', 'proxima-edicao', 'e-agora', 'cta-quero'];
const COM_GUIA = [1, 2, 4, 6];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
for (let i = 1; i <= 6; i++) for (const g of COM_GUIA.includes(i) ? [false, true] : [false]) {
  await page.goto(pathToFileURL(path.join(dir, 'stories.html')).href + `?p=${i}${g ? '&guia=1' : ''}`);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  if (!g) {
    const bad = await page.evaluate(i => [...document.querySelectorAll(`#s${i} .abs,#s${i} .foot,#s${i} .top`)].filter(e => e.textContent.trim())
      .filter(e => { const b = e.getBoundingClientRect(); return b.top < 250 || b.bottom > 1580 || b.right > 1000; }).map(e => e.textContent.trim().slice(0, 25)), i);
    if (bad.length) console.log(i, 'FORA:', bad.join(' | '));
  }
  await page.screenshot({ path: path.join(out, `story-${i}-${NOMES[i - 1]}${g ? '-GUIA' : ''}.png`) });
}
await browser.close(); console.log('ok');
