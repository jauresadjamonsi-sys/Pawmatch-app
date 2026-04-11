import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ch.pawlyapp",
  appName: "PawBand",
  webDir: "out",
  server: {
    url: "https://pawband.ch",
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
    scheme: "PawBand",
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0B0F0C",
  },
};

export default config;
