"use client";

import { useEffect } from "react";
import { initPostHog, posthog } from "@/lib/posthog";
import { createClient } from "@/lib/supabase/client";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    async function identifyUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("full_name, subscription, canton, email").eq("id", user.id).single();
        posthog.identify(user.id, {
          email: profile?.email || user.email,
          name: profile?.full_name,
          subscription: profile?.subscription || "free",
          canton: profile?.canton,
        });
      }
    }
    identifyUser();
  }, []);

  return <>{children}</>;
}
