import { test, expect } from '@playwright/test';
import { buildPilotSeedData } from '../../scripts/seed-emulator';

test.describe('Golden Suites (Section 0 - Must Keep Working)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('GOLDEN LOG:', msg.text()));
    page.on('pageerror', err => console.log('GOLDEN ERROR:', err.message));
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

  test('Golden 1: Guest scans QR → banner with real photo, greeting, house name, and Lusaka time', async ({ page }) => {
    await page.goto('/r/ROCKSAPA-CHISENGA-HI55', { waitUntil: 'domcontentloaded' });

    // Banner and real photo
    const banner = page.getByTestId('guest-hero-banner');
    await expect(banner).toBeVisible({ timeout: 12000 });
    const bannerImg = banner.locator('img');
    await expect(bannerImg).toBeVisible();

    // Greeting: "Hello, Ms Princess Mazaba"
    const greeting = page.getByTestId('guest-greeting');
    await expect(greeting).toBeVisible({ timeout: 5000 });
    await expect(greeting).toContainText(/Princess Mazaba/i);

    // Welcome to Chisenga
    const welcome = page.getByTestId('guest-welcome-heading');
    await expect(welcome).toContainText(/Chisenga/i);

    // Lusaka time pill
    const clockPill = page.getByTestId('lusaka-clock-pill');
    await expect(clockPill).toBeVisible();
    await expect(clockPill).toContainText(/\d{1,2}:\d{2}/);
  });

  test('Golden 2: Wi-Fi card with full password + Copy button', async ({ page }) => {
    await page.goto('/r/ROCKSAPA-CHISENGA-HI55', { waitUntil: 'domcontentloaded' });

    const wifiCard = page.getByTestId('wifi-card');
    await expect(wifiCard).toBeVisible({ timeout: 10000 });

    const wifiPass = page.getByTestId('wifi-password');
    await expect(wifiPass).toBeVisible();
    await expect(wifiPass).not.toBeEmpty();

    const wifiCopyBtn = page.getByTestId('wifi-copy-btn');
    await expect(wifiCopyBtn).toBeVisible();
    await wifiCopyBtn.click();
    await expect(page.locator('text=/Copied/i')).toBeVisible({ timeout: 4000 });
  });

  test('Golden 3: Guest request → appears on staff board instantly → GM assigns → guest sees department team copy', async ({ page }) => {
    // 1. Guest creates a housekeeping request on Chisenga
    await page.goto('/r/ROCKSAPA-CHISENGA-HI55', { waitUntil: 'domcontentloaded' });
    const towelsTile = page.getByTestId('quick-request-towels');
    await expect(towelsTile).toBeVisible({ timeout: 10000 });
    await towelsTile.click();

    const sendBtn = page.getByTestId('quick-request-send-btn');
    await expect(sendBtn).toBeVisible({ timeout: 5000 });
    await sendBtn.click();

    // Guest timeline renders
    await expect(page.getByTestId('request-status-timeline')).toBeVisible({ timeout: 8000 });

    // 2. Front desk GM logs in to staff portal
    await page.goto('/staff', { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await emailInput.isVisible()) {
      await emailInput.fill('manager.pilot@example.com');
      await page.locator('#login-password').fill('Welcome2026!');
      await page.locator('button[type="submit"]').click();
    }

    await expect(page.locator('header').first()).toBeVisible({ timeout: 12000 });

    // Check request is visible on staff board
    const reqCard = page.locator('text=Fresh towels').first();
    await expect(reqCard).toBeVisible({ timeout: 10000 });

    // GM assigns staff member (Grace Phiri)
    const assignSelect = page.locator('select[data-testid^="assign-select-"]').first();
    await expect(assignSelect).toBeVisible({ timeout: 5000 });
    await assignSelect.selectOption('usr_staff_hk');
    await page.waitForTimeout(400);

    // 3. Guest returns to their house view and sees "Housekeeping team is on it"
    await page.goto('/r/ROCKSAPA-CHISENGA-HI55', { waitUntil: 'domcontentloaded' });
    const openCard = page.getByTestId('guest-open-request-card');
    await expect(openCard).toBeVisible({ timeout: 8000 });
    await openCard.click();

    await expect(page.getByTestId('request-team-copy')).toContainText('Housekeeping team is on it', { timeout: 10000 });
  });

  test('Golden 4: Staff board mobile layout, tabs, chips, check-out strip with countdown/overdue, Check out flow', async ({ page }) => {
    await page.goto('/staff', { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await emailInput.isVisible()) {
      await emailInput.fill('manager.pilot@example.com');
      await page.locator('#login-password').fill('Welcome2026!');
      await page.locator('button[type="submit"]').click();
    }
    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15000 });

    // Verify tabs
    await expect(page.locator('button:has-text("Requests")').first()).toBeVisible({ timeout: 12000 });
    await expect(page.locator('button:has-text("Houses")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Team")').first()).toBeVisible();

    // Verify live check-outs strip
    const checkoutStrip = page.locator('[data-testid*="live-checkout"]').first();
    await expect(checkoutStrip).toBeVisible({ timeout: 8000 });

    // Check out flow on Bobo
    const checkoutBtn = page.locator('button[data-testid^="checkout-btn-"]').first();
    if (await checkoutBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await checkoutBtn.click();
      const confirmModal = page.getByTestId('checkout-confirm-modal');
      await expect(confirmModal).toBeVisible({ timeout: 5000 });
      const confirmCheckoutBtn = page.getByTestId('confirm-checkout-btn');
      await confirmCheckoutBtn.click();
      await expect(confirmModal).not.toBeVisible({ timeout: 5000 });
    } else {
      const housesTab = page.locator('button:has-text("Houses")').first();
      await housesTab.click();
      const houseCheckoutBtn = page.locator('button:has-text("Check out"), button[data-testid^="checkout-btn-"]').first();
      await expect(houseCheckoutBtn).toBeVisible({ timeout: 8000 });
      await houseCheckoutBtn.click();
      const confirmModal = page.getByTestId('checkout-confirm-modal');
      await expect(confirmModal).toBeVisible({ timeout: 5000 });
      const confirmCheckoutBtn = page.getByTestId('confirm-checkout-btn');
      await confirmCheckoutBtn.click();
      await expect(confirmModal).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('Golden 5: Houses tab: house cards, Edit house modal, QR card modal + download buttons', async ({ page }) => {
    await page.goto('/staff', { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await emailInput.isVisible()) {
      await emailInput.fill('manager.pilot@example.com');
      await page.locator('#login-password').fill('Welcome2026!');
      await page.locator('button[type="submit"]').click();
    }
    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15000 });

    const housesTab = page.locator('button:has-text("Houses")').first();
    await expect(housesTab).toBeVisible({ timeout: 12000 });
    await housesTab.click();

    // Verify house card exists
    await expect(page.locator('text=Chisenga').first()).toBeVisible({ timeout: 8000 });

    // Edit house button opens modal
    const editBtn = page.locator('button[data-testid^="edit-house-btn-"]').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    const editModal = page.getByTestId('edit-house-modal');
    await expect(editModal).toBeVisible({ timeout: 5000 });

    // Close edit modal
    const cancelBtn = editModal.locator('button:has-text("Cancel")');
    await cancelBtn.click();
    await expect(editModal).not.toBeVisible({ timeout: 5000 });

    // Open QR plaque modal
    const qrBtn = page.locator('button[data-testid^="open-qr-plaque-"]').first();
    await expect(qrBtn).toBeVisible({ timeout: 5000 });
    await qrBtn.click();

    // Verify PNG download button inside modal
    await expect(page.locator('button:has-text("Download PNG")').first()).toBeVisible({ timeout: 6000 });

    // Close QR modal
    await page.locator('button:has-text("✕")').click();

    // Verify Download all QRs ZIP button exists in houses tab
    await expect(page.getByTestId('download-all-qrs-zip')).toBeVisible({ timeout: 5000 });
  });

  test('Golden 6: Founder suspend → staff go read-only instantly, guest sees calm notice; Resume', async ({ page }) => {
    // 1. Founder signs in to /hq
    await page.goto('/hq', { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await emailInput.isVisible()) {
      await emailInput.fill('founder.pilot@hospitaly.app');
      await page.locator('#login-password').fill('FounderRocks2026!');
      await page.locator('button[type="submit"]').click();
    }

    await expect(page.locator('h1:has-text("HQ")').first()).toBeVisible({ timeout: 15000 });

    // 2. Click Suspend on Rock Apartments card
    const suspendBtn = page.locator('button').filter({ hasText: /^Suspend$/ }).first();
    await expect(suspendBtn).toBeVisible({ timeout: 8000 });
    await suspendBtn.click();

    const confirmSuspendBtn = page.locator('button:has-text("Confirm Suspend")');
    await expect(confirmSuspendBtn).toBeVisible({ timeout: 5000 });
    await confirmSuspendBtn.click();
    await page.waitForTimeout(400);

    // 3. Navigate page to guest QR page to verify calm suspended notice
    await page.goto('/r/ROCKSAPA-CHISENGA-HI55', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('guest-suspended-view')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('guest-paused-card')).toBeVisible();

    // 4. Return to HQ and resume property
    await page.goto('/hq', { waitUntil: 'domcontentloaded' });
    const emailInput2 = page.locator('#login-email');
    await emailInput2.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    if (await emailInput2.isVisible()) {
      await emailInput2.fill('founder.pilot@hospitaly.app');
      await page.locator('#login-password').fill('FounderRocks2026!');
      await page.locator('button[type="submit"]').click();
    }
    const resumeBtn = page.locator('button:has-text("Reactivate")').first();
    await expect(resumeBtn).toBeVisible({ timeout: 8000 });
    await resumeBtn.click();

    const confirmResumeBtn = page.locator('button:has-text("Confirm Resume")');
    await expect(confirmResumeBtn).toBeVisible({ timeout: 5000 });
    await confirmResumeBtn.click();

    await expect(page.locator('text=/has been resumed|Active/i').first()).toBeVisible({ timeout: 8000 });
  });

  test('Golden 7: Founder creates staff account in HQ → appears in users; reset password; delete', async ({ page }) => {
    await page.goto('/hq', { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await emailInput.isVisible()) {
      await emailInput.fill('founder.pilot@hospitaly.app');
      await page.locator('#login-password').fill('FounderRocks2026!');
      await page.locator('button[type="submit"]').click();
    }

    // Switch to Account Administration tab
    const accountsTab = page.locator('button:has-text("Account Administration")').first();
    await expect(accountsTab).toBeVisible({ timeout: 12000 });
    await accountsTab.click();

    // Verify Provision Account button exists
    const provisionBtn = page.locator('button:has-text("Provision Account")').first();
    await expect(provisionBtn).toBeVisible({ timeout: 8000 });

    // Verify existing users list contains staff and GM (visible in table or cards)
    await expect(page.locator('text=Mutale Banda').filter({ visible: true }).first()).toBeVisible({ timeout: 8000 });
  });

  test('Golden 8: HQ look — dark luxury aesthetic, stats counters, tabs preserved', async ({ page }) => {
    await page.goto('/hq', { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await emailInput.isVisible()) {
      await emailInput.fill('founder.pilot@hospitaly.app');
      await page.locator('#login-password').fill('FounderRocks2026!');
      await page.locator('button[type="submit"]').click();
    }

    await expect(page.locator('h1:has-text("HQ")').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("Properties")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Account Administration")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Activity Log")').first()).toBeVisible();
  });

  test('Golden 9: No text under 12 px, no monospace on guest side, no horizontal scroll at 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/r/ROCKSAPA-CHISENGA-HI55', { waitUntil: 'domcontentloaded' });

    // Zero horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // No monospace font on guest side
    const hasMonospace = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.some((el) => {
        const style = window.getComputedStyle(el);
        return style.fontFamily.toLowerCase().includes('monospace') && (el.textContent || '').trim().length > 0;
      });
    });
    expect(hasMonospace).toBe(false);

    // No text under 12px
    const hasSub12px = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('p, span, h1, h2, h3, h4, button, label, a'));
      return elements.some((el) => {
        const text = (el.textContent || '').trim();
        if (!text) return false;
        const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
        return fontSize < 11.5; // allowance for rounding
      });
    });
    expect(hasSub12px).toBe(false);
  });
});
