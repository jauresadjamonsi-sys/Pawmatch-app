"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";

type SearchTab = "all" | "animals" | "users" | "groups" | "reels" | "hashtags";

type SearchResult = {
  type: "animal" | "user" | "group" | "reel" | "hashtag";
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  link: string;
  extra?: string;
};

const TRENDING_SEARCHES = [
  "chien", "chat", "berger allemand", "golden retriever",
  "chaton", "lapin", "zurich", "geneve", "vaud",
  "adoption", "balade", "toilettage",
];

const SEARCH_TABS: { key: SearchTab; label: string; icon: string }[] = [
  { key: "all", label: "Tout", icon: "🔍" },
  { key: "animals", label: "Animaux", icon: "🐾" },
  { key: "users", label: "Profils", icon: "👤" },
  { key: "groups", label: "Groupes", icon: "👥" },
  { key: "reels", label: "Reels", icon: "🎬" },
  { key: "hashtags", label: "Hashtags", icon: "#" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingTags, setTrendingTags] = useState<{ tag: string; count: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();
  const supabase = createClient();
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pawly_recent_searches");
      if (saved) setRecentSearches(JSON.parse(saved).slice(0, 8));
    } catch {}
    // Fetch trending hashtags
    fetch("/api/trending").then(r => r.json()).then(d => {
      if (d.tags) setTrendingTags(d.tags.slice(0, 12));
    }).catch(() => {});
    // Auto-focus search
    inputRef.current?.focus();
  }, []);

  const saveSearch = (q: string) => {
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 8);
    setRecentSearches(updated);
    try { localStorage.setItem("pawly_recent_searches", JSON.stringify(updated)); } catch {}
  };

  const performSearch = useCallback(async (q: string, activeTab: SearchTab) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    setLoading(true);
    const allResults: SearchResult[] = [];
    const searchTerm = `%${q.trim().toLowerCase()}%`;

    try {
      // Search animals
      if (activeTab === "all" || activeTab === "animals") {
        const { data: animals } = await supabase
          .from("animals")
          .select("id, name, species, breed, canton, photo_url")
          .or(`name.ilike.${searchTerm},breed.ilike.${searchTerm},species.ilike.${searchTerm}`)
          .limit(activeTab === "animals" ? 30 : 8);
        (animals || []).forEach((a: any) => allResults.push({
          type: "animal",
          id: a.id,
          title: a.name,
          subtitle: [a.species, a.breed, a.canton].filter(Boolean).join(" · "),
          image: a.photo_url || null,
          link: `/animals/${a.id}`,
        }));
      }

      // Search users/profiles
      if (activeTab === "all" || activeTab === "users") {
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, city")
          .ilike("full_name", searchTerm)
          .limit(activeTab === "users" ? 30 : 6);
        (users || []).forEach(u => allResults.push({
          type: "user",
          id: u.id,
          title: u.full_name || "Utilisateur",
          subtitle: u.city || "",
          image: u.avatar_url || null,
          link: `/profile/${u.id}`,
        }));
      }

      // Search groups
      if (activeTab === "all" || activeTab === "groups") {
        const { data: groups } = await supabase
          .from("groups")
          .select("id, name, description, category, member_count, icon")
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(activeTab === "groups" ? 30 : 6);
        (groups || []).forEach(g => allResults.push({
          type: "group",
          id: g.id,
          title: `${g.icon || "👥"} ${g.name}`,
          subtitle: `${g.member_count || 0} membres · ${g.category}`,
          link: `/groups/${g.id}`,
          extra: g.description?.slice(0, 60),
        }));
      }

      // Search reels (by caption)
      if (activeTab === "all" || activeTab === "reels") {
        const { data: reels } = await supabase
          .from("reels")
          .select("id, caption, thumbnail_url, user_id")
          .ilike("caption", searchTerm)
          .limit(activeTab === "reels" ? 30 : 6);
        (reels || []).forEach((r: any) => allResults.push({
          type: "reel",
          id: r.id,
          title: r.caption?.slice(0, 60) || "Reel sans legende",
          subtitle: "Reel",
          image: r.thumbnail_url || null,
          link: `/reels?id=${r.id}`,
        }));
      }

      // Search hashtags (from reels.hashtags array column)
      if (activeTab === "all" || activeTab === "hashtags") {
        try {
          const { data: reelsWithTags } = await supabase
            .from("reels")
            .select("id, hashtags")
            .not("hashtags", "eq", "{}")
            .limit(100);
          const tagMap = new Map<string, number>();
          const searchLower = q.trim().toLowerCase();
          (reelsWithTags || []).forEach((r: any) => {
            (r.hashtags || []).forEach((tag: string) => {
              if (tag.toLowerCase().includes(searchLower)) {
                tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
              }
            });
          });
          tagMap.forEach((count, tag) => allResults.push({
            type: "hashtag",
            id: tag,
            title: `#${tag}`,
            subtitle: `${count} publication${count > 1 ? "s" : ""}`,
            link: `/explore?hashtag=${tag}`,
          }));
        } catch { /* hashtag search failed */ }
      }

      setResults(allResults);
    } catch (err) {
      console.error("[Search] error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(query, tab);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, tab, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveSearch(query.trim());
      performSearch(query, tab);
    }
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try { localStorage.removeItem("pawly_recent_searches"); } catch {}
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "animal": return "🐾";
      case "user": return "👤";
      case "group": return "👥";
      case "reel": return "🎬";
      case "hashtag": return "#";
      default: return "🔍";
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "animal": return "from-amber-400 to-amber-400";
      case "user": return "from-blue-500 to-cyan-500";
      case "group": return "from-purple-500 to-pink-500";
      case "reel": return "from-red-500 to-pink-500";
      case "hashtag": return "from-amber-400 to-amber-400";
      default: return "from-gray-500 to-gray-600";
    }
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
      {/* Back button */}
      <div className="px-4 pt-4 max-w-2xl mx-auto">
        <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      </div>
      {/* Header */}
      <div className="sticky top-12 z-40" style={{
        background: "var(--c-deep)",
        borderBottom: "1px solid var(--c-border)",
      }}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          {/* Search bar */}
          <form onSubmit={handleSubmit} className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--c-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Rechercher animaux, profils, groupes, reels..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl text-sm border border-[var(--c-border)] bg-[var(--c-card)] text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/50 transition-all"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--c-border)] flex items-center justify-center text-[var(--c-text-muted)] hover:bg-amber-400/20 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>

          {/* Tabs */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {SEARCH_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all " +
                  (tab === t.key
                    ? "bg-amber-400 text-white shadow-lg shadow-amber-400/25"
                    : "bg-[var(--c-card)] text-[var(--c-text-muted)] border border-[var(--c-border)] hover:border-amber-400/30")
                }
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        )}

        {/* Results */}
        {!loading && query.length >= 2 && results.length > 0 && (
          <div className="space-y-2 stagger-children">
            <p className="text-xs text-[var(--c-text-muted)] mb-3">
              {results.length} resultat{results.length > 1 ? "s" : ""} pour &quot;{query}&quot;
            </p>
            {results.map((r, i) => (
              <Link
                key={`${r.type}-${r.id}-${i}`}
                href={r.link}
                className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-card)] card-hover group"
              >
                {/* Icon/Image */}
                {r.image ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--c-border)]">
                    <Image src={r.image} alt={r.title} width={48} height={48} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${typeColor(r.type)} text-white text-lg`}>
                    {typeIcon(r.type)}
                  </div>
                )}
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--c-text)] truncate group-hover:text-amber-300 transition-colors">
                    {r.title}
                  </p>
                  {r.subtitle && (
                    <p className="text-xs text-[var(--c-text-muted)] truncate">{r.subtitle}</p>
                  )}
                  {r.extra && (
                    <p className="text-xs text-[var(--c-text-muted)] truncate mt-0.5 opacity-60">{r.extra}</p>
                  )}
                </div>
                {/* Type badge */}
                <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${typeColor(r.type)} text-white font-medium flex-shrink-0`}>
                  {r.type === "animal" ? "Animal" : r.type === "user" ? "Profil" : r.type === "group" ? "Groupe" : r.type === "reel" ? "Reel" : "Tag"}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg font-semibold text-[var(--c-text)]">Aucun resultat</p>
            <p className="text-sm text-[var(--c-text-muted)] mt-1">
              Essayez un autre terme ou changez de filtre
            </p>
          </div>
        )}

        {/* Empty state: trending + recent */}
        {!loading && query.length < 2 && (
          <div className="space-y-8">
            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--c-text)]">Recherches recentes</h3>
                  <button onClick={clearRecent} className="text-xs text-amber-300 hover:text-amber-200 transition-colors">
                    Effacer
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setQuery(s); saveSearch(s); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-amber-400/30 hover:text-amber-300 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending hashtags */}
            {trendingTags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--c-text)] mb-3">Tendances</h3>
                <div className="space-y-1.5">
                  {trendingTags.map((t, i) => (
                    <button
                      key={t.tag}
                      onClick={() => setQuery(t.tag)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--c-card)] transition-all text-left group"
                    >
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-amber-300">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--c-text)] group-hover:text-amber-300 transition-colors">
                          #{t.tag}
                        </p>
                        <p className="text-xs text-[var(--c-text-muted)]">{t.count} publication{t.count > 1 ? "s" : ""}</p>
                      </div>
                      <svg className="w-4 h-4 text-[var(--c-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested searches */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--c-text)] mb-3">Suggestions</h3>
              <div className="flex flex-wrap gap-2">
                {TRENDING_SEARCHES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="px-3.5 py-2 rounded-full text-xs bg-gradient-to-r from-[var(--c-card)] to-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text)] hover:border-amber-400/30 hover:text-amber-300 hover:shadow-lg hover:shadow-amber-400/10 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories grid */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--c-text)] mb-3">Explorer par categorie</h3>
              <div className="grid grid-cols-2 gap-3 stagger-children">
                {[
                  { label: "Chiens", icon: "🐕", query: "chien", color: "from-amber-400 to-amber-500" },
                  { label: "Chats", icon: "🐱", query: "chat", color: "from-purple-500 to-pink-600" },
                  { label: "Rongeurs", icon: "🐹", query: "rongeur", color: "from-amber-400 to-amber-500" },
                  { label: "Oiseaux", icon: "🐦", query: "oiseau", color: "from-blue-500 to-cyan-600" },
                  { label: "Reptiles", icon: "🦎", query: "reptile", color: "from-lime-500 to-amber-500" },
                  { label: "NAC", icon: "🐰", query: "lapin", color: "from-pink-500 to-rose-600" },
                ].map(cat => (
                  <button
                    key={cat.label}
                    onClick={() => { setQuery(cat.query); setTab("animals"); }}
                    className={`btn-press p-4 rounded-2xl bg-gradient-to-br ${cat.color} text-white text-left card-hover`}
                  >
                    <p className="text-2xl mb-1">{cat.icon}</p>
                    <p className="text-sm font-bold">{cat.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
