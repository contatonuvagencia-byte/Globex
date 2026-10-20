// Renderiza video.html quadro a quadro em MP4 H.264 sem áudio, mais 1 print por cena.
// Uso: node render.mjs            -> out/beawst-reels-palestra.mp4 + out/cena-1..6.png
//      node render.mjs --stills   -> só os prints
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(dir, 'out');
fs.mkdirSync(outDir, { recursive: true });
const onlyStills = process.argv.includes('--stills');

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(dir, 'video.html')).href + '?render');
await page.evaluate(() => window.ready);
const C = await page.evaluate(() => ({ ...window.CONFIG }));
await page.setViewportSize({ width: C.WIDTH, height: C.HEIGHT });

// confere a área segura: todo texto visível tem que estar dentro dela
const violations = await page.evaluate(() => {
  const { SAFE: S, WIDTH: W, HEIGHT: H, FPS, DURATION } = window.CONFIG;
  const bad = [];
  for (let f = 0; f < DURATION * FPS; f += 3) {
    window.render(f / FPS);
    document.querySelectorAll('.scene .item').forEach(el => {
      if (el.offsetParent === null || +getComputedStyle(el).opacity === 0) return;
      const r = el.getBoundingClientRect();
      // margem esquerda só é checada com o elemento já parado (os cards deslizam da esquerda)
      const settled = +getComputedStyle(el).opacity > 0.99;
      if ((settled && r.left < S.left - 0.5) || r.right > W - S.right + 0.5 || r.top < S.top - 0.5 || r.bottom > H - S.bottom + 0.5)
        bad.push(`${(f / FPS).toFixed(2)}s "${el.textContent.trim().slice(0, 30)}" [${r.left|0},${r.top|0},${r.right|0},${r.bottom|0}]`);
    });
  }
  return [...new Set(bad)];
});
if (violations.length) console.warn('FORA DA ÁREA SEGURA:\n' + violations.slice(0, 20).join('\n'));
else console.log('área segura ok');

// 1 print por cena, com tudo já na tela (antes do fade de saída)
for (const [i, sc] of C.SCENES.entries()) {
  const last = i === C.SCENES.length - 1;
  const t = last ? C.DURATION - 0.5 : sc.end - C.ANIM.outDuration - 0.15;
  await page.evaluate(t => window.render(t), t);
  await page.screenshot({ path: path.join(outDir, `cena-${i + 1}-${sc.id}.png`) });
}

if (!onlyStills) {
  const out = path.join(outDir, 'beawst-reels-palestra.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(C.FPS), '-i', '-',
    '-an', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow',
    '-r', String(C.FPS), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(C.DURATION * C.FPS);
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.render(t), i / C.FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 90 === 0) console.log(`quadro ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('ok', out);
}
await browser.close();
