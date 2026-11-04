// Gera out/09_VIDEO_INSTITUCIONAL.mp4 no padrão do manual (1920x1080, H.264 30fps, Rec.709, 12 Mbps, AAC 48 kHz estéreo)
// e out/legendas.srt com a locução. Uso: node render.mjs  |  node render.mjs --stills (só prints)
// Áudio: assets/trilha.mp3 se existir, senão trilha provisória (trilha.py). Com assets/locucao.mp3, a trilha abaixa e a voz entra.
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out');
fs.mkdirSync(out, { recursive: true });
const has = f => fs.existsSync(path.join(dir, 'assets', f));

const LOCUCAO = [
  [0, 8.6, 'O mundo é grande demais para caber apenas nos seus planos: ele foi feito para ser vivido.'],
  [8.6, 17, 'A BEAWST nasceu da trajetória de Camila Fidélis, executiva com mais de 20 anos de experiência em Recursos Humanos em grandes multinacionais.'],
  [17, 28.2, 'Ao longo de duas décadas selecionando talentos, Camila viu que o intercâmbio não é só um passeio: é o maior acelerador de maturidade, adaptabilidade e destaque no mercado de trabalho.'],
  [28.2, 34, 'Por isso, a missão da BEAWST — Be a World Student — é descomplicar a jornada internacional e torná-la estratégica para a sua vida.'],
  [34, 49, 'Muito mais do que uma agência tradicional, a BEAWST é uma plataforma inteligente que conecta você diretamente a escolas de alto nível pelo mundo. Com transparência total, suporte especializado e foco em quem você quer se tornar quando voltar.'],
  [49, 62, 'Seja bem-vindo à BEAWST Global Connect. Explore nossos espaços, converse com nossos parceiros e descubra o próximo passo da sua jornada global. BEAWST: Be a World Student.'],
];
const ts = s => { const m = Math.floor(s / 60), x = s % 60; return `00:${String(m).padStart(2, '0')}:${String(Math.floor(x)).padStart(2, '0')},${String(Math.round((x % 1) * 1000)).padStart(3, '0')}`; };
fs.writeFileSync(path.join(out, 'legendas.srt'), LOCUCAO.map(([a, b, l], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${l}\n`).join('\n'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(dir, 'video.html')).href + '?render');
await page.evaluate(() => window.ready);
const C = await page.evaluate(() => window.CONFIG);
console.log(await page.evaluate(() => window.FOTO_OK) ? 'foto da Camila ok' : 'FALTA assets/camila.jpg (aparece aviso na cena 1)');

for (const t of [2, 7, 14, 20, 25, 31, 39, 45, 53, 60]) {
  await page.evaluate(t => window.render(t), t);
  await page.screenshot({ path: path.join(out, `_print-${t}.png`) });
}
if (!process.argv.includes('--stills')) {
  const silent = path.join(out, '_video.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(C.FPS), '-i', '-',
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', '12M', '-maxrate', '15M', '-bufsize', '24M',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', String(C.FPS), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < Math.round(C.DURATION * C.FPS); i++) {
    await page.evaluate(t => window.render(t), i / C.FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  let music = path.join(dir, 'assets', 'trilha.mp3');
  if (!has('trilha.mp3')) {
    music = path.join(out, '_trilha.wav');
    spawnSync('python3', [path.join(dir, 'trilha.py'), music, JSON.stringify({ duration: C.DURATION, bpm: 100, cuts: Object.values(C.CENAS).filter(x => x > 0) })], { stdio: 'inherit' });
  }
  const args = ['-y', '-loglevel', 'error', '-i', silent, '-i', music];
  let filter = `[1:a]atrim=0:${C.DURATION},volume=0.7,afade=t=in:d=1,afade=t=out:st=${C.DURATION - 2}:d=2,aresample=48000[a]`;
  if (has('locucao.mp3')) {
    args.push('-i', path.join(dir, 'assets', 'locucao.mp3'));
    filter = `[1:a]atrim=0:${C.DURATION},volume=0.22,afade=t=out:st=${C.DURATION - 2}:d=2[m];[m][2:a]amix=inputs=2:normalize=0,aresample=48000[a]`;
  }
  const final = path.join(out, '09_VIDEO_INSTITUCIONAL.mp4');
  spawnSync('ffmpeg', [...args, '-filter_complex', filter + ';[a]volume=-7dB[al]', '-map', '0:v', '-map', '[al]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    '-t', String(C.DURATION), '-movflags', '+faststart', final], { stdio: 'inherit' });
  fs.rmSync(silent); fs.rmSync(path.join(out, '_trilha.wav'), { force: true });
  console.log('ok', final);
}
await browser.close();
