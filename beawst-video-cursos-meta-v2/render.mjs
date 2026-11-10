// Renderiza o anúncio Meta V2: out/anuncio-carreira-v2.mp4 (1080x1920, H.264 + AAC), capa e legendas.srt.
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
  [0, 2.4, 'Seu inglês está travando seu salário?'],
  [2.4, 5, 'Falta de inglês trava a sucessão de executivos. O mercado paga mais por quem domina o idioma.'],
  [5, 8.6, 'Inglês fluente e vivência no exterior: até 61% a mais de salário e 8 vezes mais convites de recrutadores.'],
  [8.6, 11.6, 'Um intercâmbio pensado pra sua carreira, não só um carimbo no passaporte.'],
  [11.6, 15, 'E quando você volta, a gente prepara sua recolocação: entrevista em inglês, currículo internacional e LinkedIn.'],
  [15, 18, 'Criado por quem passou mais de 20 anos no RH decidindo contratações. Da escola ao visto, a gente cuida de tudo.'],
  [18, 21, 'BEAWST. Faça o teste de inglês grátis.'],
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

await page.evaluate(() => window.render(1.6));
await page.screenshot({ path: path.join(out, 'capa-anuncio-carreira-v2.png') });
for (const t of [1.6, 4.4, 7.8, 11.2, 14.6, 17.6, 20.9]) {
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
  const final = path.join(out, 'anuncio-carreira-v2.mp4');
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
