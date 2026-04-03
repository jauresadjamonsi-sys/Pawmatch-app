"use client";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";

export default function PushButton() {
  const { permission, subscribed, subscribe } = usePushNotifications();
  if (subscribed || permission === 'granted') {
    return <span className="px-4 py-2 bg-green-500/10 text-green-400 text-sm font-medium rounded-xl border border-green-500/20">🔔 Notifications activées</span>;
  }
  return (
    <button onClick={subscribe} className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-medium rounded-xl transition border border-green-500/20">
      🔔 Activer notifications
    </button>
  );
}
