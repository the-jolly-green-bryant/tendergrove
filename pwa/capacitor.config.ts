import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tendergrove.app',
  appName: 'Tendergrove',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    appendUrlToDeepLink: false,
  },
};

export default config;
