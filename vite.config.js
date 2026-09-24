import { defineConfig } from 'vite';
import { workspacePorts } from './src/data/workspaces.js';

export default defineConfig(({ mode }) => ({
  server: {
    host: '0.0.0.0',
    port: mode === 'admin' ? workspacePorts.admin : workspacePorts.app,
    strictPort: true,
  },
  preview: { host: '0.0.0.0', port: 4180, strictPort: true },
}));
