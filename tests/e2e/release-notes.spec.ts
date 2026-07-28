import { expect, test } from '@playwright/test';

const RELEASE = {
  schemaVersion: 1,
  id: 'abcdef1234567890',
  version: '2026.07.22.abcdef1',
  releasedAt: '2026-07-22T08:00:00.000Z',
  repositoryUrl: 'https://github.com/lbise/saveslate',
  compareUrl: 'https://github.com/lbise/saveslate/compare/123...abc',
  commits: [
    {
      sha: 'abcdef1234567890',
      title: 'Improve release notes',
      url: 'https://github.com/lbise/saveslate/commit/abcdef1234567890',
      author: 'SaveSlate',
    },
  ],
};

test('shows each deployment once and allows reopening from Settings', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.route('**/release.json', (route) => route.fulfill({ json: RELEASE }));
  await page.goto('/');

  const dialog = page.getByRole('dialog', { name: /what's new in saveslate/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Improve release notes')).toBeVisible();
  await expect(dialog.getByRole('link', { name: /Improve release notes/ }))
    .toHaveAttribute('href', RELEASE.commits[0].url);

  await dialog.getByRole('button', { name: 'Got it' }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(dialog).toBeHidden();

  await page.goto('/settings');
  await page.getByRole('button', { name: "What's new" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(RELEASE.version);
});
