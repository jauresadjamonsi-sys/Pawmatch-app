"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/auth/admin";

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
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

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
          .select("id, full_name, email, avatar_url, role, subscription, city, created_at, phone")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile(data as UserProfile);
        } else {
          // Profile missing — create it via API (bypasses RLS)
          try {
            await fetch("/api/auth/ensure-profile", { method: "POST" });
            // Retry fetch
            const { data: retry } = await supabase
              .from("profiles")
              .select("id, full_name, email, avatar_url, role, subscription, city, created_at, phone")
              .eq("id", user.id)
              .single();
            setProfile(retry as UserProfile | null);
          } catch {
            setProfile(null);
          }
        }
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
    isAdmin: profile?.role === "admin" || (profile?.email ? isAdminEmail(profile.email) : false),
    isAuthenticated: !!profile,
  };
}
