// Gera os 3 PNGs dos stories (1080x1920). Uso: node render.cjs
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 3500, height: 2000 } });
  await p.goto('file://' + path.join(__dirname, 'stories.html'));
  await p.evaluate(() => document.fonts.ready);
  for (const [i, id] of ['s1', 's2', 's3'].entries())
    await (await p.$('#' + id)).screenshot({ path: path.join(__dirname, `globex-story-${i + 1}.png`) });
  await b.close();
})();
