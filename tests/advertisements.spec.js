import { test, expect } from '@playwright/test';
import { mockSouthCityServer } from './helpers.js';
import { workspacePorts } from '../src/data/workspaces.js';

test('advertisement cards can be drafted, published, and disabled from admin', async ({ page }) => {
  await mockSouthCityServer(page);
  await page.goto('/');
  await expect(page.locator('.sponsor-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Advertisements', exact: true })).toHaveCount(0);
  await page.goto(`http://127.0.0.1:${workspacePorts.admin}/`);
  if (page.viewportSize().width < 761)
    await page.getByRole('button', { name: 'Toggle admin navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Admin navigation' })
    .getByRole('button', { name: 'Advertisements', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add advertisement', exact: true }).click();
  await page.getByLabel('Sponsor name', { exact: true }).fill('City Coffee');
  await page.getByLabel('Advertisement title').fill('Your next coffee break');
  await page.getByLabel('Description', { exact: true }).fill('Fresh coffee around the corner.');
  await page.route('https://example.com/ad-image.jpg', (route) => route.abort());
  await page.getByLabel('Image URL').fill('https://example.com/ad-image.jpg');
  await page.getByLabel('Destination URL').fill('https://example.com/coffee');
  await page.getByLabel('Show this advertisement on Home').check();
  await page.getByRole('button', { name: 'Save local draft' }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  await page.reload();
  if (page.viewportSize().width < 761)
    await page.getByRole('button', { name: 'Toggle admin navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Admin navigation' })
    .getByRole('button', { name: 'Advertisements', exact: true })
    .click();
  await expect(page.getByLabel('Advertisement title')).toHaveValue('Your next coffee break');
  await expect(page.getByRole('status')).toContainText('Local draft restored');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Publish advertisements' }).click();
  await expect(page.getByRole('status')).toContainText('Published to Home');
  await page.goto(`http://127.0.0.1:${workspacePorts.app}/`);
  await expect(page.locator('.sponsor-card').first()).toContainText('Your next coffee break');
  await page.locator('.sponsor-card').first().scrollIntoViewIfNeeded();
  await expect(
    page.locator('.sponsor-card').first().locator('.sponsor-art-placeholder'),
  ).toContainText('City Coffee');
  const opener = page.getByRole('button', { name: 'Open Your next coffee break', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Advertisement', exact: true });
  await expect(dialog.getByRole('heading', { name: 'Your next coffee break' })).toBeVisible();
  await expect(dialog).toContainText('Fresh coffee around the corner.');
  await expect(page.getByRole('link', { name: /Visit City Coffee/ })).toHaveAttribute(
    'href',
    'https://example.com/coffee',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.goto(`http://127.0.0.1:${workspacePorts.admin}/`);
  if (page.viewportSize().width < 761)
    await page.getByRole('button', { name: 'Toggle admin navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Admin navigation' })
    .getByRole('button', { name: 'Advertisements', exact: true })
    .click();
  await expect(page.getByLabel('Advertisement title')).toHaveValue('Your next coffee break');
  await page.getByLabel('Show this advertisement on Home').uncheck();
  await page.getByRole('button', { name: 'Publish advertisements' }).click();
  await expect(page.getByRole('status')).toContainText('Published to Home');
  await page.goto(`http://127.0.0.1:${workspacePorts.app}/`);
  await expect(page.locator('.sponsor-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Advertisements', exact: true })).toHaveCount(0);
});

test('a failed publication keeps the editable draft and reports the failure', async ({ page }) => {
  await mockSouthCityServer(page);
  await page.goto(`http://127.0.0.1:${workspacePorts.admin}/`);
  if (page.viewportSize().width < 761)
    await page.getByRole('button', { name: 'Toggle admin navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Admin navigation' })
    .getByRole('button', { name: 'Advertisements', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add advertisement', exact: true }).click();
  await page.getByLabel('Advertisement title').fill('Draft to keep');
  await page.route('**/api/advertisements', (route) =>
    route.fulfill({ status: 503, json: { error: 'Storage unavailable' } }),
  );
  await page.getByRole('button', { name: 'Publish advertisements' }).click();
  await expect(page.getByRole('alert')).toContainText('Storage unavailable');
  await expect(page.getByRole('status')).toContainText('Not published');
  await expect(page.getByLabel('Advertisement title')).toHaveValue('Draft to keep');
  await expect(page.getByRole('button', { name: 'Publish advertisements' })).toBeEnabled();
});

test('admin adds, reorders, hides and removes cards without changing Home before publishing', async ({
  page,
}) => {
  await mockSouthCityServer(page);
  const admin = async () => {
    await page.goto(`http://127.0.0.1:${workspacePorts.admin}/`);
    if (page.viewportSize().width < 761)
      await page.getByRole('button', { name: 'Toggle admin navigation' }).click();
    await page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('button', { name: 'Advertisements', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Add advertisement', exact: true }),
    ).toBeEnabled();
  };
  const publish = async () => {
    await page.getByRole('button', { name: 'Publish advertisements' }).click();
    await expect(page.getByRole('status')).toContainText('Published to Home');
  };
  await admin();
  for (const title of ['Home Chef', 'Property Listing', 'Hidden offer']) {
    await page.getByRole('button', { name: 'Add advertisement', exact: true }).click();
    await page.getByLabel('Sponsor name', { exact: true }).fill(title);
    await page.getByLabel('Advertisement title').fill(title);
    if (title !== 'Hidden offer') await page.getByLabel('Show this advertisement on Home').check();
  }
  await page.getByLabel('Card position').selectOption('1');
  await page.getByRole('button', { name: 'Move earlier' }).click();
  await page.getByRole('button', { name: 'Save local draft' }).click();
  await page.goto('/');
  await expect(page.locator('.sponsor-card')).toHaveCount(0);
  await admin();
  await expect(page.getByLabel('Advertisement title')).toHaveValue('Property Listing');
  await publish();
  await page.goto('/');
  await expect(page.locator('.sponsor-card h3')).toHaveText(['Property Listing', 'Home Chef']);
  await page.getByRole('button', { name: 'Open Property Listing', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Property Listing');
  await expect(page.getByRole('dialog').getByRole('link')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await admin();
  await page.getByRole('button', { name: 'Remove advertisement' }).click();
  await page.getByLabel('Show this advertisement on Home').uncheck();
  await publish();
  await page.goto('/');
  await expect(page.locator('.sponsor-card')).toHaveCount(0);
  await admin();
  await page.getByRole('button', { name: 'Remove advertisement' }).click();
  await page.getByRole('button', { name: 'Remove advertisement' }).click();
  await publish();
  await page.reload();
  if (page.viewportSize().width < 761)
    await page.getByRole('button', { name: 'Toggle admin navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Admin navigation' })
    .getByRole('button', { name: 'Advertisements', exact: true })
    .click();
  await expect(page.getByText('No advertisements. Add a card to get started.')).toBeVisible();
});
