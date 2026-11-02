// Exporta todas as artes de index.html como PNG 1080x1350 (caminho em data-out de cada slide).
// Para usar foto real: coloque fotos/DD-MM.jpg (ex.: fotos/04-11.jpg) e rode de novo.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tmp = join(here, '.export.html');
writeFileSync(tmp, '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style></head><body>' + readFileSync(join(here, 'index.html'), 'utf8') + '</body></html>');
const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.goto(pathToFileURL(tmp).href + '?export=1', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const slides = page.locator('.slide');
const n = await slides.count();
for (let i = 0; i < n; i++) {
  const out = join(here, 'artes', await slides.nth(i).getAttribute('data-out'));
  mkdirSync(dirname(out), { recursive: true });
  await slides.nth(i).screenshot({ path: out });
}
await browser.close(); unlinkSync(tmp);
console.log(n, 'artes exportadas em artes/');
