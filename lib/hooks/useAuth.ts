"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserProfile = {
  city?: string | null;
  phone?: string | null;
  id: string;
  email: string;
  full_name: string | null;
  role: "adoptant" | "admin";
};

export function useAuth() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("id, email, full_name, role, city, phone")
          .eq("id", user.id)
          .single();

        setProfile(data as UserProfile | null);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  return {
    profile,
    loading,
    isAdmin: profile?.role === "admin",
    isAuthenticated: !!profile,
  };
}
