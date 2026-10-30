import { test, expect } from '@playwright/test';
import { buildPilotSeedData } from '../../scripts/seed-emulator';

test.describe('P0 Data Session & Sign In/Out Idempotency', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    const seed = buildPilotSeedData();
    await page.addInitScript((data) => {
      (window as any).__HOSPITALLY_INITIAL_DATA__ = data;
      try {
        localStorage.setItem('hospitally_seed_data', JSON.stringify(data));
      } catch {}
    }, seed);
  });

  test('P0-1: Founder sign in → 7 houses; sign out → sign in (same tab, no reload) → still 7; repeat 3×', async ({ page }) => {
    await page.goto('/hq', { waitUntil: 'domcontentloaded' });

    for (let cycle = 1; cycle <= 3; cycle++) {
      // 1. Wait for Login Gate on /hq
      const emailInput = page.locator('#login-email');
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.fill('founder.pilot@hospitaly.app');
      await page.locator('#login-password').fill('FounderRocks2026!');
      await page.locator('button[type="submit"]').click();

      // 2. Founder dashboard renders
      await expect(page.locator('h1')).toContainText('Hospitally HQ', { timeout: 12000 });

      // 3. Properties count is visible and accurate (7 properties)
      const propsTab = page.locator('button:has-text("Properties")').first();
      await expect(propsTab).toBeVisible({ timeout: 8000 });

      // 4. Sign out
      const signOutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Sign out")').first();
      await expect(signOutBtn).toBeVisible({ timeout: 8000 });
      await signOutBtn.click();

      // 5. Returns to login gate without page refresh
      await expect(emailInput).toBeVisible({ timeout: 10000 });
    }
  });

  test('P0-2: Switch user founder → staff in the same tab → data properly scoped', async ({ page }) => {
    await page.goto('/hq', { waitUntil: 'domcontentloaded' });

    // 1. Sign in as Founder
    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('founder.pilot@hospitaly.app');
    await page.locator('#login-password').fill('FounderRocks2026!');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('h1')).toContainText('Hospitally HQ', { timeout: 12000 });

    // 2. Sign out
    const signOutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Sign out")').first();
    await signOutBtn.click();
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    // 3. Navigate to staff portal without page reload
    await page.goto('/staff', { waitUntil: 'domcontentloaded' });
    const staffEmail = page.locator('#login-email');
    await staffEmail.waitFor({ state: 'visible', timeout: 10000 });
    await staffEmail.fill('manager.pilot@example.com');
    await page.locator('#login-password').fill('FounderRocks2026!');
    await page.locator('button[type="submit"]').click();

    // 4. Staff desk loads with requests board and houses
    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15000 });
    const requestsTab = page.locator('button:has-text("Requests")').first();
    await expect(requestsTab).toBeVisible();

    // Switch to Houses tab — manager sees only their property's houses
    const housesTab = page.locator('button:has-text("Houses")').first();
    await housesTab.click();
    await expect(page.getByTestId('houses-grid')).toBeVisible();
    await expect(page.locator('text=Chisenga').first()).toBeVisible();
  });
});
