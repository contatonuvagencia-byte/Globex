// Composites the overlay (overlay.html, rendered frame by frame with a transparent
// background) over the assembled picture and mixes the sped-up narration.
// usage: node render.mjs <workdir> <narracao.mp3> <out.mp4> [--stills t1,t2,...]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const [work, narr, out, flag, list] = process.argv.slice(2);
const dir = path.dirname(fileURLToPath(import.meta.url));
const TL = JSON.parse(readFileSync(path.join(work, 'timeline.json'), 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
await page.addInitScript((tl) => { window.TIMELINE = tl; }, TL);
await page.goto(pathToFileURL(path.join(dir, 'overlay.html')).href);
await page.evaluate(() => document.fonts.ready);

if (flag === '--stills') {
  // QA: composite overlay onto the assembled picture at given times
  for (const t of list.split(',').map(Number)) {
    await page.evaluate((t) => window.renderFrame(t), t);
    const png = await page.screenshot({ omitBackground: true });
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(t), '-i', path.join(work, 'assembled.mp4'),
      '-f', 'image2pipe', '-i', '-', '-filter_complex', '[0:v][1:v]overlay', '-frames:v', '1', `${out}/still_${t}.jpg`]);
    ff.stdin.end(png);
    await new Promise((r) => ff.on('close', r));
  }
  await browser.close();
  process.exit(0);
}

const total = Math.round(TL.duration * TL.fps);
const delayMs = Math.round(TL.offset * 1000);
const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y',
  '-i', path.join(work, 'assembled.mp4'),
  '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'png', '-i', '-',
  '-i', narr,
  '-filter_complex',
  `[0:v][1:v]overlay=format=auto,format=yuv420p[v];` +
  `[2:a]atempo=${TL.speed},adelay=${delayMs}|${delayMs},` +
  `highpass=f=70,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=200,` +
  `loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000,apad[a]`,
  '-map', '[v]', '-map', '[a]', '-t', String(TL.duration),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(TL.fps),
  '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });

for (let f = 0; f < total; f++) {
  await page.evaluate((t) => window.renderFrame(t), f / TL.fps);
  const buf = await page.screenshot({ omitBackground: true });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 300 === 0) console.log(`frame ${f}/${total}`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log('done ->', out);
