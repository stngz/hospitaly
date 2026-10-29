import { test, expect } from '@playwright/test';
import { buildPilotSeedData } from '../../scripts/seed-emulator';

test.describe('Founder HQ (F1 - F2)', () => {
  test.beforeEach(async ({ page }) => {
    const seed = buildPilotSeedData();
    await page.addInitScript((data) => {
      (window as any).__HOSPITALLY_INITIAL_DATA__ = data;
      try {
        localStorage.setItem('hospitally_seed_data', JSON.stringify(data));
      } catch {}
    }, seed);
  });

  test('F1: Founder sign in and dashboard navigation', async ({ page }) => {
    await page.goto('/hq', { waitUntil: 'domcontentloaded' });

    // Wait for login gate if unauthenticated
    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    if (await emailInput.isVisible()) {
      await emailInput.fill('founder.pilot@hospitaly.app');
      await page.locator('#login-password').fill('FounderRocks2026!');
      await page.locator('button[type="submit"]').click();
    }

    // Header with Hospitally HQ
    await expect(page.locator('h1')).toContainText('Hospitally HQ', { timeout: 12000 });

    // Section tabs: Properties, Account Administration, Activity Log
    await expect(page.locator('button:has-text("Properties")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Account Administration")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Activity Log")').first()).toBeVisible();

    // Verify 0 horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
