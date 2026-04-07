"use client";

import { useEffect, useRef } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Defer PostHog initialization to not block page render
    const timer = setTimeout(async () => {
      try {
        const { initPostHog, posthog } = await import("@/lib/posthog");
        initPostHog();

        // Identify user in background (non-blocking)
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          posthog.identify(user.id, {
            email: profile?.email || user.email,
            name: profile?.full_name,
            subscription: profile?.subscription || "free",
            canton: profile?.canton,
          });
        }
      } catch {}
    }, 2000); // 2s delay: page is interactive first

    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
}
