import { useSyncExternalStore } from 'react';
import {
  accountEndpoints,
  authRedirectUrl,
  libraryFromRows,
  parseAccountConfig,
} from '../data/accounts.js';

// One shared Supabase session for the app and admin. Phases: loading → unavailable (this
// server has no accounts configured) | signed-out | signed-in. The Supabase client is only
// downloaded when accounts are configured. Supabase keeps the session in localStorage under
// `sc-auth`; the privacy reset leaves it alone and sign-out removes it.
let snapshot = {
  phase: 'idle',
  user: null,
  profile: null,
  profileError: null,
  linkError: null,
  google: false,
};
let client = null,
  started = null;
const listeners = new Set();
const emit = (next) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((fn) => fn());
};
const failure = (error, fallback) => {
  if (error?.status === 429 || /rate limit/i.test(error?.message || ''))
    return new Error('Too many sign-in emails were sent. Wait a few minutes and try again.');
  return new Error(error?.message || fallback);
};
async function loadProfile(user) {
  const { data, error } = await client
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .maybeSingle();
  if (snapshot.user?.id !== user.id) return;
  if (error || !data)
    return emit({
      profile: null,
      profileError: error
        ? 'Your account details couldn’t be loaded. Check your connection and try again.'
        : 'This account has no SouthCity profile yet. Ask an administrator to check the database setup.',
    });
  emit({ profile: { displayName: data.display_name, role: data.role }, profileError: null });
}
function applySession(session) {
  const user = session?.user;
  if (!user) return emit({ phase: 'signed-out', user: null, profile: null, profileError: null });
  if (snapshot.user?.id === user.id) return;
  emit({
    phase: 'signed-in',
    user: { id: user.id, email: user.email ?? '' },
    profile: null,
    profileError: null,
  });
  loadProfile(user);
}
// Once Supabase has read a returning sign-in link, remove its parameters from the address bar
// and keep any failure (usually an expired or already-used link) to show the listener.
const redirectParams = ['code', 'error', 'error_code', 'error_description'];
function consumeRedirect() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const description = url.searchParams.get('error_description') || hash.get('error_description');
  if (!redirectParams.some((key) => url.searchParams.has(key) || hash.has(key))) return;
  redirectParams.forEach((key) => url.searchParams.delete(key));
  if (redirectParams.some((key) => hash.has(key))) url.hash = '';
  history.replaceState(history.state, '', url.href);
  if (description)
    emit({
      linkError: /expired|invalid/i.test(description)
        ? 'That sign-in link has expired or was already used. Request a new one.'
        : description,
    });
}
async function start() {
  emit({ phase: 'loading' });
  let config = null;
  try {
    const response = await fetch(accountEndpoints.config, { cache: 'no-store' });
    if (response.ok) config = parseAccountConfig(await response.json());
  } catch {
    // A static host without the SouthCity server has no accounts.
  }
  if (!config) return emit({ phase: 'unavailable' });
  try {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(config.url, config.key, {
      auth: { flowType: 'pkce', storageKey: 'sc-auth', detectSessionInUrl: true },
    });
  } catch {
    return emit({ phase: 'unavailable' });
  }
  // Supabase advises against awaiting its own calls inside this callback.
  client.auth.onAuthStateChange((_event, session) => setTimeout(() => applySession(session)));
  await client.auth.getSession();
  consumeRedirect();
  fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.key } })
    .then((r) => (r.ok ? r.json() : null))
    .then((settings) => emit({ google: settings?.external?.google === true }))
    .catch(() => {});
}
function subscribe(fn) {
  listeners.add(fn);
  started ??= start();
  return () => listeners.delete(fn);
}
const getSnapshot = () => snapshot;
export function useAccount() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
const signedInUser = () => {
  if (!client || !snapshot.user) throw new Error('Sign in first.');
  return snapshot.user;
};
const workspaceUrl = (workspace) => authRedirectUrl(window.location, workspace);

export async function signInWithEmail(email, { workspace } = {}) {
  if (!client) throw new Error('Accounts aren’t available on this server.');
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: workspaceUrl(workspace) },
  });
  if (error) throw failure(error, 'The sign-in email couldn’t be sent.');
}
export async function signInWithGoogle({ workspace } = {}) {
  if (!client) throw new Error('Accounts aren’t available on this server.');
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: workspaceUrl(workspace) },
  });
  if (error) throw failure(error, 'Google sign-in couldn’t start.');
}
// Ends the session on this device only; other devices stay signed in.
export async function signOut() {
  if (!client) return;
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw failure(error, 'Signing out failed. Try again.');
}
export const retryProfile = () => snapshot.user && client && loadProfile(snapshot.user);
export async function accessToken() {
  const { data } = (await client?.auth.getSession()) ?? {};
  return data?.session?.access_token ?? null;
}
export async function updateDisplayName(displayName) {
  const user = signedInUser();
  const { data, error } = await client
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.id)
    .select('display_name')
    .single();
  if (error) throw failure(error, 'Your name couldn’t be saved to your account.');
  emit({ profile: { ...snapshot.profile, displayName: data.display_name } });
}
export async function loadLibrary() {
  signedInUser();
  const { data, error } = await client.from('follows').select('kind, item_id');
  if (error) throw failure(error, 'Your library couldn’t be loaded.');
  return libraryFromRows(data);
}
export async function addFollows(items) {
  const user = signedInUser();
  if (!items.length) return;
  const { error } = await client.from('follows').upsert(
    items.map((item) => ({ ...item, user_id: user.id })),
    { onConflict: 'user_id,kind,item_id', ignoreDuplicates: true },
  );
  if (error) throw failure(error, 'Your library couldn’t be saved to your account.');
}
export async function setFollow(kind, itemId, following) {
  const user = signedInUser();
  if (following) return addFollows([{ kind, item_id: itemId }]);
  const { error } = await client
    .from('follows')
    .delete()
    .match({ user_id: user.id, kind, item_id: itemId });
  if (error) throw failure(error, 'That change couldn’t be saved to your account.');
}
export async function clearFollows() {
  const user = signedInUser();
  const { error } = await client.from('follows').delete().eq('user_id', user.id);
  if (error) throw failure(error, 'Your account library couldn’t be cleared.');
}
