// Gera as peças de 07/11 (estamos no ar): post 1080x1350 e story 1080x1920 (+ GUIA). Uso: node render.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out');
fs.mkdirSync(out, { recursive: true });
const PECAS = { post: ['post-estamos-no-ar', 1350], s1: ['story-estamos-no-ar', 1920], s2: ['story-ao-vivo-link-na-bio', 1920], s3: ['story-intervalo-link', 1920] };
const browser = await chromium.launch();
for (const [p, [name, h]] of Object.entries(PECAS)) {
  const page = await browser.newPage({ viewport: { width: 1080, height: h } });
  for (const guia of p.startsWith('post') || p === 's2' ? [false] : [false, true]) {
    await page.goto(pathToFileURL(path.join(dir, 'pecas.html')).href + `?p=${p}${guia ? '&guia=1' : ''}`);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
    if (!guia && h === 1920) {
      const bad = await page.evaluate(p => [...document.querySelectorAll(`#${p} .abs`)].filter(e => e.textContent.trim())
        .map(e => e.getBoundingClientRect()).filter(r => r.top < 250 || r.bottom > 1580).length, p);
      console.log(`${name}: ${bad ? 'TEXTO FORA DA ZONA SEGURA' : 'zona segura ok'}`);
    }
    await page.screenshot({ path: path.join(out, `${name}${guia ? '-GUIA' : ''}.png`) });
  }
  await page.close();
}
await browser.close();
