// System media controls. Browsers show them from navigator.mediaSession. Android's WebView
// shows nothing, so the Android app uses a native plugin that runs a foreground media service
// with a notification and lock-screen controls. The service runs while the playback state is
// 'playing' or 'paused' and stops at 'none'.
const native =
  import.meta.env.MODE === 'android'
    ? import('@capgo/capacitor-media-session').then((m) => m.MediaSession)
    : null;
const browser = () =>
  typeof navigator !== 'undefined' && 'mediaSession' in navigator ? navigator.mediaSession : null;
// Native calls are fire-and-forget; a failed notification update must never affect playback.
const call = (fn) => native?.then(fn).catch(() => {});

export function setMediaMetadata(metadata) {
  if (native) return call((plugin) => plugin.setMetadata(metadata));
  if (browser() && 'MediaMetadata' in window) browser().metadata = new MediaMetadata(metadata);
}
export function setMediaPlaybackState(playbackState) {
  if (native) return call((plugin) => plugin.setPlaybackState({ playbackState }));
  if (browser()) browser().playbackState = playbackState;
}
export function setMediaActionHandler(action, handler) {
  if (native) return call((plugin) => plugin.setActionHandler({ action }, handler));
  try {
    browser()?.setActionHandler(action, handler);
  } catch {
    // Browsers without this action ignore it.
  }
}
