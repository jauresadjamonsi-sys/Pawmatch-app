"use client";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";

export default function PushButton() {
  const { permission, subscribed, subscribe } = usePushNotifications();
  if (subscribed || permission === 'granted') {
    return <span className="px-4 py-2 bg-amber-400/10 text-amber-300 text-sm font-medium rounded-xl border border-amber-400/20">🔔 Notifications activées</span>;
  }
  return (
    <button onClick={subscribe} className="px-4 py-2 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 text-sm font-medium rounded-xl transition border border-amber-400/20">
      🔔 Activer notifications
    </button>
  );
}
