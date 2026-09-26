// The web app is served by the SouthCity server and calls it by path. The Android app runs from
// the device, so it calls the hosted server at the address given at build time
// (VITE_SOUTHCITY_SERVER), through native HTTP (CapacitorHttp), which is not subject to CORS.
export const androidApp = import.meta.env.MODE === 'android';
const origin = androidApp ? import.meta.env.VITE_SOUTHCITY_SERVER.replace(/\/+$/, '') : '';
export const serverUrl = (path) => `${origin}${path}`;
