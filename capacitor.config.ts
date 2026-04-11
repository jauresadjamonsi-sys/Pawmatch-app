import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ch.pawlyapp",
  appName: "Pawly",
  webDir: "out",
  server: {
    url: "https://pawlyapp.ch",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0B0F0C",
      showSpinner: false,
      androidSplashResourceName: "splash",
      iosSplashResourceName: "Default",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#0B0F0C",
    },
  },
  ios: {
    scheme: "Pawly",
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0B0F0C",
  },
};

export default config;
