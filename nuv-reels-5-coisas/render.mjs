// Renderiza as cenas de scenes.js em vídeo.
//   node render.mjs                 -> todas as cenas
//   node render.mjs 07_dica1_equipe -> só as cenas citadas
//   node render.mjs --stills        -> só PNGs de conferência (início/meio/fim) em out/stills
// Saídas:
//   out/sem-fundo/<cena>.mov            ProRes 4444 com transparência (Premiere, After Effects, Final Cut, CapCut desktop)
//   out/sem-fundo-verde/<cena>.mp4      mesma animação em fundo verde (chroma key no CapCut celular)
//   out/com-fundo/<cena>.mp4            H.264 1080x1920
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const args = process.argv.slice(2);
const stills = args.includes('--stills');
const only = args.filter(a => !a.startsWith('--'));

function ffmpeg(argv) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  return { stdin: p.stdin, done };
}

function encoder(id, alpha) {
  const input = ['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-'];
  if (alpha) {
    mkdirSync(`${ROOT}/out/sem-fundo`, { recursive: true });
    mkdirSync(`${ROOT}/out/sem-fundo-verde`, { recursive: true });
    return ffmpeg([...input,
      '-f', 'lavfi', '-i', `color=c=0x00FF00:s=1080x1920:r=${FPS}`,
      '-filter_complex', '[0:v]split[a][b];[1:v][b]overlay=shortest=1,format=yuv420p[g]',
      '-map', '[a]', '-c:v', 'prores_ks', '-profile:v', '4444', '-qscale:v', '11', '-pix_fmt', 'yuva444p10le', '-alpha_bits', '16', '-vendor', 'apl0',
      `${ROOT}/out/sem-fundo/${id}.mov`,
      '-map', '[g]', '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart',
      `${ROOT}/out/sem-fundo-verde/${id}_verde.mp4`]);
  }
  mkdirSync(`${ROOT}/out/com-fundo`, { recursive: true });
  return ffmpeg([...input, '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    `${ROOT}/out/com-fundo/${id}.mp4`]);
}

async function renderScene(browser, id) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + ROOT + '/index.html');
  const { dur, alpha } = await page.evaluate(i => window.setup(i), id);
  await page.evaluate(() => window.ready());
  const n = Math.round(dur * FPS);
  if (stills) {
    mkdirSync(`${ROOT}/out/stills`, { recursive: true });
    for (const f of (process.env.STILLS || '0.15,0.45,0.8').split(',').map(Number)) {
      const t = dur * f;
      await page.evaluate(x => window.frame(x), t);
      await page.screenshot({ path: `${ROOT}/out/stills/${id}_${Math.round(f * 100)}.png`, omitBackground: alpha });
    }
  } else {
    const enc = encoder(id, alpha);
    for (let i = 0; i < n; i++) {
      await page.evaluate(x => window.frame(x), i / FPS);
      const buf = await page.screenshot({ type: 'png', omitBackground: alpha });
      if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
    }
    enc.stdin.end();
    await enc.done;
  }
  await page.close();
  console.log(`ok  ${id}  (${dur}s${alpha ? ', sem fundo' : ', com fundo'})`);
}

const browser = await chromium.launch();
const probe = await browser.newPage();
await probe.goto('file://' + ROOT + '/index.html');
const all = await probe.evaluate(() => Object.keys(window.SCENES));
await probe.close();
const ids = only.length ? only : all;
const queue = [...ids];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) await renderScene(browser, queue.shift());
}));
await browser.close();
