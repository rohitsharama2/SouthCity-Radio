import { test, expect } from '@playwright/test';
import { workspacePorts } from '../src/data/workspaces.js';
import { mockSouthCityServer, navigate } from './helpers.js';

// A stand-in Supabase project: Auth and PostgREST answers for one user, plus a log of writes.
const project = {
  configured: true,
  url: 'https://sc-test.supabase.co',
  key: 'sb_publishable_test',
};
const user = { id: '9d6f2b54-1d1e-4a43-a1b0-5d8c1f7e0a11', email: 'rohit@example.com' };
const token = [
  'eyJhbGciOiJIUzI1NiJ9',
  Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated' })).toString('base64url'),
  'test',
].join('.');
async function mockSupabase(page, { role = 'listener', follows = [], signedIn = true } = {}) {
  const state = {
    role,
    name: 'Rohit Sharma',
    follows: [...follows],
    writes: [],
    otp: [],
    failWrites: false,
  };
  if (signedIn)
    await page.addInitScript(
      (session) => {
        if (!localStorage.getItem('sc-auth'))
          localStorage.setItem(
            'sc-auth',
            JSON.stringify({ ...session, expires_at: Math.floor(Date.now() / 1000) + 3600 }),
          );
      },
      {
        access_token: token,
        refresh_token: 'refresh-test',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          ...user,
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: {},
          user_metadata: {},
        },
      },
    );
  await page.route(`${project.url}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const asObject = (request.headers().accept || '').includes('vnd.pgrst.object');
    const rows = (list) => route.fulfill({ json: asObject ? list[0] : list });
    if (url.pathname === '/auth/v1/settings') return route.fulfill({ json: { external: {} } });
    if (url.pathname === '/auth/v1/user')
      return route.fulfill({ json: { ...user, aud: 'authenticated', role: 'authenticated' } });
    if (url.pathname === '/auth/v1/otp') {
      state.otp.push({
        body: request.postDataJSON(),
        redirect: url.searchParams.get('redirect_to'),
      });
      return route.fulfill({ json: {} });
    }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (url.pathname === '/rest/v1/profiles') {
      if (method === 'PATCH') {
        state.name = request.postDataJSON().display_name;
        state.writes.push({ method, table: 'profiles', body: request.postDataJSON() });
        return rows([{ display_name: request.postDataJSON().display_name }]);
      }
      return rows([{ display_name: state.name, role: state.role }]);
    }
    if (url.pathname === '/rest/v1/follows') {
      if (method === 'GET') return rows(state.follows);
      if (state.failWrites) return route.fulfill({ status: 500, json: { message: 'offline' } });
      state.writes.push({
        method,
        table: 'follows',
        body: method === 'POST' ? request.postDataJSON() : Object.fromEntries(url.searchParams),
      });
      return route.fulfill({ status: method === 'POST' ? 201 : 204 });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return state;
}
const openAdmin = (page) => page.goto(`http://127.0.0.1:${workspacePorts.admin}/`);

test('a signed-out listener can request a one-time sign-in link', async ({ page }) => {
  await mockSouthCityServer(page, { accounts: project });
  const supabase = await mockSupabase(page, { signedIn: false });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start listening', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email').fill('not-an-email');
  await dialog.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Enter a valid email address');
  await dialog.getByLabel('Email').fill('rohit@example.com');
  await dialog.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(dialog.getByText('Check your inbox')).toBeVisible();
  expect(supabase.otp).toHaveLength(1);
  expect(supabase.otp[0].body.email).toBe('rohit@example.com');
  expect(supabase.otp[0].redirect).toBe(`http://127.0.0.1:${workspacePorts.app}/`);
});

test('signing in merges the library and keeps follows in the account', async ({ page }) => {
  await mockSouthCityServer(page, { accounts: project });
  const supabase = await mockSupabase(page, { follows: [{ kind: 'station', item_id: 'indie' }] });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Good afternoon, Rohit.' })).toBeVisible();
  await navigate(page, 'Library');
  // The account's Indie Avenue joins this browser's default favorites, which the account gains.
  await expect(page.locator('.station-card')).toHaveCount(3);
  await expect(page.locator('.station-card').filter({ hasText: 'Indie Avenue' })).toBeVisible();
  const added = supabase.writes.find((w) => w.method === 'POST')?.body ?? [];
  expect(added.map((row) => row.item_id).sort()).toEqual(['jazz', 'southcity']);
  expect(added.every((row) => row.user_id === user.id && row.kind === 'station')).toBe(true);

  await page.getByRole('button', { name: 'Unfollow Indie Avenue', exact: true }).click();
  await expect(page.locator('.station-card')).toHaveCount(2);
  await expect.poll(() => supabase.writes.filter((w) => w.method === 'DELETE').length).toBe(1);
  expect(supabase.writes.find((w) => w.method === 'DELETE').body.item_id).toBe('eq.indie');

  // A change the account doesn't save is undone rather than reported as saved.
  supabase.failWrites = true;
  await page.getByRole('button', { name: 'Unfollow Jazz After Hours', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('offline');
  await expect(page.locator('.station-card')).toHaveCount(2);
  supabase.failWrites = false;

  await navigate(page, 'Profile');
  await expect(page.getByText('Signed in as rohit@example.com')).toBeVisible();
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page.getByLabel('Display name').fill('Ro');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.locator('.toast')).toContainText('Profile updated in your account');
  expect(supabase.writes.find((w) => w.table === 'profiles').body).toEqual({ display_name: 'Ro' });

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByText('Keep your library everywhere')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sc-auth'))).toBeNull();
  await navigate(page, 'Library');
  await expect(page.getByText('Find your familiar frequencies')).toBeVisible();
});

test('the admin workspace asks staff to sign in and turns listeners away', async ({ page }) => {
  await mockSouthCityServer(page, { accounts: project });
  await mockSupabase(page, { signedIn: false });
  await openAdmin(page);
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Admin navigation' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await mockSouthCityServer(page, { accounts: project });
  await mockSupabase(page, { role: 'listener' });
  await openAdmin(page);
  await expect(
    page.getByRole('heading', { name: 'This account isn’t on the staff list' }),
  ).toBeVisible();
  await expect(page.getByText('rohit@example.com')).toBeVisible();
});

test('DJs can view the workspace but only managers and admins publish', async ({ page }) => {
  await mockSouthCityServer(page, { accounts: project });
  const supabase = await mockSupabase(page, { role: 'dj' });
  await openAdmin(page);
  await expect(page.getByRole('heading', { name: 'Good afternoon, Rohit.' })).toBeVisible();
  const openLiveConfig = async () => {
    if (page.viewportSize().width < 761)
      await page.getByRole('button', { name: 'Toggle admin navigation' }).click();
    await page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('button', { name: 'Stations', exact: true })
      .click();
    await page.getByRole('button', { name: 'Manage SouthCity Live' }).click();
    await page.getByRole('button', { name: 'Configuration', exact: true }).click();
  };
  await openLiveConfig();
  await expect(page.getByRole('note')).toContainText('View only');
  await expect(page.getByRole('button', { name: 'Publish to app' })).toBeDisabled();

  supabase.role = 'station_manager';
  await page.reload();
  await openLiveConfig();
  const { publishes } = await mockSouthCityServer(page, { accounts: project });
  await page.getByLabel('Station name').fill('SouthCity Live Staff');
  await page.getByRole('button', { name: 'Publish to app' }).click();
  await expect(page.locator('.form-success')).toContainText('Published');
  expect(publishes).toEqual([{ authorization: `Bearer ${token}` }]);
});

async function trackPlayback(page) {
  await page.addInitScript(() => {
    window.playCalls = 0;
    window.mediaActions = {};
    navigator.mediaSession.setActionHandler = (action, handler) => {
      window.mediaActions[action] = handler;
    };
    HTMLMediaElement.prototype.play = function () {
      window.playCalls += 1;
      Object.defineProperty(this, 'paused', { configurable: true, value: false });
      this.dispatchEvent(new Event('playing'));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      Object.defineProperty(this, 'paused', { configurable: true, value: true });
      this.dispatchEvent(new Event('pause'));
    };
  });
}

test('guest playback is blocked from Home and both players', async ({ page }) => {
  await mockSouthCityServer(page, { accounts: project });
  await mockSupabase(page, { signedIn: false });
  await trackPlayback(page);
  await page.goto('/');
  for (const label of ['Start listening', 'Play audio']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Sign in to listen');
    await page.getByRole('dialog').getByLabel('Email').waitFor();
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: 'Open full player', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Play audio', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Sign in to listen');
  expect(await page.evaluate(() => window.playCalls)).toBe(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sc-history') || '[]'))).toEqual(
    [],
  );
});

test('signed-in playback stops on sign-out and system controls cannot restart it', async ({
  page,
}) => {
  await mockSouthCityServer(page, { accounts: project });
  await mockSupabase(page);
  await trackPlayback(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Good afternoon, Rohit.' })).toBeVisible();
  await page.getByRole('button', { name: 'Start listening', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause audio', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Your profile', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play audio', exact: true })).toBeVisible();
  await page.evaluate(() => window.mediaActions.play?.());
  expect(await page.evaluate(() => window.playCalls)).toBe(1);
  await page.getByRole('button', { name: 'Play audio', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Sign in to listen');
});

for (const signedIn of [false, true]) {
  test(`profile saves the exact display name (${signedIn ? 'account' : 'sign-in required'})`, async ({
    page,
  }) => {
    await mockSouthCityServer(page, { accounts: project });
    const api = await mockSupabase(page, { signedIn });
    await page.goto('/');
    await page.getByRole('button', { name: 'Your profile', exact: true }).click();
    await expect(
      page.getByText(signedIn ? 'Signed in as rohit@example.com' : 'Keep your library everywhere'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Edit profile' }).click();
    if (!signedIn) {
      await expect(page.getByRole('dialog')).toContainText(
        'Sign in to listen and save your profile',
      );
      expect(api.writes.filter((write) => write.table === 'profiles')).toHaveLength(0);
      return;
    }
    await page.getByLabel('Display name').fill('udayan');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.locator('.profile-hero h2')).toHaveText('udayan');
    expect(api.writes.find((write) => write.table === 'profiles').body).toEqual({
      display_name: 'udayan',
    });
    await page.reload();
    await page.getByRole('button', { name: 'Your profile', exact: true }).click();
    await expect(page.locator('.profile-hero h2')).toHaveText('udayan');
  });
}

test('unavailable accounts cannot bypass the listening requirement', async ({ page }) => {
  await mockSouthCityServer(page);
  await trackPlayback(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start listening', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('accounts are currently unavailable');
  expect(await page.evaluate(() => window.playCalls)).toBe(0);
});

test('profile API failures keep the form and allow retry without claiming a save', async ({
  page,
}) => {
  await mockSouthCityServer(page, { accounts: project });
  await mockSupabase(page);
  let fail = true;
  await page.route(`${project.url}/rest/v1/profiles*`, (route) => {
    if (route.request().method() === 'PATCH' && fail)
      return route.fulfill({ status: 503, json: { message: 'Profile service unavailable' } });
    return route.fallback();
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Good afternoon, Rohit.' })).toBeVisible();
  await page.getByRole('button', { name: 'Your profile', exact: true }).click();
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page.getByLabel('Display name').fill('udayan');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.locator('.toast')).toContainText('Profile service unavailable');
  await expect(page.getByLabel('Display name')).toHaveValue('udayan');
  await expect(page.locator('.profile-hero h2')).toHaveText('Rohit Sharma');
  fail = false;
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.locator('.profile-hero h2')).toHaveText('udayan');
});
