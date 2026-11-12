import path from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const ids = new Set(['southcity', 'jazz', 'indie', 'community', 'classical', 'folk']);

export function stationsMiddleware({ accounts, file = path.resolve('.local/stations.json') } = {}) {
  const config = accounts?.configured ? accounts.publicConfig : null;
  const send = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  const read = async () => {
    if (config) {
      const response = await fetch(`${config.url}/rest/v1/station_catalog?select=id,deleted_at`, {
        headers: { apikey: config.key },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('Station catalog could not be reached.');
      return response.json();
    }
    try {
      return JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  };
  const remove = async (id, token) => {
    if (config) {
      const response = await fetch(
        `${config.url}/rest/v1/station_catalog?id=eq.${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: config.key,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({ deleted_at: new Date().toISOString() }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) throw new Error('Station deletion was rejected by the database.');
      return;
    }
    const current = await read();
    const next = [...new Set([...current.map((row) => row.id), id])].map((value) => ({
      id: value,
      deleted_at:
        value === id
          ? new Date().toISOString()
          : current.find((row) => row.id === value)?.deleted_at || null,
    }));
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(next));
    await rename(temporary, file);
  };
  return async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/stations/catalog') return next();
    try {
      if (req.method === 'GET')
        return send(res, 200, {
          deleted: (await read()).filter((row) => row.deleted_at).map((row) => row.id),
        });
      if (req.method !== 'DELETE') return send(res, 405, { error: 'Method not allowed.' });
      const id = url.searchParams.get('id');
      if (!ids.has(id)) return send(res, 422, { error: 'Unknown station.' });
      if (config) {
        const auth = await accounts.authorizePublish(req);
        if (auth.error) return send(res, auth.status, { error: auth.error });
      } else if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress))
        return send(res, 403, { error: 'Delete from the admin workspace on this computer.' });
      await remove(id, /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1]);
      return send(res, 200, { deleted: id });
    } catch (error) {
      return send(res, 503, { error: error.message || 'Station catalog could not be updated.' });
    }
  };
}
