"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { CANTONS } from "@/lib/cantons";
import { CITIES } from "@/lib/cities";
import { useRouter } from "next/navigation";

export default function EditProfilePage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedCanton, setSelectedCanton] = useState("");
  const [customCity, setCustomCity] = useState(false);
  const supabase = createClient();
  const { profile, loading } = useAuth();
  const router = useRouter();

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
      if (!cantonEntry) setCustomCity(true);
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
    if (validation.error) { setError(validation.error); setSaving(false); return; }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: (form.get("full_name") as string) || null,
        phone: (form.get("phone") as string) || null,
        city,
      })
      .eq("id", profile!.id);

    if (updateError) { setError("Erreur: " + updateError.message); setSaving(false); return; }
    setSuccess(true);
    setSaving(false);
    setTimeout(() => router.push("/profile"), 1500);
  }

  if (loading) return <p className="text-center py-12 text-gray-500">Chargement...</p>;
  if (!profile) return <p className="text-center py-12 text-gray-500">Non connecté</p>;

  const cantonCities = selectedCanton ? CITIES[selectedCanton] || [] : [];

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Modifier mon profil</h1>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm">Profil mis à jour !</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nom complet</label>
              <input name="full_name" type="text" defaultValue={profile.full_name || ""}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Téléphone</label>
              <input name="phone" type="tel" defaultValue={profile.phone || ""}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                placeholder="+41 79 123 45 67" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Canton</label>
              <select value={selectedCanton} onChange={(e) => { setSelectedCanton(e.target.value); setCustomCity(false); }}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:ring-2 focus:ring-orange-500 outline-none appearance-none">
                <option value="" className="bg-[#1a1225]">Sélectionner un canton</option>
                {CANTONS.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#1a1225]">{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ville</label>
              {customCity ? (
                <input name="city_custom" type="text" defaultValue={profile.city || ""}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                  placeholder="Votre ville" />
              ) : (
                <select name="city"
                  defaultValue={profile.city || ""}
                  onChange={(e) => { if (e.target.value === "__other") setCustomCity(true); }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:ring-2 focus:ring-orange-500 outline-none appearance-none">
                  <option value="" className="bg-[#1a1225]">Sélectionner</option>
                  {cantonCities.map((city) => (
                    <option key={city} value={city} className="bg-[#1a1225]">{city}</option>
                  ))}
                  <option value="__other" className="bg-[#1a1225]">Autre...</option>
                </select>
              )}
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition disabled:opacity-50">
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
              <button type="button" onClick={() => router.push("/profile")}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-gray-300 font-medium rounded-xl transition border border-white/10">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
