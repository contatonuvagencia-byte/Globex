// Gera o PNG do post (1080x1350, 4:5). Uso: node render.cjs
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + path.join(__dirname, 'post.html'));
  await p.evaluate(() => document.fonts.ready);
  await (await p.$('#post')).screenshot({ path: path.join(__dirname, 'globex-dia-do-despachante.png') });
  await b.close();
})();
