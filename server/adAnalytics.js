import path from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export function adAnalyticsMiddleware({
  accounts,
  file = path.resolve('.local/ad-analytics.json'),
} = {}) {
  const config = accounts?.configured ? accounts.publicConfig : null;
  const send = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  const read = async () => {
    if (config) {
      const r = await fetch(`${config.url}/rest/v1/ad_clicks?select=ad_index,action,created_at`, {
        headers: { apikey: config.key },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error('Advertisement analytics could not be loaded.');
      return r.json();
    }
    try {
      return JSON.parse(await readFile(file, 'utf8'));
    } catch (e) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
  };
  return async (req, res, next) => {
    if (new URL(req.url, 'http://localhost').pathname !== '/api/advertisement-analytics')
      return next();
    try {
      if (req.method === 'GET') {
        const auth = accounts?.configured ? await accounts.authorizePublish(req) : { error: null };
        if (auth.error) return send(res, auth.status, { error: auth.error });
        return send(res, 200, { events: await read() });
      }
      if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
      let body = '';
      for await (const chunk of req) body += chunk;
      const input = JSON.parse(body);
      if (
        !Number.isInteger(input.adIndex) ||
        !['open', 'website', 'whatsapp'].includes(input.action)
      )
        return send(res, 422, { error: 'Invalid advertisement event.' });
      const event = {
        ad_index: input.adIndex,
        action: input.action,
        created_at: new Date().toISOString(),
      };
      if (config) {
        const r = await fetch(`${config.url}/rest/v1/ad_clicks`, {
          method: 'POST',
          headers: {
            apikey: config.key,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) throw new Error('Advertisement analytics could not be saved.');
      } else {
        const events = await read();
        events.push(event);
        await mkdir(path.dirname(file), { recursive: true });
        const tmp = `${file}.${randomUUID()}.tmp`;
        await writeFile(tmp, JSON.stringify(events.slice(-10000)));
        await rename(tmp, file);
      }
      return send(res, 204, {});
    } catch {
      return send(res, 503, { error: 'Advertisement analytics unavailable.' });
    }
  };
}
