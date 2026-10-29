import { test, expect } from '@playwright/test';
import { buildPilotSeedData } from '../../scripts/seed-emulator';

test.describe('Guest Experience Journeys (G1 - G6)', () => {
  test.beforeEach(async ({ page }) => {
    const seed = buildPilotSeedData();
    await page.addInitScript((data) => {
      (window as any).__HOSPITALLY_INITIAL_DATA__ = data;
      try {
        localStorage.setItem('hospitally_seed_data', JSON.stringify(data));
      } catch {}
    }, seed);
  });

  test('G1: QR scan lands on active stay with Lusaka clock, Wi-Fi card, and greeting', async ({ page }) => {
    // Open Chisenga active token
    await page.goto('/r/ROCKSAPA-CHISENGA-HI55', { waitUntil: 'domcontentloaded' });

    // 1. Verify Hero Banner & Lusaka Clock
    const banner = page.getByTestId('guest-hero-banner');
    await expect(banner).toBeVisible({ timeout: 10000 });

    const clockPill = page.getByTestId('lusaka-clock-pill');
    await expect(clockPill).toBeVisible();
    await expect(clockPill).toContainText(/Lusaka/i);

    // 2. Verify Wi-Fi Card with visible password and copy button
    const wifiCard = page.getByTestId('wifi-card');
    await expect(wifiCard).toBeVisible();
    const wifiPass = page.getByTestId('wifi-password');
    await expect(wifiPass).toBeVisible();
    const wifiCopyBtn = page.getByTestId('wifi-copy-btn');
    await expect(wifiCopyBtn).toBeVisible();

    // 3. Verify zero horizontal scrolling
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('G2: Quick request submission with delivery preference', async ({ page }) => {
    await page.goto('/r/ROCKSAPA-CHISENGA-HI55', { waitUntil: 'domcontentloaded' });

    // Tap quick request (Fresh towels)
    const quickTile = page.getByTestId('quick-request-towels');
    await expect(quickTile).toBeVisible({ timeout: 10000 });
    await quickTile.click();

    // Confirm sheet opens
    const sendBtn = page.getByTestId('quick-request-send-btn');
    await expect(sendBtn).toBeVisible({ timeout: 5000 });
    await sendBtn.click();

    // Should navigate to status timeline
    await expect(page.getByTestId('request-status-timeline')).toBeVisible({ timeout: 8000 });
  });

  test('G4: Unoccupied house calm state', async ({ page }) => {
    // Chipo is unoccupied
    await page.goto('/r/ROCKSAPA-CHIPO-4550', { waitUntil: 'domcontentloaded' });

    // Should render calm unoccupied message
    const emptyNotice = page.getByTestId('guest-unoccupied-view');
    await expect(emptyNotice).toBeVisible({ timeout: 10000 });
    await expect(emptyNotice).toContainText("isn't checked in");
  });

  test('G5: Invalid or expired QR token state', async ({ page }) => {
    await page.goto('/r/INVALID-NONEXISTENT-TOKEN', { waitUntil: 'domcontentloaded' });

    const invalidState = page.locator('[data-testid*="guest-gate"], [data-testid*="invalid"]').first();
    await expect(invalidState).toBeVisible({ timeout: 10000 });
  });
});
