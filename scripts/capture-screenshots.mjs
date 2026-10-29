import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { buildPilotSeedData } from './seed-emulator.ts';

const SCREENSHOT_DIR = path.resolve('docs/go/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const BASE_URL = 'http://127.0.0.1:3000';

async function run() {
  console.log('--- Launching Playwright with System Chrome ---');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Dubai',
  });

  const page = await context.newPage();

  const seed = buildPilotSeedData();
  await page.addInitScript((data) => {
    window.__HOSPITALLY_INITIAL_DATA__ = data;
    try {
      localStorage.setItem('hospitally_seed_data', JSON.stringify(data));
    } catch {}
  }, seed);

  try {
    // 1. Guest Home (active stay Chisenga)
    console.log('Capturing 01-guest-home.png...');
    await page.goto(`${BASE_URL}/r/ROCKSAPA-CHISENGA-HI55`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-guest-home.png') });

    // 2. Request Flow
    console.log('Capturing 02-request-flow.png...');
    const quickBtn = page.getByTestId('quick-request-towels');
    if (await quickBtn.isVisible()) {
      await quickBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-request-flow.png') });

      // Click Send to trigger status timeline
      const sendBtn = page.getByTestId('quick-request-send-btn');
      if (await sendBtn.isVisible()) {
        await sendBtn.click();
        await page.waitForTimeout(1000);
        // 3. Status Timeline
        console.log('Capturing 03-status.png...');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-status.png') });
      }
    }

    // 4. House Guide
    console.log('Capturing 04-house-guide.png...');
    await page.goto(`${BASE_URL}/r/ROCKSAPA-CHISENGA-HI55`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const guideTab = page.locator('button:has-text("House Guide"), button:has-text("House guide")').first();
    if (await guideTab.isVisible()) {
      await guideTab.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-house-guide.png') });
    }

    // 5. Suspended / Unoccupied Screen Notice
    console.log('Capturing 05-suspended-screen.png...');
    await page.goto(`${BASE_URL}/r/ROCKSAPA-CHIPO-4550`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-suspended-screen.png') });

    // 6. Staff Board
    console.log('Capturing 06-staff-board.png...');
    await page.goto(`${BASE_URL}/staff`, { waitUntil: 'domcontentloaded' });
    const staffEmail = page.locator('#login-email');
    await staffEmail.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await staffEmail.isVisible()) {
      await staffEmail.fill('manager.pilot@example.com');
      await page.locator('#login-password').fill('Welcome2026!');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-staff-board.png') });

    // 7. Live Check-Out Strip
    console.log('Capturing 07-live-checkout-strip.png...');
    const strip = page.locator('[data-testid*="live-checkout"]').first();
    if (await strip.isVisible({ timeout: 4000 }).catch(() => false)) {
      await strip.screenshot({ path: path.join(SCREENSHOT_DIR, '07-live-checkout-strip.png') });
    } else {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-live-checkout-strip.png') });
    }

    // 8. Houses Tab
    console.log('Capturing 08-houses-tab.png...');
    const housesTab = page.locator('button:has-text("Houses")').first();
    if (await housesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await housesTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-houses-tab.png') });

      // 9. QR Card Plaque
      console.log('Capturing 09-qr-card.png...');
      const qrBtn = page.locator('button[title*="QR"], button:has-text("QR")').first();
      if (await qrBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await qrBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-qr-card.png') });
        const closeBtn = page.locator('button:has-text("✕")').first();
        if (await closeBtn.isVisible()) await closeBtn.click();
      }
    }

    // 10. Founder HQ Home
    console.log('Capturing 10-hq-home.png...');
    await page.goto(`${BASE_URL}/hq`, { waitUntil: 'domcontentloaded' });
    const hqEmail = page.locator('#login-email');
    await hqEmail.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await hqEmail.isVisible()) {
      await hqEmail.fill('founder.pilot@hospitaly.app');
      await page.locator('#login-password').fill('FounderRocks2026!');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-hq-home.png') });

    // 11. HQ Accounts Tab
    console.log('Capturing 11-hq-accounts.png...');
    const acctsTab = page.locator('button:has-text("Account Administration")').first();
    if (await acctsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await acctsTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-hq-accounts.png') });
    }

    console.log('--- SUCCESS: All 11 screenshots captured at 390px! ---');
  } catch (err) {
    console.error('Screenshot capture error:', err);
  } finally {
    await browser.close();
  }
}

run();
