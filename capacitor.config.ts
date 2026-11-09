/**
 * HÓSPEDE CLUB — Configuração Capacitor.js (iOS .ipa & Android .aab) — Fase 5
 * Auditado pelo Agente 05 (Guardião de Segurança, Pagamentos e Mobile Stores)
 */

const capacitorConfig = {
  appId: "com.hospedeclub.app",
  appName: "Hóspede Club",
  webDir: "out",
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: "#0D0E11",
      showSpinner: false,
    },
    SignInWithApple: {
      clientId: "com.hospedeclub.app.auth",
      redirectURI: "https://hospedeclub.com.br/api/auth/apple/callback",
      scopes: "email name",
    },
  },
};

export default capacitorConfig;

