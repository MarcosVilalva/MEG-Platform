import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.megfinancas.app',
  appName: 'MEG Finanças',
  webDir: 'apps/web/dist',
  android: {
    backgroundColor: '#082f29'
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
