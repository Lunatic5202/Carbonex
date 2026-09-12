import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
page.on('requestfailed', r => logs.push(`[FAILED] ${r.url()} :: ${r.failure()?.errorText}`));
await page.goto('http://localhost:5000/map', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => logs.push('[NAV] ' + e.message));
await page.waitForTimeout(6000);
const shots = await page.evaluate(() => {
  const map = document.querySelector('.gis-map');
  if (!map) return { noMap: true };
  const canvas = map.querySelector('canvas');
  return { hasCanvas: !!canvas, mapW: map.offsetWidth, mapH: map.offsetHeight, canvasW: canvas?.width, canvasH: canvas?.height };
});
const tiles = await page.evaluate(() => new Promise(res => {
  const imgs = [...document.querySelectorAll('.gis-map img')];
  res({ imgCount: imgs.length, ok: imgs.filter(i => i.complete && !i.naturalWidth).length, natural: imgs.every(i => i.complete) });
}));
console.log(JSON.stringify({ shots, tiles, logs }, null, 2));
await page.screenshot({ path: '/tmp/opencode/pwtest/map.png' });
await browser.close();
