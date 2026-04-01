"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function SyncSubscription() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("subscription") === "success") {
      fetch("/api/stripe/verify").then(() => {
        window.location.href = "/profile";
      });
    }
  }, [searchParams]);

  return null;
}
