import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tendergrove.app',
  appName: 'Tendergrove',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
