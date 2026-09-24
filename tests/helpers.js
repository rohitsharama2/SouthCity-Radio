import {
  liveServer,
  liveMetadataPath,
  liveEndpoints,
  liveStationDefaults,
} from '../src/data/liveStream.js';
import { accountEndpoints } from '../src/data/accounts.js';
// Synthetic responses keep tests independent of the real station server.
const liveStats = {
  currentlisteners: 3,
  streamstatus: 1,
  streamuptime: 3720,
  bitrate: '48',
  content: 'audio/aacp',
  songtitle: 'Test Artist - Test Live Song',
};
const livePlayed = [
  { playedat: 1790234235, title: 'Test Artist - Test Live Song' },
  { playedat: 1790234004, title: 'Unknown - Earlier Live Song' },
];
export const navigate = async (page, label) => {
  await page
    .getByRole('navigation', {
      name: (await page.viewportSize().width) < 761 ? 'Mobile navigation' : 'Main navigation',
      exact: true,
    })
    .getByRole('button', { name: label, exact: true })
    .click();
};
// Stands in for the local SouthCity server so tests never read or write .local config or
// depend on a developer's .env. Returns the publish requests it received.
export const mockSouthCityServer = async (page, { accounts = { configured: false } } = {}) => {
  let config = { ...liveStationDefaults, updatedAt: null };
  const publishes = [];
  await page.route(`**${accountEndpoints.config}`, (route) => route.fulfill({ json: accounts }));
  await page.route(`**${liveEndpoints.config}`, async (route) => {
    if (route.request().method() === 'PUT') {
      publishes.push({ authorization: route.request().headers().authorization ?? null });
      const { force, ...values } = route.request().postDataJSON();
      config = { ...values, updatedAt: new Date().toISOString() };
    }
    return route.fulfill({ json: config });
  });
  await page.route(`${liveServer}/**`, (route) => route.abort('failed'));
  await page.route(`**${liveMetadataPath}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname.endsWith('/stats')) return route.fulfill({ json: liveStats });
    if (pathname.endsWith('/played')) return route.fulfill({ json: livePlayed });
    return route.abort('failed');
  });
  return { publishes };
};
