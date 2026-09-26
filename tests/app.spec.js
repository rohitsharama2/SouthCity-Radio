import { test, expect } from '@playwright/test';
import { liveServer } from '../src/data/liveStream.js';
import { workspacePorts } from '../src/data/workspaces.js';
import { mockSouthCityServer, navigate } from './helpers.js';
// The admin has its own origin and no link from the listener app.
const adminUrl = `http://127.0.0.1:${workspacePorts.admin}/`;
test.beforeEach(async ({ page }) => {
  await mockSouthCityServer(page);
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
  await expect(page.locator('.station-card')).toHaveCount(7);
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
  await expect(page.locator('.player-track')).toContainText('SouthCity Live');
});
test('live station shows server metadata and switching keeps the queue order', async ({ page }) => {
  await navigate(page, 'Discover');
  await page.getByRole('textbox', { name: 'Search all content' }).fill('Test Live Song');
  await expect(page.locator('.station-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'View SouthCity Live', exact: true }).click();
  await expect(page.getByText('ON AIR NOW · FROM THE STATION SERVER')).toBeVisible();
  await expect(page.locator('.detail-listeners')).toContainText('3 tuned in');
  await expect(page.getByText('Earlier Live Song')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A day on this frequency' })).toHaveCount(0);
  await page.route('https://ice1.somafm.com/**', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Listen live', exact: true }).click();
  await expect(page.locator('.player-track')).toContainText('SouthCity Live');
  await expect(page.locator('.audio-quality')).toHaveText('LIVE · 48 KBPS · AAC+');
  // Station skipping is a desktop mini-player control.
  if (page.viewportSize().width < 761) return;
  await page.getByRole('button', { name: 'Next station', exact: true }).click();
  await expect(page.locator('.player-track')).toContainText('SouthCity Originals');
});
test('admin shows live stream telemetry and embed code', async ({ page }) => {
  await page.goto(adminUrl);
  const adminNav = async (name) => {
    if (page.viewportSize().width < 761)
      await page.getByRole('button', { name: 'Toggle admin navigation' }).click();
    await page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('button', { name })
      .click();
  };
  await adminNav(/^Live Streams/);
  await expect(page.locator('.monitor-summary')).toContainText('SouthCity Live: On air');
  const card = page.locator('.monitor-card').filter({ hasText: 'SouthCity Live' });
  await expect(card).toContainText('Test Artist — Test Live Song');
  await expect(card).toContainText('1h 2m');
  await card.getByRole('button', { name: 'Embed SouthCity Live' }).click();
  await expect(page.getByRole('heading', { name: 'Embed & share' })).toBeVisible();
  await expect(page.locator('.embed-row code').nth(1)).toHaveText(
    `<audio controls preload="none" src="${liveServer}/stream"></audio>`,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('theme and profile persist, component gallery reuses the design system', async ({ page }) => {
  await navigate(page, 'Profile');
  // Listeners never see a way into the admin workspace.
  await expect(page.getByRole('button', { name: /admin/i })).toHaveCount(0);
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
  await page.goto(adminUrl);
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
  await page.goto(adminUrl);
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
test('admin publishes live station changes to the consumer app', async ({ page }) => {
  const streamRequests = [];
  await page.route('http://127.0.0.1:9/**', (route) => {
    streamRequests.push(route.request().url());
    return route.abort('failed');
  });
  await page.goto(adminUrl);
  if (page.viewportSize().width < 761)
    await page.getByRole('button', { name: 'Toggle admin navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Admin navigation' })
    .getByRole('button', { name: 'Stations', exact: true })
    .click();
  await page.getByRole('button', { name: 'Manage SouthCity Live' }).click();
  await page.getByRole('button', { name: 'Configuration', exact: true }).click();
  await page.getByLabel('Public stream URL').fill('http://admin:secret@127.0.0.1:9/stream');
  await page.getByRole('button', { name: 'Publish to app' }).click();
  await expect(page.getByRole('alert')).toContainText('Remove the username and password');
  await page.getByLabel('Station name').fill('SouthCity Live Test');
  await page.getByLabel('Public stream URL').fill('http://127.0.0.1:9/stream');
  await page.getByRole('button', { name: 'Publish to app' }).click();
  await expect(page.locator('.form-success')).toContainText('Published');
  if (page.viewportSize().width < 761)
    await page.getByRole('button', { name: 'Toggle admin navigation' }).click();
  await page.getByRole('button', { name: 'Back to listening' }).click();
  await expect(page.locator('.player-track')).toContainText('SouthCity Live Test');
  await page.getByRole('button', { name: 'Start listening', exact: true }).click();
  await expect.poll(() => streamRequests.length).toBeGreaterThan(0);
  expect(streamRequests[0]).toBe('http://127.0.0.1:9/stream');
});
