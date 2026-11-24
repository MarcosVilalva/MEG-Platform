import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.megfinancas.app',
  appName: 'MEG',
  webDir: 'apps/web/dist',
  android: {
    backgroundColor: '#082f29'
  },
  plugins: {
    CapacitorHttp: {
      // Only the disposable stage10Qa build bypasses the native PATCH transport.
      // Stable Android keeps CapacitorHttp enabled by default.
      enabled: process.env.MEG_STAGE10_QA_DISABLE_NATIVE_HTTP !== '1'
    },
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
