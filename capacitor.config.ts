import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.megfinancas.app',
  appName: 'MEG Finanças',
  webDir: 'apps/web/dist',
  android: {
    backgroundColor: '#082f29'
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#082f29',
      style: 'LIGHT'
    }
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
