// Renderiza video.html em MP4 (H.264 + AAC) e gera a capa PNG.
// Uso: node render.mjs            -> out/reel-apresentadora.mp4 + out/capa-reel-apresentadora.png
//      node render.mjs --stills   -> só a capa e prints de conferência (out/cena-*.png)
// Áudio: usa assets/trilha.mp3 se existir; senão gera uma trilha provisória (trilha.py).
//        Se existir assets/locucao.mp3, mistura com a trilha mais baixa e liga as legendas.
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out');
fs.mkdirSync(out, { recursive: true });
const onlyStills = process.argv.includes('--stills');
const has = f => fs.existsSync(path.join(dir, 'assets', f));

const parceirosDir = path.join(dir, 'assets', 'parceiros');
const MANIFEST = {
  parceiros: fs.existsSync(parceirosDir) ? fs.readdirSync(parceirosDir).filter(f => /\.(png|jpe?g|svg|webp)$/i.test(f)).sort() : [],
  locucao: has('locucao.mp3'),
  video: has('apresentadora.mp4'),
};
const faltando = ['apresentadora.jpg', 'logo-feira.png', 'logo-beawst.png', 'trilha.mp3', 'locucao.mp3'].filter(f => !has(f));
if (!MANIFEST.parceiros.length) faltando.push('parceiros/ (vazia)');
console.log('assets faltando (aparecem como placeholder):', faltando.join(', ') || 'nenhum');

// --allow-file-access-from-files: deixa o canvas ler a cor de fundo das logos dos parceiros
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
// ilustrações (assets/ilustracoes/*.svg -> .png). O logo usado nelas é assets/logo-beawst.png;
// se ele não existir, usa o redesenho em assets/ilustracoes/logo-beawst.svg.
{
  const il = path.join(dir, 'assets', 'ilustracoes');
  const ip = await browser.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
  const shot = async (svg, png, w, h) => {
    await ip.setViewportSize({ width: w, height: h });
    await ip.goto(pathToFileURL(path.join(il, svg)).href);
    await ip.waitForLoadState('load');
    await ip.screenshot({ path: path.join(il, png), omitBackground: true });
  };
  if (has('logo-beawst.png')) fs.copyFileSync(path.join(dir, 'assets', 'logo-beawst.png'), path.join(il, 'logo-beawst.png'));
  else await shot('logo-beawst.svg', 'logo-beawst.png', 240, 340);
  await shot('kit.svg', 'kit.png', 800, 800);
  await shot('mala.svg', 'mala.png', 800, 800);
  await ip.close();
}
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.addInitScript(m => { window.MANIFEST = m; }, MANIFEST);
await page.goto(pathToFileURL(path.join(dir, 'video.html')).href + '?render');
await page.evaluate(() => window.ready);
const C = await page.evaluate(() => JSON.parse(JSON.stringify(window.CONFIG)));
if (C.DURATION < 30 || C.DURATION > 60) console.warn('atenção: DURATION fora de 30–60s');

// confere a zona segura (texto fora dos 250px do topo e dos 340px de baixo)
const sel = '.w,.name,.badge,.cred,.date,.infos,.ctxl,.phrase,.flag,.ptitle,.prize,#s6t div,.ctaL,.ctaI,#caption';
const bad = await page.evaluate(async sel => {
  const { SAFE: S, WIDTH: W, HEIGHT: H, FPS, DURATION } = window.CONFIG;
  const r = [];
  for (let f = 0; f < DURATION * FPS; f += 3) {
    await window.render(f / FPS);
    document.querySelectorAll(sel).forEach(el => {
      if (el.offsetParent === null || el.closest('[style*="display: none"]')) return;
      let o = 1; for (let e = el; e; e = e.parentElement) o *= +getComputedStyle(e).opacity;
      if (o < 0.05) return;
      const b = el.getBoundingClientRect();
      if (b.top < S.top - 1 || b.bottom > H - S.bottom + 1)
        r.push(`${(f / FPS).toFixed(2)}s "${el.textContent.trim().slice(0, 28)}" y=${b.top | 0}..${b.bottom | 0}`);
    });
  }
  return [...new Set(r)];
}, sel);
console.log(bad.length ? 'FORA DA ZONA SEGURA:\n' + bad.slice(0, 15).join('\n') : 'zona segura ok');

// capa + prints de conferência
await page.evaluate(t => window.render(t), C.QUADRO_CAPA);
await page.screenshot({ path: path.join(out, 'capa-reel-apresentadora.png') });
const T = C.CENAS;
const checks = { '1-gancho': 2.6, '2-revelacao': C.QUADRO_CAPA, '3-contexto': T.parceiros - 0.4, '4a-estudar': T.parceiros + 2.6,
  '4b-irlanda': T.parceiros + 4.6, '4c-ferias': T.parceiros + 6.2, '4d-malta': T.parceiros + 8.5, '4e-ao-vivo': T.premio - 0.3,
  '5a-titulo': T.premio + 1.3, '5b-kit': T.premio + 4.8, '5c-mala': T.cta - 0.4, '6-cta': C.DURATION - 0.1 };
for (const [n, t] of Object.entries(checks)) {
  await page.evaluate(t => window.render(t), t);
  await page.screenshot({ path: path.join(out, `cena-${n}.png`) });
}

if (!onlyStills) {
  // vídeo
  const silent = path.join(out, '_video.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(C.FPS), '-i', '-',
    '-an', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(C.DURATION * C.FPS);
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.render(t), i / C.FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`quadro ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));

  // áudio
  let music = path.join(dir, 'assets', 'trilha.mp3');
  if (!has('trilha.mp3')) {
    music = path.join(out, 'trilha-provisoria.wav');
    spawnSync('python3', [path.join(dir, 'trilha.py'), music, JSON.stringify({ duration: C.DURATION, bpm: C.BPM, cuts: Object.values(T).filter(x => x > 0) })], { stdio: 'inherit' });
  }
  const final = path.join(out, 'reel-apresentadora.mp4');
  const fadeAt = Math.max(0, C.DURATION - 1.2);
  const args = ['-y', '-loglevel', 'error', '-i', silent, '-i', music];
  let filter;
  if (MANIFEST.locucao) {
    args.push('-i', path.join(dir, 'assets', 'locucao.mp3'));
    filter = `[1:a]atrim=0:${C.DURATION},volume=0.3,afade=t=out:st=${fadeAt}:d=1.2[m];[2:a]volume=1.0[v];[m][v]amix=inputs=2:normalize=0[a]`;
  } else filter = `[1:a]atrim=0:${C.DURATION},afade=t=out:st=${fadeAt}:d=1.2[a]`;
  args.push('-filter_complex', filter, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(C.DURATION), '-movflags', '+faststart', final);
  spawnSync('ffmpeg', args, { stdio: 'inherit' });
  fs.rmSync(silent);
  console.log('ok', final);
}
await browser.close();
