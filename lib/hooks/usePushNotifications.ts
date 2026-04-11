"use client";
import { useState, useEffect } from 'react';
import { getVapidPublicKey, isFirebaseConfigured } from '@/lib/firebase/config';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [usingFCM, setUsingFCM] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
    setUsingFCM(isFirebaseConfigured());
  }, []);

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      // Use FCM VAPID key if Firebase is configured, otherwise fall back
      // to the self-generated VAPID key. Both produce a standard
      // PushSubscription that the web-push library can send to.
      const vapidKey = getVapidPublicKey();
      if (!vapidKey) {
        console.error('No VAPID key configured');
        return false;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send the subscription to our server.
      // The endpoint will be an FCM URL when using Firebase VAPID key,
      // or a browser vendor URL when using self-generated VAPID.
      // Either way, the web-push library handles both transparently.
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push subscription error:', err);
      return false;
    }
  }

  return { permission, subscribed, subscribe, usingFCM };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
