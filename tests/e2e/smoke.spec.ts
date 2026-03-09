import { expect, test } from '@playwright/test';

const PRIMARY_ROUTES = [
  { label: 'Dashboard', path: '/' },
  { label: 'Transactions', path: '/transactions' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Accounts', path: '/accounts' },
  { label: 'Goals', path: '/goals' },
  { label: 'Categories', path: '/categories' },
  { label: 'Rules', path: '/rules' },
  { label: 'Settings', path: '/settings' },
  { label: 'Help', path: '/help' },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/');
});

test('navigates all primary routes from the sidebar', async ({ page }) => {
  for (const route of PRIMARY_ROUTES) {
    await page.getByRole('link', { name: route.label }).click();
    await expect(page).toHaveURL((url) => url.pathname === route.path);
    await expect(page.getByRole('heading', { level: 1, name: route.label })).toBeVisible();
  }
});

test('opens import flow from the dashboard header', async ({ page }) => {
  await page.getByRole('button', { name: /^Import$/ }).first().click();
  await expect(page).toHaveURL((url) => url.pathname === '/import');
  await expect(page.getByRole('heading', { level: 1, name: 'Import Transactions' })).toBeVisible();

  await page.getByRole('button', { name: /^Transactions$/ }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/transactions');
  await expect(page.getByRole('heading', { level: 1, name: 'Transactions' })).toBeVisible();
});

test('creates a new account from Accounts page', async ({ page }) => {
  const accountName = 'E2E Smoke Account';

  await page.goto('/accounts');
  await page.getByRole('button', { name: /^New$/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Create Account' })).toBeVisible();

  await page.getByLabel('Name').fill(accountName);
  await page.locator('form').getByRole('button', { name: 'Create Account' }).click();

  await expect(page.getByText(accountName)).toBeVisible();
});

test('creates a new fixed target goal', async ({ page }) => {
  const goalName = 'E2E Smoke Goal';

  await page.goto('/goals');
  await page.getByRole('button', { name: /^New$/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Create Goal' })).toBeVisible();

  await page.getByLabel('Goal name').fill(goalName);
  await page.getByLabel('Target amount').fill('5000');
  await page.getByRole('button', { name: 'Create Goal' }).click();

  await expect(page.getByText(goalName)).toBeVisible();
});

test('persists default currency setting in Settings page', async ({ page }) => {
  await page.goto('/settings');

  // The currency select is a Radix Select (not native <select>).
  // Locate the trigger by finding the row containing "Currency" text.
  const currencyRow = page.locator('div').filter({ hasText: /^Currency/ }).locator('[role=combobox]');

  // Open the select and pick USD
  await currencyRow.click();
  await page.getByRole('option', { name: /USD/ }).click();
  await expect(currencyRow).toHaveText(/USD/);

  // Verify it persists after reload
  await page.reload();
  const currencyRowAfter = page.locator('div').filter({ hasText: /^Currency/ }).locator('[role=combobox]');
  await expect(currencyRowAfter).toHaveText(/USD/);
});
