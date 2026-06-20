import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "./api";

// Show notifications while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Ask permission, get the Expo push token, register it with the backend.
// No-op on simulators (push needs a physical device).
export async function registerForPush() {
  if (!Device.isDevice) return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default", importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (token) await api.registerPush(token);
  } catch (e) {
    // Push is best-effort; never block the app on it.
    console.log("push registration skipped:", e.message);
  }
}
