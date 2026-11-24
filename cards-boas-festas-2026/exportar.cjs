// Exporta cada .slide de index.html como PNG 1080x1350. Uso: node exportar.cjs
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
(async () => {
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1500 } });
  await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const slides = page.locator('.slide');
  for (let i = 0; i < await slides.count(); i++) {
    const out = path.join(__dirname, 'artes', await slides.nth(i).getAttribute('data-out'));
    require('fs').mkdirSync(path.dirname(out), { recursive: true });
    await slides.nth(i).screenshot({ path: out });
    console.log(out);
  }
  await browser.close();
})();
