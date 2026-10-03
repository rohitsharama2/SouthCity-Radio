import path from 'node:path';
import { publishedContentMiddleware } from './publishedContent.js';
import {
  advertisementsPath,
  emptyAdvertisements,
  validateAdvertisements,
} from '../src/data/advertisements.js';
export function advertisementsMiddleware(options = {}) {
  return publishedContentMiddleware({
    endpoint: advertisementsPath,
    table: 'advertisements',
    field: 'cards',
    defaults: emptyAdvertisements,
    validate: validateAdvertisements,
    migration:
      'supabase/migrations/20260930000000_advertisements.sql and supabase/migrations/20261002010000_flexible_advertisements.sql',
    maxBodyBytes: 200000,
    file: path.resolve('.local/advertisements.json'),
    ...options,
  });
}
export function advertisementsServer({ accounts } = {}) {
  const handle = advertisementsMiddleware({ accounts });
  return {
    name: 'southcity-advertisements',
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}
