"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { CANTONS } from "@/lib/cantons";
import { CITIES } from "@/lib/cities";

export default function EditProfilePage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedCanton, setSelectedCanton] = useState("");
  const [customCity, setCustomCity] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { profile, loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (profile?.city) {
      const cantonEntry = CANTONS.find(() => {
        for (const [code, cities] of Object.entries(CITIES)) {
          if (cities.includes(profile.city || "")) {
            setSelectedCanton(code);
            return true;
          }
        }
        return false;
      });
      if (!cantonEntry && profile.city) {
        setCustomCity(true);
      }
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const form = new FormData(e.currentTarget);

    const city = customCity
      ? (form.get("city_custom") as string) || null
      : (form.get("city") as string) || null;


    const { validateProfile } = await import("@/lib/validations/profile");
    const validation = validateProfile({
      full_name: (form.get("full_name") as string) || null,
      phone: (form.get("phone") as string) || null,
      city,
    });
    if (validation.error) {
      setError(validation.error);
      setSaving(false);
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: (form.get("full_name") as string) || null,
        phone: (form.get("phone") as string) || null,
        city,
      })
      .eq("id", profile?.id);

    if (updateError) {
      setError("Erreur: " + updateError.message);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);
  }

  if (authLoading) {
    return <p className="text-center py-12 text-gray-500">Chargement...</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connexion requise</h2>
          <p className="text-gray-600">Connectez-vous pour modifier votre profil.</p>
        </div>
      </div>
    );
  }

  const citiesList = selectedCanton ? (CITIES[selectedCanton] || []) : [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Modifier mon profil</h1>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              Profil mis à jour avec succès.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <input name="full_name" type="text" defaultValue={profile?.full_name || ""} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={profile?.email || ""} disabled className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500" />
              <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input name="phone" type="tel" defaultValue={profile?.phone || ""} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" placeholder="+41 79 123 45 67" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Canton</label>
              <select value={selectedCanton} onChange={(e) => { setSelectedCanton(e.target.value); setCustomCity(false); }} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                <option value="">-- Sélectionner --</option>
                {CANTONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              {!selectedCanton ? (
                <p className="text-sm text-gray-400 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50">Sélectionnez d'abord un canton</p>
              ) : !customCity ? (
                <div className="flex gap-2">
                  <select name="city" defaultValue={profile?.city || ""} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                    <option value="">-- Sélectionner --</option>
                    {citiesList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setCustomCity(true)} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition text-sm font-medium">
                    Autre
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input name="city_custom" type="text" defaultValue={profile?.city || ""} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" placeholder="Saisir la ville" />
                  <button type="button" onClick={() => setCustomCity(false)} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition text-sm font-medium">
                    Liste
                  </button>
                </div>
              )}
            </div>

            <button type="submit" disabled={saving} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition disabled:opacity-50">
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </form>

          <button onClick={() => router.push("/profile")} className="w-full mt-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition">
            Retour au profil
          </button>
        </div>
      </div>
    </div>
  );
}
