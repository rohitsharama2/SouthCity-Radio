import { useSyncExternalStore } from 'react';
import {
  liveEndpoints,
  livePollMs,
  parseStats,
  parseHistory,
  validateLiveStation,
} from '../data/liveStream.js';

// One shared poller for the live station. Every consumer reads the same snapshot, polling
// runs only while something is subscribed, and last-known metadata survives failed polls.
// `config` holds settings published from the admin workspace; null means use the defaults.
let snapshot = { phase: 'idle', config: null, data: null, history: [], updatedAt: null };
const listeners = new Set();
let timer = null,
  inflight = null;
const emit = (next) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((fn) => fn());
};
async function getJson(url, signal) {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
// A static host without the SouthCity server has no config endpoint; keep the defaults.
async function getConfig(signal) {
  try {
    const body = await getJson(liveEndpoints.config, signal);
    const { value } = validateLiveStation(body);
    return value ? { ...value, updatedAt: body.updatedAt ?? null } : snapshot.config;
  } catch {
    return snapshot.config;
  }
}
async function poll() {
  if (typeof document !== 'undefined' && document.hidden) return;
  inflight?.abort();
  const controller = new AbortController();
  inflight = controller;
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const config = await getConfig(controller.signal);
    if (controller === inflight && JSON.stringify(config) !== JSON.stringify(snapshot.config))
      emit({ config });
    const [stats, played] = await Promise.all([
      getJson(liveEndpoints.stats, controller.signal),
      getJson(liveEndpoints.history, controller.signal).catch(() => null),
    ]);
    emit({
      phase: 'ready',
      data: parseStats(stats),
      history: played ? parseHistory(played) : snapshot.history,
      updatedAt: Date.now(),
    });
  } catch (error) {
    if (controller === inflight) emit({ phase: 'error' });
  } finally {
    clearTimeout(timeout);
    if (controller === inflight) inflight = null;
  }
}
const onVisible = () => {
  if (!document.hidden) poll();
};
function subscribe(fn) {
  listeners.add(fn);
  if (listeners.size === 1) {
    if (snapshot.phase === 'idle') emit({ phase: 'loading' });
    poll();
    timer = setInterval(poll, livePollMs);
    document.addEventListener('visibilitychange', onVisible);
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size) {
      clearInterval(timer);
      inflight?.abort();
      inflight = null;
      document.removeEventListener('visibilitychange', onVisible);
    }
  };
}
const noop = () => () => {};
const getSnapshot = () => snapshot;
export function useLiveStream(enabled = true) {
  return useSyncExternalStore(enabled ? subscribe : noop, getSnapshot);
}
export const refreshLiveStream = () => poll();
export async function publishLiveStation(values, { force = false } = {}) {
  let response, body;
  try {
    response = await fetch(liveEndpoints.config, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, force }),
    });
    body = await response.json();
  } catch {
    throw Object.assign(
      new Error(
        'Publishing needs the local SouthCity server (npm run dev:admin or npm run preview).',
      ),
      { unreachable: false },
    );
  }
  const { value } = validateLiveStation(body);
  if (!response.ok || !value)
    throw Object.assign(new Error(body?.error || `Publishing failed (HTTP ${response.status}).`), {
      unreachable: Boolean(body?.unreachable),
    });
  const config = { ...value, updatedAt: body.updatedAt ?? null };
  emit({ config });
  poll();
  return config;
}
