// Gera as peças de 06/11: post do feed (1080x1350) e 4 stories (1080x1920, + versões GUIA). Uso: node render.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out');
fs.mkdirSync(out, { recursive: true });
const PECAS = { post: ['post-e-amanha-programacao', 1350], post2: ['post-e-amanha-feira', 1350], s1: ['story-1-e-amanha', 1920], s2: ['story-2-enquete-inscricao', 1920],
  s3: ['story-3-programacao', 1920], s4: ['story-4-lembrete-contagem', 1920] };
const browser = await chromium.launch();
for (const [p, [name, h]] of Object.entries(PECAS)) {
  const page = await browser.newPage({ viewport: { width: 1080, height: h } });
  for (const guia of p.startsWith('post') || p === 's3' ? [false] : [false, true]) {
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
