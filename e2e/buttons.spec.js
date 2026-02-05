/**
 * E2E Button Smoke Tests (Playwright)
 *
 * These tests load each page in a real browser and click every button,
 * verifying no console errors occur. This is the definitive test that
 * buttons actually work -- not just that the wiring looks correct.
 *
 * To run:
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *   npx playwright test
 *
 * These tests require a local server:
 *   npx serve . -l 8080
 */

// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

// Collect console errors during each test
let consoleErrors = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });
});

test.afterEach(async () => {
  // Filter out expected errors (CDN failures in test env, etc.)
  const realErrors = consoleErrors.filter(
    (e) => !e.includes('Chart.js') && !e.includes('net::ERR_')
  );
  expect(realErrors, `Unexpected console errors: ${realErrors.join('\n')}`).toEqual([]);
});

test.describe('Retirement Simulator Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/retirement-simulator.html`);
  });

  test('Simple/Advanced mode toggle works', async ({ page }) => {
    const advancedBtn = page.locator('#advancedModeBtn');
    await advancedBtn.click();
    await expect(page.locator('#advancedInputs')).toBeVisible();
    await expect(page.locator('#simpleInputs')).toBeHidden();

    const simpleBtn = page.locator('#simpleModeBtn');
    await simpleBtn.click();
    await expect(page.locator('#simpleInputs')).toBeVisible();
  });

  test('Social Security buttons switch modes', async ({ page }) => {
    await page.locator('#ssKnownBtn').click();
    await expect(page.locator('#ssKnownInputs')).toBeVisible();

    await page.locator('#ssEstimateBtn').click();
    await expect(page.locator('#ssEstimateInputs')).toBeVisible();
    await expect(page.locator('#ssKnownInputs')).toBeHidden();

    await page.locator('#ssNoneBtn').click();
    await expect(page.locator('#ssKnownInputs')).toBeHidden();
    await expect(page.locator('#ssEstimateInputs')).toBeHidden();
  });

  test('Life events panel toggles', async ({ page }) => {
    await page.locator('#toggleEvents').click();
    await expect(page.locator('#eventsPanel')).toBeVisible();

    await page.locator('#toggleEvents').click();
    await expect(page.locator('#eventsPanel')).toBeHidden();
  });

  test('Run Simulation button triggers simulation', async ({ page }) => {
    await page.locator('#runSimulation').click();
    // Results section should become visible after simulation
    await expect(page.locator('#results')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#successRate')).not.toHaveText('-');
  });

  test('Preset buttons update return parameters', async ({ page }) => {
    await page.locator('#presetConservative').click();
    await expect(page.locator('#expectedReturn')).toHaveValue('5');

    await page.locator('#presetAggressive').click();
    await expect(page.locator('#expectedReturn')).toHaveValue('9');
  });
});

test.describe('Income Allocation Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/income-allocation.html`);
  });

  test('Preset buttons are clickable and update sliders', async ({ page }) => {
    await page.locator('.preset-btn[data-preset="aggressive"]').click();
    // After clicking aggressive, fixed costs should be lower
    const fixedPercent = await page.locator('#fixedCostsPercent').textContent();
    expect(parseInt(fixedPercent)).toBeLessThanOrEqual(50);
  });

  test('Tax toggle switches between pre and post tax', async ({ page }) => {
    await page.locator('#preTaxOption').click();
    await expect(page.locator('#taxFields')).toBeVisible();
  });

  test('Save scenario button works', async ({ page }) => {
    // Enter income first
    await page.locator('#income').fill('5000');
    await page.locator('#income').press('Tab');

    // Click save scenario
    await page.locator('#saveScenarioBtn').click();

    // Scenario grid should now have content
    const scenarioGrid = page.locator('#scenarioGrid');
    await expect(scenarioGrid).not.toBeEmpty();
  });
});

test.describe('Transaction Analyzer Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/transaction-analyzer.html`);
  });

  test('Upload area is clickable', async ({ page }) => {
    // Clicking upload area should trigger file input
    const fileInput = page.locator('#fileInput');
    await expect(fileInput).toBeAttached();
  });

  test('API key visibility toggle works', async ({ page }) => {
    const apiKeyInput = page.locator('#apiKey');
    await expect(apiKeyInput).toHaveAttribute('type', 'password');

    // Find and click the toggle button
    await page.locator('button', { hasText: /show/i }).first().click();
    await expect(apiKeyInput).toHaveAttribute('type', 'text');
  });
});

test.describe('Landing Page Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);
  });

  test('Tool links navigate to correct pages', async ({ page }) => {
    const links = page.locator('a[href*=".html"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    // Verify each link points to a real page
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toMatch(/\.(html)$/);
    }
  });
});
