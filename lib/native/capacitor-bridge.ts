import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();

export async function initNativePlugins() {
  if (!isNative()) return;

  try {
    const { StatusBar } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: "dark" as any });
  } catch {}

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {}
}

export async function nativeShare(title: string, text: string, url: string) {
  if (!isNative()) {
    if (navigator.share) {
      return navigator.share({ title, text, url });
    }
    return;
  }
  const { Share } = await import("@capacitor/share");
  await Share.share({ title, text, url, dialogTitle: "Partager via" });
}

export async function nativeHaptic(type: "light" | "medium" | "heavy" = "light") {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const styles = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: styles[type] });
  } catch {}
}

export async function registerPushNotifications() {
  if (!isNative()) return null;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive === "granted") {
      await PushNotifications.register();
      return new Promise<string>((resolve) => {
        PushNotifications.addListener("registration", (token) => {
          resolve(token.value);
        });
      });
    }
  } catch {}
  return null;
}
