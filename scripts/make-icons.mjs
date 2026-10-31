import { writeFileSync, readFileSync, existsSync } from 'fs';
import { chromium } from '@playwright/test';
import path from 'path';

// C1 / C3 Door Mark on Navy (#13233A)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="navyGrad" cx="50%" cy="50%" r="65%" fx="30%" fy="30%">
      <stop offset="0%" stop-color="#1C2F4A"/>
      <stop offset="100%" stop-color="#13233A"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#navyGrad)" />
  <!-- Centered Door Mark with ~20% safe area padding (300x300 viewBox inside 512x512) -->
  <g transform="translate(106, 106) scale(3)">
    <!-- Arch: M28 90 L28 46 A22 22 0 0 1 72 46 L72 90 -->
    <path
      d="M28 90 L28 46 A22 22 0 0 1 72 46 L72 90"
      stroke="#FAF7F0"
      stroke-width="9"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
    <!-- Gold Door: M50 26 L66 34 L66 88 L50 90 Z -->
    <path
      d="M50 26 L66 34 L66 88 L50 90 Z"
      fill="#C9A55C"
    />
  </g>
</svg>`;

async function makeIcons() {
  console.log('Writing public/icons/icon.svg...');
  writeFileSync('public/icons/icon.svg', svgContent, 'utf8');

  console.log('Launching headless browser to render PNG icons...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  // Read backdrop image if available for texture
  let backdropBase64 = '';
  if (existsSync('public/brand/app-icon-backdrop.png')) {
    const buf = readFileSync('public/brand/app-icon-backdrop.png');
    backdropBase64 = `data:image/png;base64,${buf.toString('base64')}`;
  }

  const html = `<!DOCTYPE html>
  <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { width: 512px; height: 512px; background: #13233A; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .backdrop { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.85; }
        .mark-container { position: relative; z-index: 10; width: 300px; height: 300px; }
      </style>
    </head>
    <body>
      ${backdropBase64 ? `<img class="backdrop" src="${backdropBase64}" />` : ''}
      <svg class="mark-container" viewBox="0 0 100 100" fill="none">
        <path d="M28 90 L28 46 A22 22 0 0 1 72 46 L72 90" stroke="#FAF7F0" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M50 26 L66 34 L66 88 L50 90 Z" fill="#C9A55C" />
      </svg>
    </body>
  </html>`;

  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(html);

  console.log('Generating public/icons/icon-512.png...');
  await page.screenshot({ path: 'public/icons/icon-512.png', clip: { x: 0, y: 0, width: 512, height: 512 } });

  console.log('Generating public/icons/icon-192.png...');
  await page.setViewportSize({ width: 192, height: 192 });
  await page.evaluate(() => {
    document.body.style.width = '192px';
    document.body.style.height = '192px';
    const mark = document.querySelector('.mark-container');
    if (mark) {
      mark.style.width = '112px';
      mark.style.height = '112px';
    }
  });
  await page.screenshot({ path: 'public/icons/icon-192.png', clip: { x: 0, y: 0, width: 192, height: 192 } });

  console.log('Generating public/icons/apple-touch-icon.png (180x180)...');
  await page.setViewportSize({ width: 180, height: 180 });
  await page.evaluate(() => {
    document.body.style.width = '180px';
    document.body.style.height = '180px';
    const mark = document.querySelector('.mark-container');
    if (mark) {
      mark.style.width = '106px';
      mark.style.height = '106px';
    }
  });
  await page.screenshot({ path: 'public/icons/apple-touch-icon.png', clip: { x: 0, y: 0, width: 180, height: 180 } });

  console.log('Generating public/icons/favicon-32.png...');
  await page.setViewportSize({ width: 32, height: 32 });
  await page.evaluate(() => {
    document.body.style.width = '32px';
    document.body.style.height = '32px';
    const mark = document.querySelector('.mark-container');
    if (mark) {
      mark.style.width = '24px';
      mark.style.height = '24px';
    }
  });
  await page.screenshot({ path: 'public/icons/favicon-32.png', clip: { x: 0, y: 0, width: 32, height: 32 } });

  await browser.close();
  console.log('Icons generated successfully!');
}

makeIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
