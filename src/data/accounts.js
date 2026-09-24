// Account rules shared by the app, the admin workspace, and the SouthCity server. Roles are
// stored in Supabase (supabase/migrations) and are only ever changed there, never by a client.
export const accountEndpoints = { config: '/api/auth-config' };
export const roleLabels = {
  listener: 'Listener',
  dj: 'DJ',
  station_manager: 'Station manager',
  admin: 'Administrator',
};
// Staff can open the admin workspace; only managers and admins can publish station changes.
export const isStaff = (role) => ['dj', 'station_manager', 'admin'].includes(role);
export const canPublish = (role) => ['station_manager', 'admin'].includes(role);

export function validateDisplayName(input) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (!value || value.length > 30) return { error: 'Enter a name (30 characters max).' };
  return { value };
}
export function validateEmail(input) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { error: 'Enter a valid email address.' };
  return { value };
}
// The config endpoint hands this key to every browser, so a secret or service-role key must
// never pass: new-style secret keys have a prefix, legacy keys carry their role in the JWT.
export function isSecretKey(key) {
  if (key.startsWith('sb_secret_')) return true;
  const [, payload] = key.split('.');
  if (!payload) return false;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).role !== 'anon';
  } catch {
    return true;
  }
}
// Accepts only a well-formed public project URL and key; anything else leaves accounts off.
export function parseAccountConfig(input) {
  const url = typeof input?.url === 'string' ? input.url.trim().replace(/\/+$/, '') : '';
  const key = typeof input?.key === 'string' ? input.key.trim() : '';
  if (!url || !key || isSecretKey(key)) return null;
  try {
    const parsed = new URL(url);
    const local = ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) return null;
    if (parsed.username || parsed.password || parsed.pathname !== '/') return null;
  } catch {
    return null;
  }
  return { url, key };
}

const followKinds = { station: 'stations', show: 'shows' };
const ids = (list) => [...new Set((Array.isArray(list) ? list : []).filter(isItemId))];
export const isItemId = (id) => typeof id === 'string' && /^[a-z0-9-]{1,40}$/.test(id);
export function libraryFromRows(rows) {
  const library = { stations: [], shows: [] };
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = followKinds[row?.kind];
    if (key && isItemId(row.item_id) && !library[key].includes(row.item_id))
      library[key].push(row.item_id);
  }
  return library;
}
// Signing in keeps what the listener collected on this device: the account gains anything it
// is missing, and nothing is removed from either side.
export function mergeLibrary(local, remote) {
  const merged = {},
    missing = [];
  for (const [kind, key] of Object.entries(followKinds)) {
    const remoteIds = ids(remote?.[key]);
    const localOnly = ids(local?.[key]).filter((id) => !remoteIds.includes(id));
    merged[key] = [...remoteIds, ...localOnly];
    missing.push(...localOnly.map((item_id) => ({ kind, item_id })));
  }
  return { library: merged, missing };
}
// Where a sign-in link returns. The production build hosts admin at /#admin, but the auth
// redirect appends a query string, so the workspace travels as ?workspace=admin instead.
export function authRedirectUrl({ origin, pathname }, workspace) {
  const url = new URL(pathname || '/', origin);
  if (workspace === 'admin') url.searchParams.set('workspace', 'admin');
  return url.href;
}
