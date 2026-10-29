// Gera out/story-presentes.png e a versão guia (onde colar o link). Uso: node render.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
for (const guia of [false, true]) {
  await page.goto(pathToFileURL(path.join(dir, 'story.html')).href + (guia ? '?guia=1' : ''));
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  if (!guia) {
    const bad = await page.evaluate(() => [...document.querySelectorAll('.abs')].filter(e => e.textContent.trim())
      .map(e => e.getBoundingClientRect()).filter(r => r.top < 250 || r.bottom > 1580).length);
    console.log(bad ? 'TEXTO FORA DA ZONA SEGURA' : 'zona segura ok');
  }
  await page.screenshot({ path: path.join(dir, 'out', `story-presentes${guia ? '-GUIA' : ''}.png`) });
}
await browser.close();
