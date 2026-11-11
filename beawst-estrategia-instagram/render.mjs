// Gera out/Estrategia-Instagram-BEAWST.pdf (A4) + prévias PNG. Uso: node render.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(dir, 'estrategia.html')).href);
await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
await page.pdf({ path: path.join(out, 'Estrategia-Instagram-BEAWST.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
// conferência: páginas que estouram a altura
const over = await page.evaluate(() => [...document.querySelectorAll('.page')].map((p, i) => [i + 1, Math.max(...[...p.children].map(c => c.getBoundingClientRect().bottom - p.getBoundingClientRect().top))]).filter(([, b]) => b > 1123 - 30));
console.log(over.length ? 'ESTOURO: ' + JSON.stringify(over) : 'layout ok');
await browser.close();
