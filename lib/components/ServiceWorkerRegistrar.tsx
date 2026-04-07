"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Force update: unregister old SW, clear all caches, then re-register
      navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        for (const reg of registrations) {
          await reg.unregister();
        }
        // Clear all caches
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        // Re-register fresh SW
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }).catch(() => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      });
    }
  }, []);

  return null;
}
