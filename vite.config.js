import { defineConfig } from 'vite';
import { workspacePorts } from './src/data/workspaces.js';
import { liveStationServer } from './server/liveStation.js';

export default defineConfig(({ mode }) => ({
  // Publishes SouthCity Live settings and proxies its metadata (see server/liveStation.js).
  plugins: [liveStationServer()],
  server: {
    host: '0.0.0.0',
    port: mode === 'admin' ? workspacePorts.admin : workspacePorts.app,
    strictPort: true,
  },
  preview: { host: '0.0.0.0', port: 4180, strictPort: true },
}));
