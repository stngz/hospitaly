import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'docs/go/playwright-report', open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    serviceWorkers: 'block',
    channel: 'chrome',
    timezoneId: 'Asia/Dubai', // Proves all UI displays in Africa/Lusaka regardless of client timezone
  },
  projects: [
    {
      name: 'iphone-13',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        channel: 'chrome',
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'pixel-7',
      use: {
        ...devices['Pixel 7'],
        defaultBrowserType: 'chromium',
        channel: 'chrome',
        viewport: { width: 412, height: 915 },
      },
    },
    {
      name: 'small-android',
      use: {
        viewport: { width: 360, height: 740 },
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
        channel: 'chrome',
      },
    },
    {
      name: 'iphone-se',
      use: {
        ...devices['iPhone SE'],
        defaultBrowserType: 'chromium',
        channel: 'chrome',
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
  },
});
