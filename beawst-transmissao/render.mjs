// Gera as artes da transmissão (1920x1080, RGB) com os nomes do manual.
// Telas 01-03 e 10: PNG 100% preenchido. Máscaras 04-08: PNG com os recortes 100% transparentes.
// Uso: node render.mjs
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out');
fs.mkdirSync(out, { recursive: true });
const FILES = {
  '01': '01_TELA_ESPERA', '02': '02_TELA_INTERVALO', '03': '03_TELA_FINAL',
  '04': '04_MASCARA_1_CAMERA', '05': '05_MASCARA_2_CAMERAS', '06': '06_MASCARA_3_CAMERAS',
  '07': '07_MASCARA_4_CAMERAS', '08': '08_MASCARA_PPT_E_CAMERA', '10': '10_FUNDO_VIRTUAL_PALESTRANTE',
};
// peças por palestrante: tela "A seguir", máscara PPT + câmera e tarja de nome (GC)
const PALESTRANTES = ['leia', 'alessandra'];
for (const p of PALESTRANTES) {
  FILES[`ps&s=${p}`] = `11_A_SEGUIR_${p.toUpperCase()}`;
  FILES[`pm&s=${p}`] = `12_MASCARA_PPT_E_CAMERA_${p.toUpperCase()}`;
  FILES[`gc&s=${p}`] = `13_TARJA_NOME_${p.toUpperCase()}`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const holes = {};
for (const [t, name] of Object.entries(FILES)) {
  await page.goto(pathToFileURL(path.join(dir, 'telas.html')).href + `?t=${t}`);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  await page.waitForTimeout(150);   // fotos das palestrantes
  const key = t.split('&')[0];
  holes[name] = await page.evaluate(k => window.HOLES[k] || [], key);
  // margem segura: textos e logos dentro de 60px das bordas e fora dos recortes
  const bad = await page.evaluate(t => {
    const H = window.HOLES[t] || [], r = [];
    document.querySelectorAll(`#t${t} .abs, #t${t} .vert, #t${t} .gc`).forEach(e => {
      const b = e.getBoundingClientRect();
      if (b.left < 59 || b.top < 59 || b.right > 1861 || b.bottom > 1021) r.push('margem: ' + e.textContent.trim().slice(0, 30));
      for (const [x, y, w, h] of H) if (b.left < x + w && b.right > x && b.top < y + h && b.bottom > y) r.push('sobre o recorte: ' + (e.textContent.trim() || 'logo').slice(0, 30));
    });
    return r;
  }, key);
  console.log(`${name}: ${bad.length ? bad.join(' | ') : 'ok'}`);
  await page.screenshot({ path: path.join(out, name + '.png'), omitBackground: key === 'gc' });
}
await browser.close();

// recortes transparentes (canal alpha) nas máscaras
const r = spawnSync('python3', ['-I', '-c', `
import json, sys
from PIL import Image
holes = json.loads(sys.argv[1]); out = sys.argv[2]
for name, rects in holes.items():
    im = Image.open(f"{out}/{name}.png")
    if "TARJA" in name:
        im.convert("RGBA").save(f"{out}/{name}.png"); print(name, "RGBA (tarja com fundo transparente)"); continue
    im = im.convert("RGBA" if rects else "RGB")
    if rects:
        a = Image.new("L", im.size, 255)
        for x, y, w, h in rects: a.paste(0, (x, y, x + w, y + h))
        im.putalpha(a)
    im.save(f"{out}/{name}.png")
    print(name, im.mode, im.size, "recortes:", [f"{w}x{h}" for x, y, w, h in rects])
`, JSON.stringify(holes), out], { encoding: 'utf8' });
process.stdout.write(r.stdout + r.stderr);
