"use client";

import { useEffect } from "react";

const SW_VERSION = 7;

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // One-time cache purge when SW version changes
    const lastVersion = Number(localStorage.getItem("pawly_sw_v") || "0");
    if (lastVersion < SW_VERSION) {
      // Nuke ALL caches so old JS chunks are gone
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      }).catch(() => {});

      // Force unregister + re-register to pick up new sw.js
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      }).then(() => {
        localStorage.setItem("pawly_sw_v", String(SW_VERSION));
        // Reload once to get fresh JS from network
        window.location.reload();
      }).catch(() => {
        localStorage.setItem("pawly_sw_v", String(SW_VERSION));
      });
      return;
    }

    // Normal registration
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Force waiting SW to activate immediately
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "activated") {
                window.location.reload();
              }
            });
          }
        });
        // Check for updates every 30 minutes
        setInterval(() => reg.update(), 1000 * 60 * 30);
      })
      .catch(() => {});
  }, []);

  return null;
}
