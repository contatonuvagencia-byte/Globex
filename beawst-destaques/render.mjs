// Gera capas e stories dos destaques (1080x1920) em out/<nn-destaque>/. Uso: node render.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out');
const PASTA = { comece: '1-comece-aqui', roi: '2-roi', volta: '3-na-volta', camila: '4-camila', como: '5-como-funciona', destinos: '6-destinos', alunos: '7-alunos', gc: '8-global-connect' };
const CAPA = Object.values(PASTA);
fs.rmSync(out, { recursive: true, force: true });
for (const p of [...CAPA, '0-capas']) fs.mkdirSync(path.join(out, p), { recursive: true });
let TRILHAS = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const url = pathToFileURL(path.join(dir, 'destaques.html')).href;
await page.goto(url);
const ids = await page.evaluate(() => window.IDS);
TRILHAS = await page.evaluate(() => window.TRILHAS);
TRILHAS.forEach((t, i) => fs.mkdirSync(path.join(out, `t${i + 1}-trilha-${t}`), { recursive: true }));
for (const id of ids) {
  await page.goto(url + '?p=' + id);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  const bad = await page.evaluate(() => [...document.querySelectorAll('#s .h,#s .p,#s .list,#s .big,#s .btn,#s .note,#s .kick,#s .foot,#s .news')]
    .filter(e => { const b = e.getBoundingClientRect(); return b.top < 250 || b.bottom > 1580 || b.right > 1000; }).map(e => e.textContent.trim().slice(0, 30)));
  if (bad.length) console.log(id, 'FORA:', bad.join(' | '));
  const [k, n] = id.split('-');
  const file = k === 'tcapa' ? path.join(out, '0-capas', `capa-t${n}-trilha-${TRILHAS[n - 1]}.png`)
    : k.startsWith('trilha') ? path.join(out, `t${k.slice(6)}-trilha-${TRILHAS[k.slice(6) - 1]}`, `story-${n}.png`)
    : k === 'capa' ? path.join(out, '0-capas', `capa-${CAPA[n - 1]}.png`) : path.join(out, PASTA[k], `story-${n}.png`);
  await page.screenshot({ path: file });
}
await browser.close();
// Global Connect: stories já produzidos na feira
const gc = path.join(out, PASTA.gc);
[['../beawst-stories-palestrantes/out/story-1-quem-vai-falar.png', 'story-2-palestrantes.png'],
 ['../beawst-07-11-ao-vivo/out/story-ganhadora-mala.png', 'story-3-ganhadora.png'],
 ['../beawst-07-11-ao-vivo/out/story-encerramento.png', 'story-4-encerramento.png']]
  .forEach(([a, b]) => fs.existsSync(path.join(dir, a)) && fs.copyFileSync(path.join(dir, a), path.join(gc, b)));
console.log('ok', ids.length, 'peças');
