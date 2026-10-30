// Gera out/09_VINHETA.mp4 seguindo o manual: 1920x1080, H.264, 30fps, Rec.709,
// 12 Mbps, AAC 48 kHz estéreo. Uso: node vinheta.mjs
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(dir, 'vinheta.html')).href + '?render');
await page.evaluate(() => window.ready);
const { DURATION, FPS } = await page.evaluate(() => window.VINHETA);

// prints de conferência
for (const t of [0.5, 1.2, 2.0, 3.6, 5.9]) {
  await page.evaluate(t => window.render(t), t);
  await page.screenshot({ path: path.join(out, `_vinheta-${t}.png`) });
}

const silent = path.join(out, '_vinheta_video.mp4');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', '12M', '-maxrate', '15M', '-bufsize', '24M',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', String(FPS), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let i = 0; i < Math.round(DURATION * FPS); i++) {
  await page.evaluate(t => window.render(t), i / FPS);
  const buf = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();

const wav = path.join(out, '_vinheta_audio.wav');
spawnSync('python3', [path.join(dir, 'vinheta_audio.py'), wav, String(DURATION)], { stdio: 'inherit' });
const final = path.join(out, '09_VINHETA.mp4');
spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
  '-movflags', '+faststart', '-t', String(DURATION), final], { stdio: 'inherit' });
fs.rmSync(silent); fs.rmSync(wav);
console.log('ok', final);
