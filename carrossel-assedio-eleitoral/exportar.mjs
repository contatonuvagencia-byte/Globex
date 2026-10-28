// Exporta cada slide de index.html como PNG 1080x1350.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tmp = join(here, '.export.html');
writeFileSync(tmp, '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style></head><body>' + readFileSync(join(here, 'index.html'), 'utf8') + '</body></html>');
const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.goto(pathToFileURL(tmp).href + '?export=1', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const n = await page.locator('.slide').count();
for (let i = 0; i < n; i++) await page.locator('.slide').nth(i).screenshot({ path: join(here, `slide-${i + 1}.png`) });
await browser.close(); unlinkSync(tmp);
console.log(n, 'slides exportados');
