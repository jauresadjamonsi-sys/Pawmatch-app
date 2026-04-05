"use client";

import { usePresence } from "@/lib/hooks/usePresence";
import { useAuth } from "@/lib/hooks/useAuth";

/**
 * Invisible component that keeps the authenticated user's presence alive.
 * Renders nothing. Place once in the app layout.
 */
export default function PresenceHeartbeat() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <PresenceInner />;
  }
  return null;
}

function PresenceInner() {
  usePresence();
  return null;
}
