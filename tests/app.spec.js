import { test, expect } from '@playwright/test';
const navigate = async (page, label) => {
  await page
    .getByRole('navigation', {
      name: (await page.viewportSize().width) < 761 ? 'Mobile navigation' : 'Main navigation',
      exact: true,
    })
    .getByRole('button', { name: label, exact: true })
    .click();
};
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});
test('home is responsive and navigation leads to searchable discovery', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Good afternoon, Alex.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await navigate(page, 'Discover');
  await page.getByRole('textbox', { name: 'Search all content' }).fill('Miles Davis');
  await expect(page.locator('.station-card')).toHaveCount(1);
  await expect(page.locator('.station-card')).toContainText('Jazz After Hours');
  await page.getByRole('textbox', { name: 'Search all content' }).fill('not-a-station');
  await expect(page.getByText('No frequencies found')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('.station-card')).toHaveCount(6);
});
test('following a station persists across reloads', async ({ page }) => {
  await navigate(page, 'Discover');
  const station = page
    .locator('.station-card')
    .filter({ has: page.getByRole('button', { name: 'View Indie Avenue' }) });
  await station.getByRole('button', { name: 'Follow Indie Avenue', exact: true }).click();
  await page.reload();
  await navigate(page, 'Library');
  await expect(page.locator('.station-card').filter({ hasText: 'Indie Avenue' })).toBeVisible();
});
test('station and show details support following and schedule navigation', async ({ page }) => {
  await navigate(page, 'Discover');
  await page.getByRole('button', { name: 'View SouthCity Originals', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'SouthCity Originals', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'With Ananya Rao', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'The Golden Hour', exact: true }).last(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Follow show', exact: true }).click();
  await navigate(page, 'Library');
  await page.getByRole('button', { name: 'Shows', exact: true }).click();
  await expect(page.getByRole('button', { name: 'The Golden Hour With Ananya Rao' })).toBeVisible();
});
test('player handles failures without losing navigation and sleep timer is configurable', async ({
  page,
}) => {
  await page.route('https://ice1.somafm.com/**', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Start listening', exact: true }).click();
  await page.getByRole('button', { name: 'Open full player', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Retry', exact: true })).toBeVisible({
    timeout: 15000,
  });
  await dialog.getByRole('button', { name: 'Set sleep timer' }).click();
  await page.getByRole('button', { name: '30 minutes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sleep timer set for 30 minutes');
  await navigate(page, 'Discover');
  await expect(page.locator('.player-track')).toContainText('SouthCity Originals');
});
test('theme and profile persist, component gallery reuses the design system', async ({ page }) => {
  await navigate(page, 'Profile');
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page.getByLabel('First name').fill('Rohit');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { name: 'Good afternoon, Rohit.' })).toBeVisible();
  await navigate(page, 'Profile');
  await page.getByRole('button', { name: 'Design system & component gallery' }).click();
  await page.getByRole('button', { name: 'Forest', exact: true }).click();
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--brand').trim(),
    ),
  ).toBe('#42735a');
  await expect(page.getByRole('heading', { name: '05 / Audio & feedback states' })).toBeVisible();
});
test('admin configuration, playlists, schedule, and analytics are interactive', async ({
  page,
}) => {
  await navigate(page, 'Profile');
  await page.getByRole('button', { name: 'Creator & admin portal', exact: true }).last().click();
  const adminNav = async (name) => {
    if (page.viewportSize().width < 761)
      await page.getByRole('button', { name: 'Toggle admin navigation' }).click();
    await page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('button', { name, exact: true })
      .click();
  };
  await expect(page.getByRole('heading', { name: 'Good afternoon, Alex.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await adminNav('Stations');
  await page.getByRole('button', { name: 'Manage SouthCity Originals' }).click();
  await page.getByRole('button', { name: 'Configuration', exact: true }).click();
  await page.getByLabel('Station name').fill('SouthCity Test');
  await page.getByRole('button', { name: 'Save local configuration' }).click();
  await expect(
    page.getByRole('heading', { name: 'SouthCity Test', exact: true }).first(),
  ).toBeVisible();
  await adminNav('Playlists');
  await page.getByRole('button', { name: 'Create playlist', exact: true }).click();
  await page.getByLabel('Playlist name').fill('Test rotation');
  await page.getByLabel('Genre', { exact: true }).fill('Jazz');
  await page.getByRole('button', { name: 'Create local draft' }).click();
  await expect(page.getByRole('heading', { name: 'Test rotation' })).toBeVisible();
  await adminNav('Schedule');
  await page.getByRole('button', { name: 'Add broadcast' }).click();
  await page.getByLabel('Show name').fill('Test broadcast');
  await page.getByLabel('Host', { exact: true }).fill('Rohit');
  await page.getByRole('button', { name: 'Save local broadcast' }).click();
  await expect(page.getByRole('heading', { name: 'Test broadcast' })).toBeVisible();
  await adminNav('Analytics');
  await page.getByLabel('Report date range').selectOption('Today');
  await expect(
    page.getByRole('img', { name: 'Illustrative listener trend for today' }),
  ).toBeVisible();
});
test('capture home without horizontal overflow', async ({ page }, testInfo) => {
  await page.screenshot({ path: `test-results/home-${testInfo.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('playback survives navigation and sleep timer pauses audio', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      Object.defineProperty(this, 'paused', { configurable: true, value: false });
      this.dispatchEvent(new Event('playing'));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      Object.defineProperty(this, 'paused', { configurable: true, value: true });
      this.dispatchEvent(new Event('pause'));
    };
  });
  await page.reload();
  await page.clock.install();
  await page.getByRole('button', { name: 'Start listening', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause audio', exact: true })).toBeVisible();
  await navigate(page, 'Library');
  await expect(page.getByRole('button', { name: 'Pause audio', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open full player', exact: true }).click();
  await page.getByRole('button', { name: 'Set sleep timer' }).click();
  await page.getByRole('button', { name: '15 minutes', exact: true }).click();
  await page.clock.fastForward(15 * 60 * 1000);
  await expect(page.getByRole('button', { name: 'Play audio', exact: true })).toBeVisible();
});

test('admin and dark layouts render without document overflow', async ({ page }, testInfo) => {
  await navigate(page, 'Profile');
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
  await page.screenshot({
    path: `test-results/profile-dark-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel('Appearance', { exact: true }).selectOption('light');
  await page.getByRole('button', { name: 'Creator & admin portal', exact: true }).last().click();
  await page.screenshot({
    path: `test-results/admin-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('dialog traps keyboard focus and returns focus on Escape', async ({ page }) => {
  await navigate(page, 'Profile');
  const edit = page.getByRole('button', { name: 'Edit profile', exact: true });
  await edit.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Close dialog' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Save profile' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(edit).toBeFocused();
});
