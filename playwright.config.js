import { defineConfig } from '@playwright/test';
import { workspacePorts } from './src/data/workspaces.js';
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${workspacePorts.app}`,
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev:app',
      url: `http://127.0.0.1:${workspacePorts.app}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev:admin',
      url: `http://127.0.0.1:${workspacePorts.admin}`,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
});
