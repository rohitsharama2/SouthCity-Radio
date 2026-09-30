import { test, expect } from '@playwright/test';
import { mockSouthCityServer } from './helpers.js';
import { workspacePorts } from '../src/data/workspaces.js';
const openEditor = async (page) => {
  await page.goto(`http://127.0.0.1:${workspacePorts.admin}/`);
  if (page.viewportSize().width < 761)
    await page.getByRole('button', { name: 'Toggle admin navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Admin navigation' })
    .getByRole('button', { name: 'Announcements', exact: true })
    .click();
};
test('announcements can be paused, drafted, published, and disabled', async ({ page }) => {
  await mockSouthCityServer(page);
  await page.goto('/');
  const ticker = page.getByRole('region', { name: 'Announcements', exact: true });
  await expect(ticker).toBeVisible();
  await page.getByRole('button', { name: 'Pause announcements' }).click();
  await expect(ticker).toHaveClass(/is-paused/);
  await expect(ticker.locator('.ticker-reader')).toBeVisible();
  await page.getByRole('button', { name: 'Resume announcements' }).click();
  await expect(ticker).not.toHaveClass(/is-paused/);
  await openEditor(page);
  await page
    .getByLabel('Announcement messages')
    .fill('A special show tonight.\nSend us your song requests.');
  await page.getByRole('button', { name: 'Save local draft' }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  await openEditor(page);
  await expect(page.getByLabel('Announcement messages')).toHaveValue(
    'A special show tonight.\nSend us your song requests.',
  );
  await expect(page.getByRole('status')).toContainText('Local draft restored');
  await page.getByRole('button', { name: 'Publish announcements' }).click();
  await expect(page.getByRole('status')).toContainText('Published to Home');
  await page.goto(`http://127.0.0.1:${workspacePorts.app}/`);
  await expect(ticker.locator('.ticker-reader')).toContainText('A special show tonight.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(ticker.locator('.ticker-track')).toBeHidden();
  await expect(ticker.locator('.ticker-reader')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await openEditor(page);
  await page.getByLabel('Show announcement ticker').uncheck();
  await page.getByRole('button', { name: 'Publish announcements' }).click();
  await expect(page.getByRole('status')).toContainText('Published to Home');
  await page.goto(`http://127.0.0.1:${workspacePorts.app}/`);
  await expect(ticker).toHaveCount(0);
});
test('failed ticker publishing preserves edits and shows an error', async ({ page }) => {
  await mockSouthCityServer(page);
  await openEditor(page);
  await page.getByLabel('Announcement messages').fill('Keep this draft.');
  await page.route('**/api/announcements', (route) =>
    route.fulfill({ status: 503, json: { error: 'Storage unavailable' } }),
  );
  await page.getByRole('button', { name: 'Publish announcements' }).click();
  await expect(page.getByRole('alert')).toContainText('Storage unavailable');
  await expect(page.getByRole('status')).toContainText('Not published');
  await expect(page.getByLabel('Announcement messages')).toHaveValue('Keep this draft.');
});
