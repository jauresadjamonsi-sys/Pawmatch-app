"use client";

import { useEffect } from "react";

export default function VisitTracker() {
  useEffect(() => {
    if (sessionStorage.getItem("pawly_visited")) return;
    sessionStorage.setItem("pawly_visited", "1");
    fetch("/api/visit", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
