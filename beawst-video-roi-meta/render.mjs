// Renderiza o Reel "A feira em 30s": out/anuncio-roi-carreira.mp4 (1080x1920, H.264 + AAC), capa e legendas.srt.
// Uso: node render.mjs            (vídeo completo)
//      node render.mjs --stills   (só prints de conferência)
// Áudio: assets/trilha.mp3 se existir; senão a trilha provisória (trilha.py). Com assets/locucao.mp3, mistura com a trilha mais baixa.
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out');
fs.mkdirSync(out, { recursive: true });
const has = f => fs.existsSync(path.join(dir, 'assets', f));

// legendas da locução (fala do roteiro)
const FALA = [
  [0, 4.5, 'Inglês fluente pode valer +61% no seu salário.'],
  [4.5, 10, 'Chega de fugir de entrevista em inglês: quem domina o idioma recebe 8x mais convites de recrutadores.'],
  [10, 14.5, 'Não é apenas um intercâmbio. É o fim do teto salarial na sua carreira.'],
  [14.5, 18.5, 'Planejado por Camila Fidelis, executiva que passou 20 anos contratando no RH corporativo.'],
  [18.5, 21.5, 'E quando você voltar: simulação de entrevistas em inglês, currículo internacional e LinkedIn otimizado.'],
  [21.5, 25, 'BEAWST. Faça o teste de inglês grátis.'],
];
const ts = s => `00:00:${String(Math.floor(s)).padStart(2, '0')},${String(Math.round((s % 1) * 1000)).padStart(3, '0')}`;
fs.writeFileSync(path.join(out, 'legendas.srt'), FALA.map(([a, b, txt], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${txt}\n`).join('\n'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(dir, 'video.html')).href + '?render');
await page.evaluate(() => window.ready);
const C = await page.evaluate(() => window.CONFIG);

// zona segura: nenhum texto fora de 250px (topo) e 340px (base)
const bad = await page.evaluate(async () => {
  const { SAFE: S, DURATION, FPS } = window.CONFIG, r = new Set();
  for (let f = 0; f < DURATION * FPS; f += 3) {
    window.render(f / FPS);
    document.querySelectorAll('.scene .el').forEach(e => {
      if (e.closest('.scene') && e.closest('.scene').style.display === 'none') return;
      if (+getComputedStyle(e).opacity < .05 || !e.textContent.trim()) return;
      const b = e.getBoundingClientRect();
      if (b.top < S.top - 1 || b.bottom > 1920 - S.bottom + 1) r.add(`${(f / FPS).toFixed(1)}s "${e.textContent.trim().slice(0, 25)}"`);
    });
  }
  return [...r];
});
console.log(bad.length ? 'FORA DA ZONA SEGURA:\n' + bad.slice(0, 12).join('\n') : 'zona segura ok');

await page.evaluate(() => window.render(3.6));
await page.screenshot({ path: path.join(out, 'capa-anuncio-roi-carreira.png') });
for (const t of [3.6, 9, 13.5, 17.8, 21, 24.9]) {
  await page.evaluate(t => window.render(t), t);
  await page.screenshot({ path: path.join(out, `_print-${String(t).replace('.', '_')}.png`) });
}

if (!process.argv.includes('--stills')) {
  const silent = path.join(out, '_video.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(C.FPS), '-i', '-',
    '-an', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < Math.round(C.DURATION * C.FPS); i++) {
    await page.evaluate(t => window.render(t), i / C.FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  let music = path.join(dir, 'assets', 'trilha.mp3');
  if (!has('trilha.mp3')) {
    music = path.join(out, '_trilha.wav');
    spawnSync('python3', [path.join(dir, 'trilha.py'), music, JSON.stringify({ duration: C.DURATION, bpm: C.BPM, cuts: Object.values(C.CENAS).filter(x => x > 0) })], { stdio: 'inherit' });
  }
  const final = path.join(out, 'anuncio-roi-carreira.mp4');
  const args = ['-y', '-loglevel', 'error', '-i', silent, '-i', music];
  let filter = `[1:a]atrim=0:${C.DURATION},afade=t=out:st=${C.DURATION - 1.2}:d=1.2[a]`;
  if (has('locucao.mp3')) {
    args.push('-i', path.join(dir, 'assets', 'locucao.mp3'));
    filter = `[1:a]atrim=0:${C.DURATION},volume=0.3,afade=t=out:st=${C.DURATION - 1.2}:d=1.2[m];[m][2:a]amix=inputs=2:normalize=0[a]`;
  }
  spawnSync('ffmpeg', [...args, '-filter_complex', filter, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-t', String(C.DURATION), '-movflags', '+faststart', final], { stdio: 'inherit' });
  fs.rmSync(silent); fs.rmSync(path.join(out, '_trilha.wav'), { force: true });
  console.log('ok', final);
}
await browser.close();
