import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

// Shared storage and authorization for independently published Home content.
export function publishedContentMiddleware({
  accounts,
  fetch: request = fetch,
  file,
  endpoint,
  table,
  field,
  defaults,
  validate,
  migration,
} = {}) {
  const missingTable = `Content storage is not ready. Run ${migration}.`;
  const config = accounts?.configured ? accounts.publicConfig : null;
  async function store(method, cards, token) {
    if (config) {
      const response = await request(
        `${config.url}/rest/v1/${table}?${method === 'GET' ? `select=${field},updated_at&limit=1` : `on_conflict=id&select=${field},updated_at`}`,
        {
          method: method === 'GET' ? 'GET' : 'POST',
          headers: {
            apikey: config.key,
            ...(token && { Authorization: `Bearer ${token}` }),
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          ...(method !== 'GET' && { body: JSON.stringify({ [field]: cards }) }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok)
        throw new Error(
          response.status === 404
            ? missingTable
            : 'Content storage could not be reached. Try again.',
        );
      const [row] = await response.json();
      return { [field]: row?.[field] ?? defaults(), updatedAt: row?.updated_at ?? null };
    }
    if (method === 'GET') {
      try {
        return JSON.parse(await readFile(file, 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') return { [field]: defaults(), updatedAt: null };
        throw error;
      }
    }
    const value = { [field]: cards, updatedAt: new Date().toISOString() };
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(value));
    await rename(temporary, file);
    return value;
  }
  return async (req, res, next) => {
    if (new URL(req.url, 'http://localhost').pathname !== endpoint) return next();
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method === 'GET') {
        const saved = await store('GET');
        const { value } = validate(saved[field]);
        if (!value) return send(503, { error: 'Stored content is invalid.' });
        return send(200, { ...saved, [field]: value });
      }
      if (req.method !== 'PUT') return send(405, { error: 'Method not allowed.' });
      if (accounts?.configured) {
        const auth = await accounts.authorizePublish(req);
        if (auth.error) return send(auth.status, { error: auth.error });
      } else if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) {
        return send(403, { error: 'Publish from the admin workspace on this computer.' });
      }
      if (
        req.headers.origin &&
        new URL(req.headers.origin).hostname !== new URL(`http://${req.headers.host}`).hostname
      )
        return send(403, { error: 'Cross-site publishing is not allowed.' });
      if (!req.headers['content-type']?.startsWith('application/json'))
        return send(415, { error: 'Send JSON.' });
      let input;
      try {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 20000) return send(413, { error: 'Request too large.' });
        }
        input = JSON.parse(body);
      } catch {
        return send(400, { error: 'Invalid JSON.' });
      }
      const { value, error } = validate(input?.[field]);
      if (error) return send(422, { error });
      const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
      return send(200, await store('PUT', value, token));
    } catch (error) {
      return send(503, {
        error:
          error.message === missingTable
            ? missingTable
            : 'Content could not be loaded or saved. Try again.',
      });
    }
  };
}
