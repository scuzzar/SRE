// Rendert die PNG-Icons in public/ aus public/icon.svg (mit dem Chromium von Playwright).
// Nach jeder Änderung an icon.svg neu ausführen: npm run icons
//
// - icon-192.png, icon-512.png: wie icon.svg, mit runden Ecken (Android, Desktop)
// - icon-maskable-512.png: randlos, Emblem kleiner, damit es jede Maske des Systems übersteht
// - apple-touch-icon.png (180 px): randlos; die Ecken rundet iOS selbst
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const publicDir = new URL('../public/', import.meta.url);
const svg = await readFile(new URL('icon.svg', publicDir), 'utf8');

function replaceOnce(text, from, to) {
  if (!text.includes(from)) throw new Error(`icon.svg enthält nicht mehr: ${from}`);
  return text.replace(from, to);
}

const square = replaceOnce(svg, 'rx="26"', 'rx="0"');
// Die sichere Zone einer maskierbaren Icons ist der Kreis mit 40 % der Kantenlänge als Radius.
const maskable = replaceOnce(square, 'transform="translate(7.2 7.2) scale(0.88)"', 'transform="translate(15 15) scale(0.75)"');

const icons = [
  { file: 'icon-192.png', size: 192, svg },
  { file: 'icon-512.png', size: 512, svg },
  { file: 'icon-maskable-512.png', size: 512, svg: maskable },
  { file: 'apple-touch-icon.png', size: 180, svg: square },
];

const browser = await chromium.launch();
try {
  for (const icon of icons) {
    const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size } });
    const sized = icon.svg.replace('<svg ', `<svg width="${icon.size}" height="${icon.size}" `);
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`);
    const png = await page.locator('svg').screenshot({ omitBackground: true });
    await writeFile(new URL(icon.file, publicDir), png);
    await page.close();
    console.log(`public/${icon.file} (${icon.size} px)`);
  }
} finally {
  await browser.close();
}
