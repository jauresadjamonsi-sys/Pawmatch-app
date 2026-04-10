"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CANTONS } from "@/lib/cantons";
import Image from "next/image";

type Listing = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  condition: string;
  photo_url: string | null;
  canton: string;
  status: string;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null };
};

const TABS = [
  { key: "all", label: "Tout" },
  { key: "accessoires", label: "Accessoires" },
  { key: "nourriture", label: "Nourriture" },
  { key: "jouets", label: "Jouets" },
  { key: "services", label: "Services" },
  { key: "dons", label: "Dons" },
];

const CONDITIONS = [
  { value: "neuf", label: "Neuf" },
  { value: "occasion", label: "Occasion" },
  { value: "don", label: "Don gratuit" },
];

const CATEGORIES = [
  { value: "accessoires", label: "Accessoires" },
  { value: "nourriture", label: "Nourriture" },
  { value: "jouets", label: "Jouets" },
  { value: "services", label: "Services" },
  { value: "dons", label: "Dons" },
];

const CONDITION_BADGE: Record<string, string> = {
  neuf: "bg-green-500/15 text-green-400 border-green-500/25",
  occasion: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  don: "bg-purple-500/15 text-purple-400 border-purple-500/25",
};

function cantonName(code: string) {
  return CANTONS.find((c) => c.code === code)?.name || code;
}

export default function MarketplacePage() {
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("accessoires");
  const [formPrice, setFormPrice] = useState("");
  const [formCondition, setFormCondition] = useState("neuf");
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab !== "all") params.set("category", tab);
    if (search.trim()) params.set("search", search.trim());

    try {
      const res = await fetch(`/api/marketplace?${params.toString()}`);
      const json = await res.json();
      setListings(json.listings || []);
    } catch {
      setListings([]);
    }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setFormPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSubmitting(true);
    setSubmitMsg(null);

    const fd = new FormData();
    fd.append("title", formTitle.trim());
    fd.append("description", formDesc.trim());
    fd.append("category", formCondition === "don" ? "dons" : formCategory);
    fd.append("price", formCondition === "don" ? "0" : formPrice || "0");
    fd.append("condition", formCondition);
    if (formPhoto) fd.append("photo", formPhoto);

    try {
      const res = await fetch("/api/marketplace", { method: "POST", body: fd });
      const json = await res.json();
      if (json.error) {
        setSubmitMsg(json.error);
      } else {
        setSubmitMsg(json.coins_earned ? `Annonce publiee ! +${json.coins_earned} PawCoins` : "Annonce publiee !");
        setFormTitle("");
        setFormDesc("");
        setFormCategory("accessoires");
        setFormPrice("");
        setFormCondition("neuf");
        setFormPhoto(null);
        setFormPhotoPreview(null);
        setTimeout(() => {
          setShowModal(false);
          setSubmitMsg(null);
          fetchListings();
        }, 1500);
      }
    } catch {
      setSubmitMsg("Erreur reseau");
    }
    setSubmitting(false);
  }

  function handleContact(listing: Listing) {
    // Open DM with seller via matches/messages
    window.location.href = `/matches?dm=${listing.user_id}`;
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <h1 className="text-3xl md:text-4xl font-extrabold gradient-text-warm mb-1">
          Marketplace Pawly
        </h1>
        <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>
          Achete et vends des accessoires pour animaux
        </p>
      </div>

      {/* Tabs + Search */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all border " +
                (tab === t.key
                  ? "bg-green-500/15 text-green-400 border-green-500/30 font-semibold"
                  : "border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-green-500/30 hover:text-green-400")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: "var(--c-text-muted)" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass border border-[var(--c-border)] focus:border-green-500/50 focus:outline-none transition-all"
              style={{ color: "var(--c-text)", background: "var(--c-glass)" }}
            />
          </div>
          {user && (
            <button
              onClick={() => setShowModal(true)}
              className="btn-press px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #22c55e, #a78bfa)",
                boxShadow: "0 4px 15px rgba(34,197,94,0.3)",
              }}
            >
              Publier une annonce
            </button>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-5xl mx-auto px-4">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
                <div className="aspect-square animate-shimmer" />
                <div className="p-3 space-y-2">
                  <div className="h-4 rounded animate-shimmer" style={{ width: "70%" }} />
                  <div className="h-3 rounded animate-shimmer" style={{ width: "40%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🛍️</div>
            <p className="text-lg font-semibold" style={{ color: "var(--c-text)" }}>
              Aucune annonce pour le moment
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--c-text-muted)" }}>
              Sois le premier a publier !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="glass rounded-2xl overflow-hidden card-hover"
                style={{ border: "1px solid var(--c-border)" }}
              >
                {/* Photo */}
                <div className="relative aspect-square" style={{ background: "var(--c-card)" }}>
                  {listing.photo_url ? (
                    <Image
                      src={listing.photo_url}
                      alt={listing.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🐾
                    </div>
                  )}
                  {/* Condition badge */}
                  <span
                    className={
                      "absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold border " +
                      (CONDITION_BADGE[listing.condition] || CONDITION_BADGE.occasion)
                    }
                    style={{ backdropFilter: "blur(8px)" }}
                  >
                    {listing.condition === "don" ? "Don" : listing.condition === "neuf" ? "Neuf" : "Occasion"}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3
                    className="font-semibold text-sm truncate mb-1"
                    style={{ color: "var(--c-text)" }}
                  >
                    {listing.title}
                  </h3>
                  <p className="text-base font-bold gradient-text-warm mb-1.5">
                    {listing.price === 0 ? "Gratuit" : `CHF ${listing.price.toFixed(2)}`}
                  </p>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    {listing.profiles?.avatar_url ? (
                      <Image
                        src={listing.profiles.avatar_url}
                        alt=""
                        width={18}
                        height={18}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px]"
                        style={{ background: "var(--c-card)" }}
                      >
                        🐾
                      </div>
                    )}
                    <span
                      className="text-[11px] truncate"
                      style={{ color: "var(--c-text-muted)" }}
                    >
                      {listing.profiles?.full_name || "Anonyme"}
                    </span>
                    {listing.canton && (
                      <span
                        className="text-[10px] ml-auto shrink-0"
                        style={{ color: "var(--c-text-muted)" }}
                      >
                        {listing.canton}
                      </span>
                    )}
                  </div>
                  {user && user.id !== listing.user_id && (
                    <button
                      onClick={() => handleContact(listing)}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all border hover:bg-green-500/10"
                      style={{
                        color: "var(--c-text)",
                        borderColor: "var(--c-border)",
                      }}
                    >
                      Contacter
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Publier une annonce */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="glass-strong w-full max-w-md rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto"
            style={{ border: "1px solid var(--c-border)" }}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-[var(--c-card)]"
              style={{ color: "var(--c-text-muted)" }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold gradient-text-warm mb-4">
              Publier une annonce
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-text-muted)" }}>
                  Titre *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Laisse retractable pour chien"
                  className="w-full px-3 py-2 rounded-xl text-sm border border-[var(--c-border)] focus:border-green-500/50 focus:outline-none transition-all"
                  style={{ color: "var(--c-text)", background: "var(--c-glass)" }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-text-muted)" }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Decris ton article ou service..."
                  className="w-full px-3 py-2 rounded-xl text-sm border border-[var(--c-border)] focus:border-green-500/50 focus:outline-none transition-all resize-none"
                  style={{ color: "var(--c-text)", background: "var(--c-glass)" }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-text-muted)" }}>
                  Categorie
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-[var(--c-border)] focus:border-green-500/50 focus:outline-none transition-all"
                  style={{ color: "var(--c-text)", background: "var(--c-glass)" }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-text-muted)" }}>
                  Etat
                </label>
                <div className="flex gap-2">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormCondition(c.value)}
                      className={
                        "flex-1 py-2 rounded-xl text-sm font-medium border transition-all " +
                        (formCondition === c.value
                          ? "bg-green-500/15 text-green-400 border-green-500/30"
                          : "border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-green-500/20")
                      }
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              {formCondition !== "don" && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-text-muted)" }}>
                    Prix (CHF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl text-sm border border-[var(--c-border)] focus:border-green-500/50 focus:outline-none transition-all"
                    style={{ color: "var(--c-text)", background: "var(--c-glass)" }}
                  />
                </div>
              )}

              {/* Photo upload */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-text-muted)" }}>
                  Photo
                </label>
                <div
                  className="relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-green-500/40"
                  style={{ borderColor: "var(--c-border)" }}
                  onClick={() => document.getElementById("photo-input")?.click()}
                >
                  {formPhotoPreview ? (
                    <div className="relative w-full aspect-square max-w-[200px] mx-auto rounded-lg overflow-hidden">
                      <Image
                        src={formPhotoPreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl mb-2">📷</div>
                      <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
                        Clique pour ajouter une photo
                      </p>
                    </div>
                  )}
                  <input
                    id="photo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>

              {/* Submit */}
              {submitMsg && (
                <p
                  className={
                    "text-sm text-center font-medium " +
                    (submitMsg.includes("Erreur") || submitMsg.includes("erreur")
                      ? "text-red-400"
                      : "text-green-400")
                  }
                >
                  {submitMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting || !formTitle.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #22c55e, #a78bfa)",
                  boxShadow: "0 4px 15px rgba(34,197,94,0.3)",
                }}
              >
                {submitting ? "Publication..." : "Publier"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
