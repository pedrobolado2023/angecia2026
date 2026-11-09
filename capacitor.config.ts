/**
 * VELLUTO STAYS — Configuração Capacitor.js (iOS .ipa & Android .aab) — Fase 5
 * Auditado pelo Agente 05 (Guardião de Segurança, Pagamentos e Mobile Stores)
 */

const capacitorConfig = {
  appId: "com.vellutostays.privateclub",
  appName: "Velluto Stays",
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
      clientId: "com.vellutostays.privateclub.auth",
      redirectURI: "https://vellutostays.com.br/api/auth/apple/callback",
      scopes: "email name",
    },
  },
};

export default capacitorConfig;

