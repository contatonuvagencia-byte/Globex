// Renderiza as artes do brief (content.json + tokens.json + template.html) em output/<data_tipo_slug>/NN.png.
// Uso: node render.mjs            (só semana 1, para aprovação)
//      node render.mjs --semana 3 (uma semana)   |   node render.mjs --todas
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const { pecas } = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
const tokens = JSON.parse(fs.readFileSync(path.join(dir, 'tokens.json'), 'utf8'));
const a = process.argv;
const sem = a.includes('--todas') ? null : Number(a[a.indexOf('--semana') + 1]) || 1;
const lista = pecas.filter(p => sem === null || p.semana === sem);
const browser = await chromium.launch();
let problemas = 0;
for (const P of lista) {
  const out = path.join(dir, 'output', P.slug); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  for (const [i, G] of P.pages.entries()) {
    const H = P.tipo === 'reel' ? 1920 : 1350;
    const page = await browser.newPage({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    await page.addInitScript(([P, G, i, n, T]) => { window.PIECE = P; window.PAGE = G; window.IDX = i; window.TOTAL = n; window.TOKENS = T; }, [P, G, i, P.pages.length, tokens]);
    await page.goto(pathToFileURL(path.join(dir, 'template.html')).href);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
    let s = await page.evaluate(() => window.fit());
    if (await page.evaluate(() => window.orphanFix(false))) s = await page.evaluate(() => window.fit());
    if ((await page.evaluate(() => window.audit())).some(x => x.startsWith('órfã'))) {
      const s0 = s;
      await page.evaluate(() => { window.orphanFix(true); document.body.style.setProperty('--s', 1); });
      s = await page.evaluate(() => window.fit());
      if (s < Math.min(.85, s0)) { await page.reload(); await page.evaluate(async () => { await document.fonts.ready; }); s = await page.evaluate(() => window.fit()); await page.evaluate(() => window.orphanFix(false)); }
    }
    const r = await page.evaluate(() => window.audit());
    const nome = P.tipo === 'reel' ? 'capa.png' : `${String(i + 1).padStart(2, '0')}.png`;
    if (r.length || s < .7) { problemas++; console.log(`${P.slug}/${nome}: escala ${s.toFixed(2)} ${r.join(' | ')}`); }
    await page.screenshot({ path: path.join(out, nome) });
    await page.close();
  }
}
await browser.close();
console.log(`${lista.length} peças, ${problemas ? problemas + ' com aviso' : 'conferência ok'}`);
