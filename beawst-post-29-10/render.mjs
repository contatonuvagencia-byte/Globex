// Gera out/post-faltam-9-dias.png (1080x1350). Uso: node render.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.goto(pathToFileURL(path.join(dir, 'post.html')).href);
await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
await page.screenshot({ path: path.join(dir, 'out', 'post-faltam-9-dias.png') });
await browser.close();
console.log('ok');
