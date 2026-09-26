import { defineConfig, loadEnv } from 'vite';
import { workspacePorts } from './src/data/workspaces.js';
import { liveStationServer } from './server/liveStation.js';
import { accountsServer, createAccounts } from './server/accounts.js';

export default defineConfig(({ mode }) => {
  // SUPABASE_* values stay server-side: Vite only bundles VITE_-prefixed variables, and the app
  // reads the public project URL and key from /api/auth-config at runtime.
  const accounts = createAccounts(loadEnv(mode, process.cwd(), 'SUPABASE_'));
  // The Android app calls the hosted SouthCity server, so its build needs that address.
  if (mode === 'android') {
    const server = loadEnv(mode, process.cwd(), 'VITE_').VITE_SOUTHCITY_SERVER;
    if (!/^https:\/\/[^/]+/.test(server || ''))
      throw new Error('Set VITE_SOUTHCITY_SERVER in .env to the hosted server (https://...).');
  }
  return {
    // Serves account config, publishes SouthCity Live settings, and proxies its metadata.
    plugins: [accountsServer(accounts), liveStationServer({ accounts })],
    server: {
      host: '0.0.0.0',
      port: mode === 'admin' ? workspacePorts.admin : workspacePorts.app,
      strictPort: true,
    },
    preview: { host: '0.0.0.0', port: 4180, strictPort: true },
  };
});
