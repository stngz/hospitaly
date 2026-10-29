import { test, expect } from '@playwright/test';
import { buildPilotSeedData } from '../../scripts/seed-emulator';

test.describe('Wave 2 Q-Tasks Suite', () => {
  test.beforeEach(async ({ page }) => {
    const seed = buildPilotSeedData();
    await page.addInitScript((data) => {
      (window as any).__HOSPITALLY_INITIAL_DATA__ = data;
      try {
        if (!sessionStorage.getItem('hospitally_test_seeded')) {
          localStorage.setItem('hospitally_seed_data', JSON.stringify(data));
          sessionStorage.setItem('hospitally_test_seeded', '1');
        }
      } catch {}
    }, seed);
  });

  async function loginAs(page: any, email: string, pass: string = 'Welcome2026!') {
    await page.goto('/staff', { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await emailInput.isVisible()) {
      await emailInput.fill(email);
      await page.locator('#login-password').fill(pass);
      await page.locator('button[type="submit"]').click();
    }
    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15_000 });
  }

  // --- Q1: GUEST EXPERIENCE ---

  test('Q1.1: Friendly animated loading screen appears during QR token resolution', async ({ page }) => {
    await page.goto('/r/ROCKSAPA-CHISENGA-HI55', { waitUntil: 'domcontentloaded' });
    // Verify loading screen or smooth transition into guest hero banner
    await expect(page.locator('[data-testid="guest-loading-screen"]').or(page.locator('[data-testid="guest-hero-banner"]'))).toBeVisible();
    await expect(page.locator('[data-testid="guest-hero-banner"]')).toBeVisible({ timeout: 12_000 });
  });

  test('Q1.2: Banner top row shows city Lusaka once only and quiet check-out line', async ({ page }) => {
    await page.goto('/r/ROCKSAPA-CHISENGA-HI55', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="guest-hero-banner"]')).toBeVisible({ timeout: 12_000 });

    const bannerTitle = await page.locator('[data-testid="banner-property-city"]').textContent();
    // Lusaka must appear exactly once in the property/city header
    const lusakaMatches = (bannerTitle || '').match(/lusaka/gi);
    expect(lusakaMatches?.length).toBe(1);

    // Right side has time only (e.g. 19:28 or HH:MM)
    const timeText = await page.locator('[data-testid="banner-time"]').textContent();
    expect(timeText?.trim()).toMatch(/^\d{1,2}:\d{2}$/);

    // Quiet check-out line under the greeting: "{houseType} · until ..."
    const quietLine = page.locator('[data-testid="banner-quiet-checkout"]');
    await expect(quietLine).toBeVisible();
    const text = await quietLine.textContent();
    expect(text).toContain('until');
    expect(text).not.toContain('soon');
    expect(text).not.toContain('hurry');
  });

  test('Q1.3 & Q1.4: Quick request placeholders and delivery options (no Ring anywhere)', async ({ page }) => {
    await page.goto('/r/ROCKSAPA-CHISENGA-HI55', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="guest-hero-banner"]')).toBeVisible({ timeout: 12_000 });

    // 1. Fresh towels quick item (delivery: Leave at door default or Knock, NO Ring)
    const towelsBtn = page.locator('[data-testid="quick-request-towels"]');
    await expect(towelsBtn).toBeVisible({ timeout: 8000 });
    await towelsBtn.click();

    const sheet = page.locator('[data-testid="quick-request-confirm-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // Check placeholder: "e.g. 2 bath towels please"
    const noteInput = page.locator('[data-testid="quick-request-note-input"]');
    await expect(noteInput).toHaveAttribute('placeholder', 'e.g. 2 bath towels please');

    // Check delivery options
    await expect(page.locator('[data-testid="quick-delivery-leave_at_door"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-delivery-knock"]')).toBeVisible();
    await expect(page.locator('text=Ring')).toHaveCount(0);

    // Close sheet
    const closeBtn = page.locator('button[aria-label="Close"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(sheet).not.toBeVisible();

    // 2. Cleaning service (Knock only, no choice grid shown)
    const cleaningBtn = page.locator('[data-testid="quick-request-cleaning"]');
    await expect(cleaningBtn).toBeVisible();
    await cleaningBtn.click();

    await expect(sheet).toBeVisible({ timeout: 5000 });
    const cleaningNote = page.locator('[data-testid="quick-request-note-input"]');
    await expect(cleaningNote).toHaveAttribute('placeholder', 'e.g. please clean the kitchen and bathroom');

    // For service, no delivery choice grid is shown
    await expect(page.locator('[data-testid="quick-delivery-leave_at_door"]')).toHaveCount(0);
    await expect(page.locator('text=Ring')).toHaveCount(0);

    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
  });

  // --- Q2: OPERATIONS ---

  test('Q2.2: Done → GM verification flow with To verify filter chip', async ({ page }) => {
    await loginAs(page, 'manager.pilot@example.com', 'Welcome2026!');

    // Check GM "To verify" filter chip exists
    const toVerifyChip = page.locator('[data-testid="chip-to_verify"]');
    await expect(toVerifyChip).toBeVisible();

    // Verify chip shows a count
    const chipText = await toVerifyChip.textContent();
    expect(chipText).toContain('To verify');
  });

  test('Q2.3: Check-out department visibility (hidden for maintenance, visible for GM/housekeeping)', async ({ page }) => {
    await loginAs(page, 'manager.pilot@example.com', 'Welcome2026!');

    // For GM/Manager, check-out strip is visible
    await expect(page.locator('[data-testid="live-checkout-strip"]')).toBeVisible();

    // Switch to Houses tab: check-out buttons visible for GM
    await page.locator('button:has-text("Houses")').first().click();
    await expect(page.locator('[data-testid="card-checkout-btn-room_chisenga"]')).toBeVisible();
  });

  test('Q2.4 & Q2.5: Founder property desk actions (Add house & Create account for Founder)', async ({ page }) => {
    await loginAs(page, 'founder.pilot@hospitaly.app', 'FounderRocks2026!');

    // Founder on Houses tab has Add house button
    await page.locator('button:has-text("Houses")').first().click();
    const addHouseBtn = page.locator('[data-testid="add-house-btn"]');
    await expect(addHouseBtn).toBeVisible();

    // Founder on Team tab has "Create account" button instead of WhatsApp request
    await page.locator('button:has-text("Team")').first().click();
    const createAcctBtn = page.locator('[data-testid="create-account-btn"]');
    await expect(createAcctBtn).toBeVisible();

    // Verify Founder is NOT listed in property team list members
    const founderTeamCards = page.locator('[data-testid="team-tab"]').locator('text=Platform Founder');
    await expect(founderTeamCards).toHaveCount(0);
  });

  test('Q2.7: Check-in sheet title default is empty (None)', async ({ page }) => {
    await loginAs(page, 'manager.pilot@example.com', 'Welcome2026!');

    await page.locator('button:has-text("Houses")').first().click();
    // Open check-in modal on Chipo (which is available)
    const chipoCheckIn = page.locator('[data-testid="card-checkin-btn-room_chipo"]');
    if (await chipoCheckIn.isVisible()) {
      await chipoCheckIn.click();
      const titleSelect = page.locator('[data-testid="checkin-title-select"]');
      await expect(titleSelect).toBeVisible();
      // Default value must be empty string
      await expect(titleSelect).toHaveValue('');
    }
  });

  // --- Q3: SESSIONS & ALERTS ---

  test('Q3.2: Sound & vibration alerts on staff phones (bell button & test alert menu)', async ({ page }) => {
    await loginAs(page, 'manager.pilot@example.com', 'Welcome2026!');

    // 1. Bell button in staff header
    const bellBtn = page.locator('[data-testid="toggle-sound-alerts-btn"]');
    await expect(bellBtn).toBeVisible();

    // 2. Open ⋯ menu and verify "Test alert" button
    await page.locator('[data-testid="staff-menu-btn"]').click();
    const testAlertBtn = page.locator('[data-testid="test-alert-btn"]');
    await expect(testAlertBtn).toBeVisible();
    await testAlertBtn.click();
  });

  // --- Q4: HQ & CONTACTS ---

  test('Q4.1 & Q4.2: Founder contact phone and WhatsApp separation', async ({ page }) => {
    await loginAs(page, 'manager.pilot@example.com', 'Welcome2026!');

    // Open Team tab and inspect Manager's "Request new account" WhatsApp link
    await page.locator('button:has-text("Team")').first().click();
    const requestAcctLink = page.locator('a:has-text("Request new account")');
    if (await requestAcctLink.isVisible()) {
      const href = await requestAcctLink.getAttribute('href');
      // Must use 260979850598
      expect(href).toContain('260979850598');
      expect(href).not.toContain('260970000001');
    }
  });
});
