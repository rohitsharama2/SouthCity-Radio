import { accountEndpoints, canPublish, parseAccountConfig } from '../src/data/accounts.js';

// Supabase accounts for the SouthCity server. The project URL and publishable (anon) key are
// public by design; the app reads them from this server at runtime instead of baking them into
// the bundle. No service-role key is needed: requests are checked with the caller's own session,
// and row-level security decides what that session can read.
export function createAccounts(env = {}, { fetch: request = fetch } = {}) {
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  const config = parseAccountConfig({ url: env.SUPABASE_URL, key });
  if (!config && (env.SUPABASE_URL || key))
    console.warn(
      'SouthCity accounts are off: set SUPABASE_URL (https) and the publishable or anon key. ' +
        'Secret and service-role keys are refused because this key is sent to browsers.',
    );
  const headers = (token) => ({ apikey: config.key, Authorization: `Bearer ${token}` });
  // Resolves the bearer token to a user and their stored role, or explains why it can't.
  async function identify(req) {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
    if (!match) return { status: 401, error: 'Sign in with a staff account to publish.' };
    try {
      const userResponse = await request(`${config.url}/auth/v1/user`, {
        headers: headers(match[1]),
        signal: AbortSignal.timeout(8000),
      });
      if (userResponse.status === 401 || userResponse.status === 403)
        return { status: 401, error: 'Your session has expired. Sign in again.' };
      if (!userResponse.ok) throw new Error(`Auth answered ${userResponse.status}`);
      const user = await userResponse.json();
      const profileResponse = await request(
        `${config.url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`,
        { headers: headers(match[1]), signal: AbortSignal.timeout(8000) },
      );
      if (!profileResponse.ok) throw new Error(`Profiles answered ${profileResponse.status}`);
      const [profile] = await profileResponse.json();
      return { user: { id: user.id, email: user.email ?? null }, role: profile?.role ?? null };
    } catch {
      return { status: 503, error: 'The account service could not be reached. Try again.' };
    }
  }
  return {
    configured: Boolean(config),
    publicConfig: config ? { configured: true, ...config } : { configured: false },
    async authorizePublish(req) {
      const result = await identify(req);
      if (result.error) return result;
      if (!canPublish(result.role))
        return {
          status: 403,
          error: 'Only station managers and administrators can publish station changes.',
        };
      return result;
    },
  };
}
export function accountsMiddleware(accounts) {
  return (req, res, next) => {
    if (new URL(req.url, 'http://localhost').pathname !== accountEndpoints.config) return next();
    res.statusCode = req.method === 'GET' ? 200 : 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        req.method === 'GET' ? accounts.publicConfig : { error: 'Method not allowed' },
      ),
    );
  };
}
export function accountsServer(accounts) {
  const handle = accountsMiddleware(accounts);
  return {
    name: 'southcity-accounts',
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}
