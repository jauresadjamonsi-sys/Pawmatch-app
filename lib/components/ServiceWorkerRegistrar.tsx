"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Register SW normally — let the browser handle updates
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Check for updates every 30 minutes
        setInterval(() => reg.update(), 1000 * 60 * 30);
      })
      .catch(() => {});
  }, []);

  return null;
}
