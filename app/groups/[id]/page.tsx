"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { CANTONS } from "@/lib/cantons";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Group = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  canton: string | null;
  species: string | null;
  icon: string | null;
  created_by: string;
  created_at: string;
  member_count: number;
};

type Member = {
  user_id: string;
  joined_at: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

const CATEGORY_ICONS: Record<string, string> = {
  Race: "🐾",
  Canton: "🏔️",
  Activite: "🎾",
  Autre: "✨",
};

export default function GroupDetailPage() {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);

  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = createClient();
  const groupId = params.id as string;

  useEffect(() => {
    fetchGroup();
  }, [groupId, profile]);

  async function fetchGroup() {
    setLoading(true);
    try {
      // Fetch group data
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (groupError || !groupData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setGroup(groupData);

      // Fetch members with profile joins
      const { data: membersData } = await supabase
        .from("group_members")
        .select("user_id, joined_at, profile:profiles(id, full_name, avatar_url)")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: false });

      setMembers((membersData as unknown as Member[]) || []);

      // Check if current user is a member
      if (profile) {
        const { data: membership } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", groupId)
          .eq("user_id", profile.id)
          .maybeSingle();

        setIsMember(!!membership);
      }
    } catch (err) {
      console.error("[GroupDetail] fetch error:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinLeave() {
    if (!profile) {
      router.push("/login");
      return;
    }
    setJoining(true);

    try {
      if (isMember) {
        await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", profile.id);

        if (group) {
          await supabase
            .from("groups")
            .update({ member_count: Math.max(0, group.member_count - 1) })
            .eq("id", groupId);
        }
      } else {
        await supabase
          .from("group_members")
          .insert({ group_id: groupId, user_id: profile.id });

        if (group) {
          await supabase
            .from("groups")
            .update({ member_count: group.member_count + 1 })
            .eq("id", groupId);
        }
      }

      await fetchGroup();
    } catch (err) {
      console.error("[GroupDetail] join/leave error:", err);
    } finally {
      setJoining(false);
    }
  }

  async function handleShare() {
    if (!group) return;
    const url = `${window.location.origin}/groups/${group.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: group.name,
          text: group.description || `Rejoins le groupe ${group.name} sur Pawly !`,
          url,
        });
      } catch {
        // User cancelled or share not supported
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Lien copie !");
    }
  }

  const cantonName = group?.canton
    ? CANTONS.find((c) => c.code === group.canton)?.name || group.canton
    : null;

  // ---------- Loading state ----------
  if (loading) {
    return (
      <main className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            <p className="text-[var(--c-text-muted)] text-sm">Chargement...</p>
          </div>
        </div>
      </main>
    );
  }

  // ---------- 404 state ----------
  if (notFound || !group) {
    return (
      <main className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="glass-strong rounded-2xl p-10 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h1 className="text-xl font-bold text-[var(--c-text)] mb-2">
              Groupe introuvable
            </h1>
            <p className="text-[var(--c-text-muted)] text-sm mb-6">
              Ce groupe n&apos;existe pas ou a ete supprime.
            </p>
            <Link
              href="/groups"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              Retour aux groupes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ---------- Main content ----------
  return (
    <main className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition-colors mb-6"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Retour aux groupes
        </Link>

        {/* ══ Header card ══ */}
        <div className="glass-strong rounded-2xl p-6 border border-[var(--c-border)] mb-6">
          <div className="flex items-start gap-4">
            {/* Group icon */}
            <div className="w-16 h-16 rounded-2xl bg-[var(--c-glass)] flex items-center justify-center text-3xl shrink-0">
              {group.icon || CATEGORY_ICONS[group.category] || "🐾"}
            </div>

            {/* Group info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold gradient-text-warm mb-1">
                {group.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--c-glass)] text-[var(--c-text-muted)] font-medium">
                  {CATEGORY_ICONS[group.category] || ""} {group.category}
                </span>
                <span className="text-xs text-[var(--c-text-muted)]">
                  {group.member_count}{" "}
                  {group.member_count === 1 ? "membre" : "membres"}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {group.description && (
            <p className="mt-4 text-sm text-[var(--c-text-muted)] leading-relaxed">
              {group.description}
            </p>
          )}

          {/* Canton badge */}
          {cantonName && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[var(--c-glass)] text-[var(--c-text-muted)]">
              <span>📍</span>
              <span>{cantonName}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-3">
            {/* Join / Leave */}
            <button
              onClick={handleJoinLeave}
              disabled={joining}
              className={
                "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all " +
                (isMember
                  ? "border border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-red-400/50 hover:text-red-400 hover:bg-red-500/10"
                  : "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/15 hover:shadow-orange-500/30")
              }
            >
              {joining ? "..." : isMember ? "Quitter" : "Rejoindre"}
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border border-[var(--c-border)] text-[var(--c-text-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-glass)] transition-all flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                />
              </svg>
              Partager ce groupe
            </button>
          </div>
        </div>

        {/* ══ Members section ══ */}
        <div className="glass-strong rounded-2xl p-6 border border-[var(--c-border)]">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-4">
            Membres ({members.length})
          </h2>

          {members.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-sm text-[var(--c-text-muted)]">
                Aucun membre pour l&apos;instant. Sois le premier a rejoindre !
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {members.map((member) => {
                const name =
                  member.profile?.full_name || "Utilisateur";
                const avatar = member.profile?.avatar_url;

                return (
                  <Link
                    key={member.user_id}
                    href={`/profile/${member.user_id}`}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[var(--c-border)] group-hover:border-orange-500/50 transition-colors bg-[var(--c-glass)]">
                      {avatar ? (
                        <Image
                          src={avatar}
                          alt={name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg text-[var(--c-text-muted)]">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-[var(--c-text-muted)] text-center line-clamp-1 group-hover:text-[var(--c-text)] transition-colors">
                      {name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
