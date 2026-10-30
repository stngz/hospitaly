import { test, expect } from '@playwright/test';
import { buildPilotSeedData } from '../../scripts/seed-emulator';

test.describe('P1 & P2: Web Sales, In-Page Scanner, Demo, Mobile Polish', () => {
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

  test('P1-1: / loads SalesPage (hero, headline, CTAs, 3 steps, quote form, FAQ, footer)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Hero title
    await expect(page.locator('h1')).toContainText('Never miss a guest request again');

    // CTAs
    await expect(page.getByRole('link', { name: /Get a quote/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Chat on WhatsApp/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Try the demo/i }).first()).toBeVisible();

    // 3-step guide images
    await expect(page.locator('img[src="/brand/step-scan.jpg"]')).toBeVisible();
    await expect(page.locator('img[src="/brand/step-request.jpg"]')).toBeVisible();
    await expect(page.locator('img[src="/brand/step-done.jpg"]')).toBeVisible();

    // Quote form exists
    const quoteForm = page.locator('#quote');
    await expect(quoteForm).toBeVisible();
    await expect(quoteForm.locator('input[placeholder="e.g. Zambezi Sun Lodge"]')).toBeVisible();

    // Footer link to in-page scanner exists
    const scanFooterLink = page.getByRole('button', { name: /Staying at a property\? Scan your room QR/i });
    await expect(scanFooterLink).toBeVisible();

    // Staff sign-in link in footer
    const staffSignIn = page.getByRole('button', { name: /Staff sign in/i });
    await expect(staffSignIn).toBeVisible();
  });

  test('P1-2: Stored guest session does NOT restore on / (sales-first guarantee)', async ({ page }) => {
    // Seed an active guest session into localStorage
    await page.addInitScript(() => {
      localStorage.setItem(
        'hospitally_guest_stay_session_v1',
        JSON.stringify({
          roomId: 'room-1',
          stayId: 'stay-chisenga-1',
          propertyId: 'rocks-apartments',
          roomNumber: 'Chisenga',
          token: 'ROCKSAPA-CHISENGA-HI55',
          lastActiveAt: Date.now(),
        })
      );
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Must still show sales landing page, NOT guest banner or room Chisenga
    await expect(page.locator('h1')).toContainText('Never miss a guest request again');
    await expect(page.getByTestId('guest-hero-banner')).not.toBeVisible();
  });

  test('P1-3: Quote form submission writes lead and appears in HQ Leads tab', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Fill the quote form
    await page.fill('#quote input[placeholder="e.g. Chileshe Mwamba"]', 'Chiluba Banda');
    await page.fill('#quote input[placeholder="e.g. Zambezi Sun Lodge"]', 'Zambezi Sun Lodge');
    await page.fill('#quote input[placeholder="e.g. 12"]', '24');
    await page.fill('#quote input[placeholder="+260 97 ..."]', '+260 97 999 1122');

    await page.click('#quote button[type="submit"]');

    // Success banner
    await expect(page.locator('text=Thanks, Chiluba Banda!')).toBeVisible({ timeout: 5000 });

    // Now log in as Founder in HQ and verify the lead appears in Leads tab
    await page.goto('/hq', { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await emailInput.isVisible()) {
      await emailInput.fill('founder.pilot@hospitaly.app');
      await page.locator('#login-password').fill('FounderRocks2026!');
      await page.locator('button[type="submit"]').click();
    }

    await expect(page.locator('h1:has-text("HQ")').first()).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Leads")');

    // Verify lead is present
    await expect(page.locator('text=Zambezi Sun Lodge')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Chiluba Banda · Lusaka')).toBeVisible();
    await expect(page.locator('text=24 rooms')).toBeVisible();
  });

  test('P1-4: In-page QR scanner at /scan renders video framing UI and back navigation', async ({ page }) => {
    await page.goto('/scan', { waitUntil: 'domcontentloaded' });

    // Scanner modal / page elements
    await expect(page.locator('text=Scan Room QR')).toBeVisible();

    // Close button navigates back to /
    const closeBtn = page.getByRole('button', { name: /Close scanner/i });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    await expect(page.locator('h1')).toContainText('Never miss a guest request again');
  });

  test('P1-5: Demo at /demo renders interactive guest experience', async ({ page }) => {
    await page.goto('/demo', { waitUntil: 'domcontentloaded' });

    // Demo banner
    await expect(page.locator('text=Demo — this is what your guests see in their room')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Sunset Villa 4');
    await expect(page.locator('text=SUNSET LODGE · LUSAKA')).toBeVisible();

    // Wi-Fi card with full password & copy button
    await expect(page.locator('text=sunset2026')).toBeVisible();
    await page.click('button:has-text("Copy")');
    await expect(page.locator('button:has-text("Copied")')).toBeVisible();

    // Test sending simulated request
    await page.click('button:has-text("Fresh towels")');
    await expect(page.locator('text=Request sent')).toBeVisible();
  });

  test('P2-1: Mobile viewport meta tag contains maximum-scale=1 and viewport-fit=cover', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('maximum-scale=1');
    expect(viewportMeta).toContain('viewport-fit=cover');
  });

  test('P2-2: 6-hour guest inactivity flags session as rescan_required', async ({ page }) => {
    // Seed an expired session (7 hours ago)
    const SEVEN_HOURS_AGO = Date.now() - 7 * 60 * 60 * 1000;
    await page.addInitScript((sevenHoursAgo) => {
      localStorage.setItem(
        'hospitally_guest_stay_session_v1',
        JSON.stringify({
          roomId: 'room-1',
          stayId: 'stay-chisenga-1',
          propertyId: 'rocks-apartments',
          roomNumber: 'Chisenga',
          lastActiveAt: sevenHoursAgo,
        })
      );
    }, SEVEN_HOURS_AGO);

    // Navigate to guest path
    await page.goto('/guest', { waitUntil: 'domcontentloaded' });

    // Should ask for re-scan
    await expect(page.locator('text=Please scan your room QR')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=in-room guest sessions expire after 6 hours of inactivity')).toBeVisible();
    await expect(page.getByRole('link', { name: /Scan your room QR/i }).first()).toBeVisible();
  });
});
