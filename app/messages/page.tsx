"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAppContext } from "@/lib/contexts/AppContext";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import PresenceDot from "@/lib/components/PresenceDot";
import Link from "next/link";
import Image from "next/image";
import { EMOJI_MAP } from "@/lib/constants";

/* ─── Types ─── */
interface ConversationItem {
  matchId: string;
  otherAnimal: { name: string; species: string; breed: string | null; photo_url: string | null };
  otherUserId: string;
  otherName: string;
  myAnimalName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastSenderId: string | null;
  isVoice: boolean;
  isImage: boolean;
  unreadCount: number;
  matchCreatedAt: string;
}

/* ─── Relative time (compact) ─── */
function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return "now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}j`;
  return new Date(dateStr).toLocaleDateString("fr-CH", { day: "numeric", month: "short" });
}

/* ═══════════════════════════════════════════ */
export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const { t } = useAppContext();

  // Collect other user IDs for presence
  const otherUserIds = conversations.map((c) => c.otherUserId).filter(Boolean);
  const { onlineMap } = useOnlineStatus(otherUserIds);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  /* ─── Fetch conversations ─── */
  const fetchConversations = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    // 1. Get all accepted matches
    const { data: matches, error } = await supabase
      .from("matches")
      .select(`
        id, created_at, sender_user_id, receiver_user_id,
        sender_animal:sender_animal_id(id, name, species, breed, photo_url),
        receiver_animal:receiver_animal_id(id, name, species, breed, photo_url),
        sender_profile:sender_user_id(id, full_name, email),
        receiver_profile:receiver_user_id(id, full_name, email)
      `)
      .eq("status", "accepted")
      .or(`sender_user_id.eq.${profile.id},receiver_user_id.eq.${profile.id}`)
      .order("created_at", { ascending: false });

    if (error || !matches) {
      setLoading(false);
      return;
    }

    // Deduplicate (mutual matches create 2 rows)
    const seenPairs = new Set<string>();
    const unique = matches.filter((m: any) => {
      const key = [m.sender_animal?.id, m.receiver_animal?.id].sort().join("-");
      if (seenPairs.has(key)) return false;
      seenPairs.add(key);
      return true;
    });

    // 2. For each match, fetch last message + unread count in parallel
    const items: ConversationItem[] = await Promise.all(
      unique.map(async (m: any) => {
        const isMe = m.sender_user_id === profile.id;
        const otherAnimal = isMe ? m.receiver_animal : m.sender_animal;
        const otherProfile = isMe ? m.receiver_profile : m.sender_profile;
        const myAnimal = isMe ? m.sender_animal : m.receiver_animal;
        const otherUserId = isMe ? m.receiver_user_id : m.sender_user_id;

        // Last message
        const { data: msgs } = await supabase
          .from("messages")
          .select("content, created_at, sender_id, image_url")
          .eq("match_id", m.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const last = msgs?.[0] || null;

        // Unread count
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("match_id", m.id)
          .neq("sender_id", profile.id)
          .is("read_at", null);

        return {
          matchId: m.id,
          otherAnimal: otherAnimal || { name: "?", species: "autre", breed: null, photo_url: null },
          otherUserId,
          otherName: otherProfile?.full_name || otherProfile?.email || "?",
          myAnimalName: myAnimal?.name || "?",
          lastMessage: last?.content || null,
          lastMessageAt: last?.created_at || m.created_at,
          lastSenderId: last?.sender_id || null,
          isVoice: last?.content === "\uD83C\uDF99\uFE0F Message vocal",
          isImage: last?.image_url && last?.content === "\uD83D\uDCF7 Photo",
          unreadCount: count || 0,
          matchCreatedAt: m.created_at,
        } as ConversationItem;
      })
    );

    // Only keep conversations with at least one message exchanged
    const withMessages = items.filter((c) => c.lastMessage !== null);

    // Sort by last activity (most recent first)
    withMessages.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });

    setConversations(withMessages);
    setLoading(false);
  }, [profile, supabase]);

  useEffect(() => {
    if (profile) fetchConversations();
    else if (!authLoading) setLoading(false);
  }, [profile, authLoading, fetchConversations]);

  // Real-time: listen for new messages across all matches
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("messages-global")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, () => {
        // Refresh conversations on any new message
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, supabase, fetchConversations]);

  // Filter by search
  const filtered = search.trim()
    ? conversations.filter((c) =>
        c.otherAnimal.name.toLowerCase().includes(search.toLowerCase()) ||
        c.otherName.toLowerCase().includes(search.toLowerCase()) ||
        c.myAnimalName.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  /* ─── Loading ─── */
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--c-deep)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 border-2 border-[var(--c-accent)]/30 border-t-[var(--c-accent)] rounded-full animate-spin" />
          </div>
          <p className="text-[var(--c-text-muted)] text-sm animate-pulse">{t.loading}</p>
        </div>
      </div>
    );
  }

  /* ─── Not logged in ─── */
  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--c-deep)] flex items-center justify-center p-6">
        <div className="glass-living blob-card p-8 text-center max-w-md">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-xl font-bold text-[var(--c-text)] mb-2">{t.matchesLoginRequired}</h2>
          <p className="text-[var(--c-text-muted)] text-sm mb-6">{t.msgLoginDesc || "Connecte-toi pour voir tes discussions."}</p>
          <Link href="/login" className="inline-block px-6 py-3 bg-gradient-to-r from-[var(--c-accent)] to-amber-500 text-white font-bold rounded-full">
            {t.navLogin}
          </Link>
        </div>
      </div>
    );
  }

  /* ─── Main ─── */
  return (
    <div className="min-h-screen bg-[var(--c-deep)] page-living-enter">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")}
              aria-label="Retour"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90"
              style={{ background: "var(--c-glass)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 className="text-2xl font-extrabold text-[var(--c-text)]">
              {t.msgTitle || "Discussions"}
            </h1>
          </div>
          {totalUnread > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              {totalUnread} {t.msgUnread || "non lu"}{totalUnread > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Sub-actions row */}
        <div className="flex items-center gap-3 mb-5">
          <p className="text-[var(--c-text-muted)] text-sm flex-1">
            {conversations.length > 0
              ? `${conversations.length} conversation${conversations.length > 1 ? "s" : ""}`
              : ""}
          </p>
          <Link href="/matches" className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={{ background: "var(--c-glass)", border: "1px solid var(--c-border)", color: "var(--c-accent)" }}>
            {t.msgManageMatches || "Mes matchs"}
          </Link>
        </div>

        {/* Search */}
        {conversations.length > 3 && (
          <div className="relative mb-5">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.msgSearch || "Rechercher une discussion..."}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm glass-living focus:outline-none focus:ring-1 focus:ring-[var(--c-accent)]/40 text-[var(--c-text)] placeholder:text-[var(--c-text-muted)]"
              style={{ background: "var(--c-glass)", border: "1px solid var(--c-border)" }}
            />
          </div>
        )}

        {/* Conversation list */}
        <div className="space-y-2 stagger-children">
          {filtered.map((conv) => {
            const isOnline = onlineMap.get(conv.otherUserId) ?? false;
            const isFromMe = conv.lastSenderId === profile.id;
            const hasUnread = conv.unreadCount > 0;

            // Format last message preview
            let preview = t.msgStartConvo || "Commencez la conversation !";
            if (conv.lastMessage) {
              if (conv.isVoice) preview = "🎙 " + (t.msgVoice || "Message vocal");
              else if (conv.isImage) preview = "📷 " + (t.msgPhoto || "Photo");
              else preview = conv.lastMessage.length > 55 ? conv.lastMessage.slice(0, 55) + "..." : conv.lastMessage;
            }

            return (
              <Link
                key={conv.matchId}
                href={`/matches/${conv.matchId}`}
                className={`
                  flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-200
                  hover:scale-[1.01] active:scale-[0.98]
                  ${hasUnread ? "glass-living" : ""}
                `}
                style={{
                  background: hasUnread ? undefined : "var(--c-glass)",
                  border: hasUnread ? undefined : "1px solid var(--c-border)",
                  borderRadius: "20px",
                }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`
                    w-14 h-14 rounded-full overflow-hidden flex items-center justify-center
                    ${hasUnread ? "ring-2 ring-[var(--c-accent)]/50" : "ring-1 ring-[var(--c-border)]"}
                    transition-all duration-300 relative
                  `}
                    style={{ background: "var(--c-card)" }}
                  >
                    {conv.otherAnimal.photo_url ? (
                      <Image
                        src={conv.otherAnimal.photo_url}
                        alt={conv.otherAnimal.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <span className="text-2xl">{EMOJI_MAP[conv.otherAnimal.species] || "🐾"}</span>
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <PresenceDot isOnline={isOnline} size="sm" />
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`text-sm truncate ${hasUnread ? "font-bold text-[var(--c-text)]" : "font-semibold text-[var(--c-text)]"}`}>
                      {conv.otherAnimal.name}
                      <span className="text-[var(--c-text-muted)] font-normal ml-1.5 text-xs">
                        &amp; {conv.myAnimalName}
                      </span>
                    </h3>
                    <span className={`text-[11px] flex-shrink-0 ml-2 ${hasUnread ? "text-[var(--c-accent)] font-semibold" : "text-[var(--c-text-muted)]"}`}>
                      {conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate pr-2 ${hasUnread ? "text-[var(--c-text)] font-medium" : "text-[var(--c-text-muted)]"}`}>
                      {isFromMe && conv.lastMessage && (
                        <span className="text-[var(--c-text-muted)] mr-1">{t.msgYou || "Toi"} :</span>
                      )}
                      {preview}
                    </p>
                    {hasUnread && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: "linear-gradient(135deg, var(--c-accent), #ef4444)" }}>
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-[var(--c-text-muted)] mt-0.5">
                    {conv.otherName}
                    {conv.otherAnimal.breed ? ` · ${conv.otherAnimal.breed}` : ""}
                  </p>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-[var(--c-text-muted)] flex-shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>

        {/* Empty state */}
        {conversations.length === 0 && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-6">
              <div className="text-7xl animate-pulse">💬</div>
              <div className="absolute -top-2 -right-3 text-2xl animate-float" style={{ animationDelay: "0.5s" }}>🐾</div>
              <div className="absolute -bottom-1 -left-3 text-xl animate-float" style={{ animationDelay: "1s" }}>✨</div>
            </div>
            <h2 className="text-xl font-bold text-[var(--c-text)] mb-2">
              {t.msgEmpty || "Pas encore de discussions"}
            </h2>
            <p className="text-[var(--c-text-muted)] text-sm max-w-xs mx-auto mb-4">
              {t.msgEmptyHint || "Ecris a tes matchs confirmes pour commencer a discuter !"}
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link href="/matches" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--c-accent)] to-amber-500 text-white font-bold rounded-full shadow-lg transition-all hover:scale-105 active:scale-95">
                <span>💬</span>
                {t.msgGoToMatches || "Voir mes matchs"}
              </Link>
              <Link href="/flairer" className="text-xs text-[var(--c-text-muted)] hover:text-[var(--c-accent)] transition-colors">
                {t.msgOrDiscover || "ou decouvrir de nouveaux profils"}
              </Link>
            </div>
          </div>
        )}

        {/* Search empty */}
        {conversations.length > 0 && filtered.length === 0 && search.trim() && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-[var(--c-text-muted)] text-sm">
              {t.msgNoResults || "Aucune discussion trouvee"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
