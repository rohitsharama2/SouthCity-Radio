import { test, expect } from '@playwright/test';

test('community website navigation, content and responsive layout', async ({ page }, testInfo) => {
  await page.goto('/website/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Be heard.');
  await expect(page.getByRole('link', { name: 'Explore the listener' })).toHaveAttribute(
    'href',
    '/',
  );
  for (const image of await page.locator('main img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0))
      .toBeTruthy();
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open navigation' }).click();
  }
  await page.getByRole('navigation').getByRole('link', { name: 'FAQs', exact: true }).click();
  await page.getByText('How do I send my recording?', { exact: true }).click();
  await expect(page.locator('details[open]')).toContainText('MP3');
  await expect(page.getByRole('link', { name: 'Send your recording' })).toHaveAttribute(
    'href',
    /^https:\/\/wa.me\/919103147596\?text=/,
  );
  await expect(page.getByRole('link', { name: 'Join the community' })).toHaveAttribute(
    'href',
    'https://chat.whatsapp.com/DDdbmDEa5aHDv3q0wiqOOk',
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.goto('/website/');
  await page.screenshot({
    path: `test-results/website-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
