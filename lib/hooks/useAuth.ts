"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserProfile = {
  city?: string | null;
  subscription?: string;
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
          .select("id, email, full_name, role, city, phone, subscription")
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

  const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "jaures.adjamonsi@gmail.com").split(",").map(e => e.trim().toLowerCase());

  return {
    profile,
    loading,
    isAdmin: profile?.role === "admin" || (profile?.email ? ADMIN_EMAILS.includes(profile.email.toLowerCase()) : false),
    isAuthenticated: !!profile,
  };
}
