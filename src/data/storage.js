// Persistence is optional: private browsing or quota errors must not stop playback.
export function readLocal(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (value === null || typeof value !== typeof fallback) return fallback;
    if (Array.isArray(fallback) !== Array.isArray(value)) return fallback;
    if (
      Array.isArray(value) &&
      fallback.every((item) => typeof item === 'string') &&
      fallback.length > 0
    ) {
      return value.filter((item) => typeof item === 'string');
    }
    return value;
  } catch {
    return fallback;
  }
}
export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    window.dispatchEvent(new Event('southcity:storage-unavailable'));
    return false;
  }
}
export function removeLocal(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    window.dispatchEvent(new Event('southcity:storage-unavailable'));
    return false;
  }
}
