import { test, expect } from '@playwright/test';
import { buildPilotSeedData } from '../../scripts/seed-emulator';

test.describe('Operations & Front Desk (S1 - S2, M1 - M2)', () => {
  test.beforeEach(async ({ page }) => {
    const seed = buildPilotSeedData();
    await page.addInitScript((data) => {
      (window as any).__HOSPITALLY_INITIAL_DATA__ = data;
      try {
        localStorage.setItem('hospitally_seed_data', JSON.stringify(data));
      } catch {}
    }, seed);
  });

  test('S1: Staff Dashboard loads with Live Check-outs strip and Requests board', async ({ page }) => {
    // Navigate to staff portal (or bypass login in test mock environment)
    await page.goto('/staff', { waitUntil: 'domcontentloaded' });

    // Wait for login gate if unauthenticated
    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    if (await emailInput.isVisible()) {
      await emailInput.fill('manager.pilot@example.com');
      await page.locator('#login-password').fill('Welcome2026!');
      await page.locator('button[type="submit"]').click();
    }

    // Verify Staff Header
    await expect(page.locator('header').first()).toBeVisible({ timeout: 12000 });

    // Verify Live Check-outs Strip
    const checkoutStrip = page.locator('[data-testid*="live-checkout"]').first();
    await expect(checkoutStrip).toBeVisible({ timeout: 8000 });

    // Verify 1-row tabs (Requests, Houses, Team)
    const requestsTab = page.locator('button:has-text("Requests")').first();
    await expect(requestsTab).toBeVisible({ timeout: 10000 });
  });

  test('S2: Front desk houses list and QR card plaque view', async ({ page }) => {
    await page.goto('/staff', { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    if (await emailInput.isVisible()) {
      await emailInput.fill('manager.pilot@example.com');
      await page.locator('#login-password').fill('Welcome2026!');
      await page.locator('button[type="submit"]').click();
    }

    // Switch to Houses tab
    const housesTab = page.locator('button:has-text("Houses")').first();
    await expect(housesTab).toBeVisible({ timeout: 12000 });
    await housesTab.click();
    await expect(page.getByTestId('houses-grid')).toBeVisible({ timeout: 10000 });

    // Check that QR Card can be opened
    const qrBtn = page.locator('button[title*="QR"], button:has-text("QR")').first();
    await expect(qrBtn).toBeVisible({ timeout: 8000 });
    await qrBtn.click();

    // Plaque modal should open without horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('S3: Malformed requests with missing category, title, or roomNumber render safely with fallbacks', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR STACK:', err.stack || err.message));

    // Inject a completely malformed request into seed data
    await page.addInitScript(() => {
      try {
        const stored = localStorage.getItem('hospitally_seed_data');
        if (stored) {
          const data = JSON.parse(stored);
          data.requests = data.requests || [];
          data.requests.push({
            id: 'req_malformed_test',
            propertyId: 'prop_rocks_lusaka',
            status: 'pending',
            createdAt: new Date().toISOString(),
            // category, title, roomNumber intentionally omitted
          });
          localStorage.setItem('hospitally_seed_data', JSON.stringify(data));
        }
      } catch {}
    });

    await page.goto('/staff', { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    if (await emailInput.isVisible()) {
      await emailInput.fill('manager.pilot@example.com');
      await page.locator('#login-password').fill('Welcome2026!');
      await page.locator('button[type="submit"]').click();
    }

    // Verify Staff Header and requests board load without unmounting
    await expect(page.locator('header').first()).toBeVisible({ timeout: 12000 });
    const requestsTab = page.locator('button:has-text("Requests")').first();
    await expect(requestsTab).toBeVisible({ timeout: 10000 });

    // The malformed card renders safe fallback text ('Service request' and 'House')
    await expect(page.locator('text=Service request').first()).toBeVisible({ timeout: 10000 });
  });
});
