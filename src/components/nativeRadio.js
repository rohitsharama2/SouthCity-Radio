import { registerPlugin } from '@capacitor/core';

export const NativeRadio =
  import.meta.env.MODE === 'android' ? registerPlugin('NativeRadio') : null;
