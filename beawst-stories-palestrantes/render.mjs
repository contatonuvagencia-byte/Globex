// Gera os PNGs dos stories (arte limpa + versão guia com a posição dos adesivos).
// Uso: node render.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out');
fs.mkdirSync(out, { recursive: true });
const STORIES = { 1: 'story-1-quem-vai-falar', 2: 'story-2-leia-malta', 3: 'story-3-alessandra-irlanda' };
const SAFE = { top: 250, bottom: 340 };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [n, name] of Object.entries(STORIES)) {
  for (const guia of [false, true]) {
    await page.goto(pathToFileURL(path.join(dir, 'stories.html')).href + `?s=${n}${guia ? '&guia=1' : ''}`);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
    if (!guia) {
      // nenhum texto fora da zona segura
      const bad = await page.evaluate(({ n, SAFE }) => [...document.querySelectorAll(`#s${n} .abs`)].filter(e => e.textContent.trim())
        .map(e => e.getBoundingClientRect()).filter(r => r.top < SAFE.top || r.bottom > 1920 - SAFE.bottom).length, { n, SAFE });
      console.log(`${name}: ${bad ? 'TEXTO FORA DA ZONA SEGURA' : 'zona segura ok'}`);
    }
    await page.screenshot({ path: path.join(out, `${name}${guia ? '-GUIA' : ''}.png`) });
  }
}
await browser.close();
