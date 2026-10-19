// Renderiza video.html quadro a quadro e codifica em MP4 (1080x1920, 30fps).
// Uso: node render.mjs [saida.mp4] [--stills 1.5,4,7]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const stillsIdx = args.indexOf('--stills');
const stills = stillsIdx >= 0 ? args[stillsIdx + 1].split(',').map(Number) : null;
const out = (stillsIdx === 0 ? null : args[0]) || path.join(dir, 'out', 'beawst-feira-silent.mp4');
const FPS = 30;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(dir, 'video.html')).href + '?render');
await page.evaluate(() => document.fonts.ready);
const DUR = await page.evaluate(() => window.DUR);

if (stills) {
  for (const t of stills) {
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({ path: path.join(dir, 'out', `still-${t}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] });
const total = Math.round(DUR * FPS);
for (let i = 0; i < total; i++) {
  await page.evaluate(t => window.render(t), i / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 60 === 0) console.log(`frame ${i}/${total}`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('ok', out);
