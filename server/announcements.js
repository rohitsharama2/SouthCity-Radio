import path from 'node:path';
import { publishedContentMiddleware } from './publishedContent.js';
import {
  announcementsPath,
  defaultAnnouncements,
  validateAnnouncements,
} from '../src/data/announcements.js';
export function announcementsMiddleware(options = {}) {
  return publishedContentMiddleware({
    endpoint: announcementsPath,
    table: 'announcements',
    field: 'settings',
    defaults: defaultAnnouncements,
    validate: validateAnnouncements,
    migration: 'supabase/migrations/20260930010000_announcements.sql',
    file: path.resolve('.local/announcements.json'),
    ...options,
  });
}
export function announcementsServer({ accounts } = {}) {
  const handle = announcementsMiddleware({ accounts });
  return {
    name: 'southcity-announcements',
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}
