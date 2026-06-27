import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'sd.aljawarih.hospital',
  appName: 'Al Jawarih',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    allowNavigation: [
      'al-jawahir-hospital-production.up.railway.app'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1c1c22'
    }
  }
};

export default config;
