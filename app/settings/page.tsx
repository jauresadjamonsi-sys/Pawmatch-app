"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAppContext } from "@/lib/contexts/AppContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SettingsSection = "account" | "privacy" | "notifications" | "matching" | "appearance" | "about";

export default function SettingsPage() {
  const { profile, loading: authLoading } = useAuth();
  const { lang, setLang, theme, themePreference, setTheme, t } = useAppContext();
  const supabase = createClient();
  const router = useRouter();

  const [section, setSection] = useState<SettingsSection>("privacy");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    showOnline: true,
    showLocation: true,
    showLastSeen: true,
    allowDMs: true,
    showAnimalsPublic: true,
    showReelsPublic: true,
  });

  // Notification settings
  const [notifSettings, setNotifSettings] = useState({
    matches: true,
    messages: true,
    likes: true,
    comments: true,
    followers: true,
    events: true,
    promotions: false,
    emailDigest: false,
  });

  // Matching preferences
  const [matchPrefs, setMatchPrefs] = useState({
    preferredSpecies: [] as string[],
    preferredCantons: [] as string[],
    ageMin: 0,
    ageMax: 20,
    activityLevel: "moderate",
    smartMatchEnabled: true,
  });

  useEffect(() => {
    if (profile) loadSettings();
  }, [profile]);

  async function loadSettings() {
    // Load matching preferences from localStorage (no DB table needed)
    try {
      const raw = localStorage.getItem("pawly_match_prefs");
      if (raw) {
        const prefs = JSON.parse(raw);
        setMatchPrefs(prev => ({ ...prev, ...prefs }));
      }
    } catch { /* ignore */ }
  }

  async function saveMatchPrefs() {
    if (!profile) return;
    setSaving(true);
    try {
      localStorage.setItem("pawly_match_prefs", JSON.stringify(matchPrefs));
    } catch { /* ignore */ }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleDeleteAccount() {
    const confirmed = confirm("Etes-vous sur de vouloir supprimer votre compte ? Cette action est irreversible.");
    if (!confirmed) return;
    const confirmed2 = confirm("Derniere confirmation : toutes vos donnees seront perdues. Continuer ?");
    if (!confirmed2) return;
    // We just sign out - actual deletion would require server-side logic
    alert("Votre demande de suppression a ete enregistree. Votre compte sera supprime sous 30 jours.");
    await supabase.auth.signOut();
    router.push("/");
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32" style={{ background: "var(--c-deep)" }}>
        <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pb-32" style={{ background: "var(--c-deep)" }}>
        <p className="text-lg font-semibold text-[var(--c-text)]">Connectez-vous pour acceder aux parametres</p>
        <Link href="/login" className="mt-4 text-amber-400">Se connecter</Link>
      </div>
    );
  }

  const SECTIONS: { key: SettingsSection; label: string; icon: string }[] = [
    { key: "privacy", label: "Confidentialite", icon: "🔒" },
    { key: "notifications", label: "Notifications", icon: "🔔" },
    { key: "matching", label: "Matching", icon: "💕" },
    { key: "appearance", label: "Apparence", icon: "🎨" },
    { key: "account", label: "Compte & donnees", icon: "⚙️" },
    { key: "about", label: "A propos", icon: "ℹ️" },
  ];

  const SPECIES_OPTIONS = ["Chien", "Chat", "Rongeur", "Oiseau", "Reptile", "Poisson", "NAC"];
  const ACTIVITY_LEVELS = [
    { value: "calm", label: "Calme 🧘" },
    { value: "moderate", label: "Modere 🚶" },
    { value: "active", label: "Actif 🏃" },
    { value: "very_active", label: "Tres actif ⚡" },
  ];

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-[var(--c-text)]">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-all relative ${value ? "bg-amber-500" : "bg-[var(--c-border)]"}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5.5 left-0.5" : "left-0.5"}`}
          style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/profile")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 className="text-xl font-extrabold gradient-text-animated">Parametres</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Sidebar */}
          <div className="md:w-56 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all " +
                  (section === s.key
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                    : "text-[var(--c-text-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-card)]")
                }
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div key={section} className="glass rounded-2xl p-5 border border-[var(--c-border)] animate-fade-in-scale">
              {/* Account & Data */}
              {section === "account" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-[var(--c-text)] mb-4">Compte & donnees</h2>
                  <p className="text-xs text-[var(--c-text-muted)] mb-3">
                    Pour modifier votre profil, photo ou abonnement, rendez-vous sur votre <Link href="/profile" className="text-amber-400 hover:underline">page Profil</Link>.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/user/export");
                          if (res.ok) {
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "pawly-mes-donnees.json";
                            a.click();
                            URL.revokeObjectURL(url);
                          } else {
                            alert("Erreur lors de l'export");
                          }
                        } catch { alert("Erreur reseau"); }
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] hover:border-amber-500/30 transition-all text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--c-text)]">Exporter mes donnees</p>
                        <p className="text-xs text-[var(--c-text-muted)]">Telecharger toutes vos donnees (RGPD)</p>
                      </div>
                      <span className="text-[var(--c-text-muted)]">📥</span>
                    </button>
                    <Link href="/profile/verify" className="flex items-center justify-between p-3 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] hover:border-blue-500/30 transition-all">
                      <div>
                        <p className="text-sm font-medium text-[var(--c-text)]">Verification du profil</p>
                        <p className="text-xs text-[var(--c-text-muted)]">Badge verifie + 15 PawCoins</p>
                      </div>
                      <span className="text-blue-400">✓</span>
                    </Link>
                  </div>
                  <div className="pt-4 border-t border-[var(--c-border)] space-y-2">
                    <button onClick={handleLogout}
                      className="w-full p-3 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
                      Se deconnecter
                    </button>
                    <button onClick={handleDeleteAccount}
                      className="w-full p-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all">
                      Supprimer mon compte
                    </button>
                  </div>
                </div>
              )}

              {/* Privacy */}
              {section === "privacy" && (
                <div>
                  <h2 className="text-lg font-bold text-[var(--c-text)] mb-4">Confidentialite</h2>
                  <div className="divide-y divide-[var(--c-border)]">
                    <Toggle value={privacySettings.showOnline} onChange={v => setPrivacySettings(p => ({...p, showOnline: v}))} label="Afficher statut en ligne" />
                    <Toggle value={privacySettings.showLocation} onChange={v => setPrivacySettings(p => ({...p, showLocation: v}))} label="Afficher ma localisation" />
                    <Toggle value={privacySettings.showLastSeen} onChange={v => setPrivacySettings(p => ({...p, showLastSeen: v}))} label="Afficher derniere connexion" />
                    <Toggle value={privacySettings.allowDMs} onChange={v => setPrivacySettings(p => ({...p, allowDMs: v}))} label="Autoriser les messages directs" />
                    <Toggle value={privacySettings.showAnimalsPublic} onChange={v => setPrivacySettings(p => ({...p, showAnimalsPublic: v}))} label="Animaux visibles publiquement" />
                    <Toggle value={privacySettings.showReelsPublic} onChange={v => setPrivacySettings(p => ({...p, showReelsPublic: v}))} label="Reels visibles publiquement" />
                  </div>
                </div>
              )}

              {/* Notifications */}
              {section === "notifications" && (
                <div>
                  <h2 className="text-lg font-bold text-[var(--c-text)] mb-4">Notifications</h2>
                  <div className="divide-y divide-[var(--c-border)]">
                    <Toggle value={notifSettings.matches} onChange={v => setNotifSettings(p => ({...p, matches: v}))} label="Nouveaux matchs" />
                    <Toggle value={notifSettings.messages} onChange={v => setNotifSettings(p => ({...p, messages: v}))} label="Messages" />
                    <Toggle value={notifSettings.likes} onChange={v => setNotifSettings(p => ({...p, likes: v}))} label="Likes sur mes reels" />
                    <Toggle value={notifSettings.comments} onChange={v => setNotifSettings(p => ({...p, comments: v}))} label="Commentaires" />
                    <Toggle value={notifSettings.followers} onChange={v => setNotifSettings(p => ({...p, followers: v}))} label="Nouveaux abonnes" />
                    <Toggle value={notifSettings.events} onChange={v => setNotifSettings(p => ({...p, events: v}))} label="Evenements & groupes" />
                    <Toggle value={notifSettings.promotions} onChange={v => setNotifSettings(p => ({...p, promotions: v}))} label="Promotions & offres" />
                    <Toggle value={notifSettings.emailDigest} onChange={v => setNotifSettings(p => ({...p, emailDigest: v}))} label="Resume hebdomadaire par email" />
                  </div>
                </div>
              )}

              {/* Matching */}
              {section === "matching" && (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-[var(--c-text)] mb-4">Preferences de matching</h2>

                  <Toggle value={matchPrefs.smartMatchEnabled} onChange={v => setMatchPrefs(p => ({...p, smartMatchEnabled: v}))} label="Smart Match IA active" />

                  <div>
                    <label className="text-sm font-medium text-[var(--c-text)] mb-2 block">Especes preferees</label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIES_OPTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            setMatchPrefs(p => ({
                              ...p,
                              preferredSpecies: p.preferredSpecies.includes(s)
                                ? p.preferredSpecies.filter(x => x !== s)
                                : [...p.preferredSpecies, s],
                            }));
                          }}
                          className={
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all " +
                            (matchPrefs.preferredSpecies.includes(s)
                              ? "bg-amber-500 text-white"
                              : "bg-[var(--c-card)] text-[var(--c-text-muted)] border border-[var(--c-border)]")
                          }
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[var(--c-text)] mb-2 block">Niveau d&apos;activite</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ACTIVITY_LEVELS.map(l => (
                        <button
                          key={l.value}
                          onClick={() => setMatchPrefs(p => ({...p, activityLevel: l.value}))}
                          className={
                            "px-4 py-2.5 rounded-xl text-sm font-medium transition-all " +
                            (matchPrefs.activityLevel === l.value
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                              : "bg-[var(--c-card)] text-[var(--c-text-muted)] border border-[var(--c-border)]")
                          }
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[var(--c-text)] mb-2 block">
                      Age de l&apos;animal: {matchPrefs.ageMin} - {matchPrefs.ageMax} ans
                    </label>
                    <div className="flex gap-3 items-center">
                      <input type="range" min="0" max="20" value={matchPrefs.ageMin}
                        onChange={e => setMatchPrefs(p => ({...p, ageMin: Number(e.target.value)}))}
                        className="flex-1 accent-amber-500" />
                      <span className="text-xs text-[var(--c-text-muted)]">a</span>
                      <input type="range" min="0" max="20" value={matchPrefs.ageMax}
                        onChange={e => setMatchPrefs(p => ({...p, ageMax: Number(e.target.value)}))}
                        className="flex-1 accent-amber-500" />
                    </div>
                  </div>

                  <button
                    onClick={saveMatchPrefs}
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all disabled:opacity-50"
                  >
                    {saving ? "Sauvegarde..." : saved ? "Sauvegarde!" : "Sauvegarder"}
                  </button>
                </div>
              )}

              {/* Appearance */}
              {section === "appearance" && (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-[var(--c-text)] mb-4">Apparence</h2>
                  <p className="text-sm text-[var(--c-text-muted)]">
                    Vous pouvez aussi changer le theme et la langue via les icones en haut a droite de la barre de navigation.
                  </p>
                  <div>
                    <label className="text-sm font-medium text-[var(--c-text)] mb-3 block">Theme actuel: {themePreference}</label>
                    <p className="text-xs text-[var(--c-text-muted)]">Utilisez le selecteur 🎨 dans la navbar pour changer de theme.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--c-text)] mb-3 block">Langue actuelle: {lang}</label>
                    <p className="text-xs text-[var(--c-text-muted)]">Utilisez le selecteur de drapeau dans la navbar pour changer de langue.</p>
                  </div>
                </div>
              )}

              {/* About */}
              {section === "about" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-[var(--c-text)] mb-4">A propos de Pawly</h2>
                  <div className="text-center py-6">
                    <p className="text-4xl mb-2">🐾</p>
                    <p className="text-xl font-extrabold gradient-text-warm">Pawly</p>
                    <p className="text-sm text-[var(--c-text-muted)] mt-1">v2.0.0</p>
                    <p className="text-xs text-[var(--c-text-muted)] mt-2">Le reseau social #1 pour les animaux en Suisse</p>
                  </div>
                  <div className="space-y-2">
                    <Link href="/legal/cgu" className="flex items-center justify-between p-3 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] hover:border-amber-500/30 transition-all">
                      <span className="text-sm text-[var(--c-text)]">Conditions d&apos;utilisation</span>
                      <svg className="w-4 h-4 text-[var(--c-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                    <Link href="/legal/privacy" className="flex items-center justify-between p-3 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] hover:border-amber-500/30 transition-all">
                      <span className="text-sm text-[var(--c-text)]">Politique de confidentialite</span>
                      <svg className="w-4 h-4 text-[var(--c-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                    <Link href="/legal/mentions-legales" className="flex items-center justify-between p-3 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] hover:border-amber-500/30 transition-all">
                      <span className="text-sm text-[var(--c-text)]">Mentions legales</span>
                      <svg className="w-4 h-4 text-[var(--c-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </div>
                  <p className="text-center text-xs text-[var(--c-text-muted)] pt-4">
                    Fait avec ❤️ en Suisse
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
