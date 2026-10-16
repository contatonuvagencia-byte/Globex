// Renderiza index.html em MP4 (tamanho do palco, 30 fps) quadro a quadro.
// Uso: node render.mjs [saida.mp4] [--stills dir]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : join(here, 'fim-da-escala-6x1-sinait.mp4'));
const stillsIdx = process.argv.indexOf('--stills');
const FPS = 30;

// a página temporária fica na mesma pasta para o logo (caminho relativo) carregar
const page_ = join(here, '.render.html');
writeFileSync(page_, '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style></head><body>' + readFileSync(join(here, 'index.html'), 'utf8') + '</body></html>');

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ proxy });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.goto(pathToFileURL(page_).href + '?export=1', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const fonts = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight));
console.log('fontes carregadas:', fonts.join(', ') || 'nenhuma');
const dur = await page.evaluate(() => window.__duration);
const stage = page.locator('#stage');

if (stillsIdx > -1) {
  const dir = resolve(process.argv[stillsIdx + 1]); mkdirSync(dir, { recursive: true });
  for (const s of (process.env.STILLS || '1.5,3.6,6,10,12.6,14,18,21.5,23.6,26,29,32.3,35.5').split(',').map(Number)) {
    await page.evaluate((x) => window.__seek(x), s);
    await stage.screenshot({ path: join(dir, `t${String(s).replace('.', '_')}.png`) });
  }
  await browser.close(); process.exit(0);
}

const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = Math.round(dur * FPS);
for (let f = 0; f < frames; f++) {
  await page.evaluate((x) => window.__seek(x), f / FPS);
  const buf = await stage.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('vídeo:', out);
