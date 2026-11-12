// Gera as fotos de perfil 1080x1080 (logo completo e só a coruja) + prévia com o recorte redondo. Uso: node render.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'out'); fs.mkdirSync(out, { recursive: true });
const svg = fs.readFileSync(path.join(dir, 'logo-beawst-laranja.svg'), 'utf8');
const [, , W, H] = svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
const owlH = Math.round(H * 1700 / 2280);
const art = (vb, h, circle) => `<html><body style="margin:0;width:1080px;height:1080px;background:#fff;display:flex;align-items:center;justify-content:center;${circle ? 'border-radius:50%;overflow:hidden;box-shadow:inset 0 0 0 3px #ddd' : ''}">
  ${svg.replace('<svg ', `<svg style="height:${h}px" `).replace(/viewBox="[^"]+"/, `viewBox="${vb}"`)}</body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
const pecas = [['foto-perfil-beawst-logo-completo', `0 0 ${W} ${H}`, 700], ['foto-perfil-beawst-coruja', `0 0 ${W} ${owlH}`, 640]];
for (const [nome, vb, h] of pecas) {
  await page.setContent(art(vb, h, false)); await page.screenshot({ path: path.join(out, nome + '.png') });
  await page.setContent(art(vb, h, true)); await page.screenshot({ path: path.join(out, '_previa-' + nome + '.png'), omitBackground: true });
}
await browser.close(); console.log('ok');
