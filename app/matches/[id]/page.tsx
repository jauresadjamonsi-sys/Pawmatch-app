"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { getMessages, sendMessageWithLimit, sendImageMessage, sendVoiceMessage, markAsRead, MessageRow } from "@/lib/services/messages";
import { useRealtimeMessages } from "@/lib/hooks/useRealtimeMessages";
import { useTypingIndicator } from "@/lib/hooks/useTypingIndicator";
import { useRealtimePresence } from "@/lib/hooks/useRealtimePresence";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import BlockReportModal from "@/lib/components/BlockReportModal";
import PresenceDot from "@/lib/components/PresenceDot";
import VoiceRecorder, { getFileExtension, getSupportedMimeType } from "@/lib/components/VoiceRecorder";
import VoiceMessage from "@/lib/components/VoiceMessage";
import { EMOJI_MAP } from "@/lib/constants";
import ImageCropper from "@/lib/components/ImageCropper";

// ──────────────────────────────────────────────────
// Static suggestion helpers (unchanged)
// ──────────────────────────────────────────────────
function getStaticSuggestions(messages: MessageRow[], myAnimalName: string, theirAnimalName: string, profileId: string) {
  if (messages.length === 0) {
    return [
      `Salut ! ${myAnimalName} aimerait rencontrer ${theirAnimalName} 🐾`,
      `Bonjour ! On pourrait organiser une balade ?`,
      `Hello ! Où êtes-vous basé ?`,
    ];
  }
  const last = messages[messages.length - 1];
  const lastIsMe = last.sender_id === profileId;
  const lastText = last.content.toLowerCase();

  if (!lastIsMe) {
    if (lastText.includes("balade") || lastText.includes("sortie") || lastText.includes("rencontre")) {
      return ["Oui avec plaisir !", "Ce week-end ça vous va ?", "Quel endroit vous propose ?"];
    }
    if (lastText.includes("quand") || lastText.includes("disponible") || lastText.includes("heure")) {
      return ["Samedi matin !", "Dimanche après-midi ?", "En semaine c'est possible aussi"];
    }
    if (lastText.includes("où") || lastText.includes("endroit") || lastText.includes("lieu")) {
      return ["Au parc du coin ?", "On peut se retrouver à mi-chemin", "Vous connaissez un bon spot ?"];
    }
    if (lastText.includes("super") || lastText.includes("parfait") || lastText.includes("top")) {
      return ["Super, à bientôt !", "Hâte de voir leurs retrouvailles 🐾", "On confirme par ici ?"];
    }
    return ["Super idée !", "Avec plaisir 😊", "On s'organise comment ?"];
  }

  return ["On se retrouve où ?", "Quelle heure vous convient ?", `${theirAnimalName} est sociable ?`];
}

async function fetchAISuggestions(
  messages: MessageRow[],
  myAnimalName: string,
  theirAnimalName: string,
  mySpecies: string,
  theirSpecies: string,
  profileId: string
): Promise<string[]> {
  try {
    const response = await fetch("/api/chat/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.slice(-6),
        myAnimalName,
        theirAnimalName,
        mySpecies,
        theirSpecies,
        profileId,
      }),
    });

    const data = await response.json();
    if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
      return data.suggestions.slice(0, 3);
    }
  } catch (err) {
    console.error("[Conversation] Failed to fetch message suggestions:", err);
  }
  return [];
}

// ──────────────────────────────────────────────────
// Main conversation page
// ──────────────────────────────────────────────────
export default function ConversationPage() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [match, setMatch] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [showBlockReport, setShowBlockReport] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [localReactions, setLocalReactions] = useState<Record<string, { emoji: string; userId: string }[]>>({});
  const [voiceToast, setVoiceToast] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const params = useParams();
  const matchId = params.id as string;
  const supabase = createClient();
  const { profile } = useAuth();

  // ── Derived values (must come before hooks for rules-of-hooks) ──
  const otherUserIdEarly = match
    ? (match.sender_user_id === profile?.id ? match.receiver_user_id : match.sender_user_id)
    : null;

  // ── Realtime Presence (replaces useOnlineStatus polling) ──
  const { onlineMap: chatOnlineMap } = useRealtimePresence(
    profile?.id ?? null,
    otherUserIdEarly ? [otherUserIdEarly] : []
  );

  // ── Realtime Typing (replaces REST polling piggybacked on fetchMessages) ──
  const { isOtherTyping, sendTyping } = useTypingIndicator(matchId, profile?.id ?? null);

  // ── Fetch messages once on mount ──
  const fetchAllMessages = useCallback(async () => {
    const result = await getMessages(supabase, matchId);
    if (result.data) {
      setMessages(result.data);
      if (profile) await markAsRead(supabase, matchId, profile.id);
    }
  }, [matchId, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime Messages (replaces setInterval polling) ──
  useRealtimeMessages(matchId, {
    onNewMessage: useCallback(
      (msg: MessageRow) => {
        setMessages((prev) => {
          // Guard against duplicates (e.g. optimistic + realtime race)
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Auto-mark as read if the message is from the other person
        if (profile && msg.sender_id !== profile.id) {
          markAsRead(supabase, matchId, profile.id).catch(() => {});
        }
        setReconnecting(false);
      },
      [matchId, profile?.id] // eslint-disable-line react-hooks/exhaustive-deps
    ),
    onReconnect: useCallback(() => {
      // Channel reconnected after a drop -- re-fetch all messages to fill any gap
      setReconnecting(true);
      fetchAllMessages().finally(() => setReconnecting(false));
    }, [fetchAllMessages]),
  });

  // ── Fetch match metadata and initial messages ──
  useEffect(() => {
    if (profile) {
      fetchMatch();
      fetchAllMessages();
    }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchMatch() {
    const { data } = await supabase
      .from("matches")
      .select(`*, sender_animal:sender_animal_id(id,name,species,breed,photo_url), receiver_animal:receiver_animal_id(id,name,species,breed,photo_url), sender_profile:sender_user_id(id,full_name,email), receiver_profile:receiver_user_id(id,full_name,email)`)
      .eq("id", matchId)
      .single();
    setMatch(data);
    setLoading(false);
  }

  // ── Photo upload with crop ──
  const [chatCropFile, setChatCropFile] = useState<File | null>(null);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image trop volumineuse (max 5 Mo)");
      return;
    }
    setChatCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleChatCropConfirm(blob: Blob) {
    setChatCropFile(null);
    if (!profile) return;
    setUploadingPhoto(true);
    setError(null);

    try {
      const path = `${matchId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const file = new File([blob], "chat-photo.jpg", { type: "image/jpeg" });

      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setError("Erreur upload: " + uploadError.message);
        setUploadingPhoto(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);

      const result = await sendImageMessage(
        supabase, matchId, profile.id, urlData.publicUrl, profile.subscription || "free"
      );

      if (result.error) {
        setError(result.error);
      }
    } catch {
      setError("Erreur inattendue lors de l'envoi de la photo.");
    }

    setUploadingPhoto(false);
  }

  // ── Voice upload ──
  async function handleVoiceComplete(blob: Blob) {
    if (!profile) return;
    setIsRecordingVoice(false);
    setUploadingVoice(true);
    setError(null);

    try {
      const mimeType = getSupportedMimeType();
      const ext = getFileExtension(mimeType);
      const path = `voice/${matchId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("voice-messages")
        .upload(path, blob, { cacheControl: "3600", upsert: false, contentType: mimeType });

      if (uploadError) {
        setError("Erreur upload vocal: " + uploadError.message);
        setUploadingVoice(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("voice-messages").getPublicUrl(path);

      const result = await sendVoiceMessage(
        supabase, matchId, profile.id, urlData.publicUrl, profile.subscription || "free"
      );

      if (result.error) {
        setError(result.error);
      }
      // No need to fetchMessages -- realtime will push the new message
    } catch {
      setError("Erreur inattendue lors de l'envoi du message vocal.");
    }

    setUploadingVoice(false);
  }

  // ── Smart suggestions ──
  useEffect(() => {
    if (!match || !profile) return;
    const isMe = match.sender_user_id === profile.id;
    const myAnimal = isMe ? match.sender_animal : match.receiver_animal;
    const theirAnimal = isMe ? match.receiver_animal : match.sender_animal;

    const staticSuggestions = getStaticSuggestions(messages, myAnimal.name, theirAnimal.name, profile.id);
    setSuggestions(staticSuggestions);
    setAiReady(false);

    setLoadingAI(true);
    fetchAISuggestions(messages, myAnimal.name, theirAnimal.name, myAnimal.species, theirAnimal.species, profile.id)
      .then(aiSuggestions => {
        if (aiSuggestions.length > 0) {
          setSuggestions(aiSuggestions);
          setAiReady(true);
        }
      })
      .finally(() => setLoadingAI(false));
  }, [messages.length, match, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll on new messages or typing indicator ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  // ── Send message ──
  async function handleSend(text?: string) {
    const content = text || newMessage;
    if (!content.trim() || !profile) return;
    setSending(true);
    setError(null);

    const result = await sendMessageWithLimit(
      supabase, matchId, profile.id, content, profile.subscription || "free"
    );

    if (result.error) {
      setError(result.error);
    } else {
      setNewMessage("");
      // Realtime will deliver the message, but we also optimistically add it
      // to avoid a visible delay if the realtime event is slightly slow
      if (result.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === result.data!.id)) return prev;
          return [...prev, result.data!];
        });
      }
    }
    setSending(false);
    inputRef.current?.focus();
  }

  function handleSuggestionTap(suggestion: string) {
    handleSend(suggestion);
  }

  // ── Message reactions (local-only for now) ──
  const REACTION_EMOJIS = ["\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDE2E", "\uD83D\uDE22", "\uD83D\uDC4D", "\uD83D\uDC3E"];

  function handleReactionSelect(msgId: string, emoji: string) {
    if (!profile) return;
    setLocalReactions((prev) => {
      const existing = prev[msgId] || [];
      const alreadyReacted = existing.find((r) => r.userId === profile.id && r.emoji === emoji);
      if (alreadyReacted) {
        // Toggle off if same emoji
        return { ...prev, [msgId]: existing.filter((r) => !(r.userId === profile.id && r.emoji === emoji)) };
      }
      // Remove any previous reaction from this user, add new one
      const filtered = existing.filter((r) => r.userId !== profile.id);
      return { ...prev, [msgId]: [...filtered, { emoji, userId: profile.id }] };
    });
    setReactionPickerMsgId(null);
  }

  function getReactionCounts(msgId: string): { emoji: string; count: number; isMine: boolean }[] {
    const reactions = localReactions[msgId] || [];
    const map = new Map<string, { count: number; isMine: boolean }>();
    for (const r of reactions) {
      const entry = map.get(r.emoji) || { count: 0, isMine: false };
      entry.count++;
      if (r.userId === profile?.id) entry.isMine = true;
      map.set(r.emoji, entry);
    }
    return Array.from(map.entries()).map(([emoji, data]) => ({ emoji, ...data }));
  }

  function handleMsgTouchStart(msgId: string) {
    longPressTimer.current = setTimeout(() => {
      setReactionPickerMsgId(msgId);
    }, 500);
  }

  function handleMsgTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleMsgDoubleClick(msgId: string) {
    setReactionPickerMsgId((prev) => (prev === msgId ? null : msgId));
  }

  // ── Dismiss reaction picker on outside click ──
  useEffect(() => {
    if (!reactionPickerMsgId) return;
    function handleClick() { setReactionPickerMsgId(null); }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [reactionPickerMsgId]);

  // ── Voice toast auto-dismiss ──
  useEffect(() => {
    if (!voiceToast) return;
    const t = setTimeout(() => setVoiceToast(false), 2500);
    return () => clearTimeout(t);
  }, [voiceToast]);

  // ── Loading state ──
  if (loading) return (
    <div className="min-h-screen bg-[var(--c-deep)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[var(--c-text-muted)] text-sm">Chargement...</p>
      </div>
    </div>
  );

  if (!match || match.status !== "accepted") {
    return (
      <div className="min-h-screen bg-[var(--c-deep)] flex items-center justify-center">
        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5 md:p-8 text-center w-full max-w-sm md:max-w-md mx-4">
          <h2 className="text-xl font-bold text-[var(--c-text)] mb-2">Conversation indisponible</h2>
          <p className="text-[var(--c-text-muted)]">Ce match n'existe pas ou n'a pas encore été accepté.</p>
          <Link href="/matches" className="inline-block mt-4 text-amber-500 font-medium">← Retour</Link>
        </div>
      </div>
    );
  }

  const isMe = match.sender_user_id === profile?.id;
  const otherProfile = isMe ? match.receiver_profile : match.sender_profile;
  const otherUserId = isMe ? match.receiver_user_id : match.sender_user_id;
  const myAnimal = isMe ? match.sender_animal : match.receiver_animal;
  const theirAnimal = isMe ? match.receiver_animal : match.sender_animal;
  const isOtherOnline = chatOnlineMap.get(otherUserId) ?? false;

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString("fr-CH", { day: "numeric", month: "short" }) + " " + date.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-screen bg-[var(--c-deep)] flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes suggestionIn {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .suggestion-chip { animation: suggestionIn 0.3s ease-out forwards; }
        .shimmer-bg {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes bounce-dot {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        .typing-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--c-text-muted, #9ca3af); display: inline-block;
          animation: bounce-dot 1.2s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .typing-indicator-enter { animation: fadeSlideIn 0.2s ease-out forwards; }
        @keyframes reconnectPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .reconnect-banner { animation: reconnectPulse 1.5s ease-in-out infinite; }
        @keyframes reactionPickerIn {
          from { opacity: 0; transform: scale(0.8) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .reaction-picker-enter { animation: reactionPickerIn 0.18s ease-out forwards; }
        @keyframes reactionBadgePop {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .reaction-badge-pop { animation: reactionBadgePop 0.25s ease-out forwards; }
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .toast-enter { animation: toastSlideUp 0.25s ease-out forwards; }
        .toast-exit { animation: toastFadeOut 0.3s ease-in forwards; }
      `}} />

      {/* Header */}
      <div className="backdrop-blur-xl border-b border-[var(--c-border)] px-4 py-3 sticky top-0 z-10" style={{ background: "var(--c-deep)" }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/matches" className="text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link href={"/animals/" + theirAnimal.id} className="w-9 h-9 rounded-full bg-[var(--c-card)] border border-amber-500/30 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
            {theirAnimal.photo_url
              ? <Image src={theirAnimal.photo_url} alt={theirAnimal.name} fill className="object-cover" sizes="(max-width: 768px) 36px, 36px" />
              : <span className="text-base">{EMOJI_MAP[theirAnimal.species] || "🐾"}</span>}
          </Link>
          <Link href={"/animals/" + theirAnimal.id} className="flex-1 min-w-0 no-underline">
            <p className="font-semibold text-[var(--c-text)] text-sm truncate hover:text-amber-400 transition">
              {otherProfile.full_name || otherProfile.email}
            </p>
            <p className="text-xs text-[var(--c-text-muted)]">
              {theirAnimal.name} x {myAnimal.name}
              {isOtherTyping && (
                <span className="ml-1.5 text-[var(--c-accent,#F59E0B)]">
                  -- est en train d'ecrire...
                </span>
              )}
            </p>
          </Link>
          <PresenceDot isOnline={isOtherOnline} size="sm" />
          <Link
            href={`/matches/${matchId}/call`}
            className="p-1.5 rounded-full hover:bg-amber-500/10 transition flex-shrink-0"
            title="Appel video"
          >
            <svg className="w-4.5 h-4.5 text-[var(--c-accent,#F59E0B)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </Link>
          <button
            onClick={() => setShowBlockReport(true)}
            className="p-1.5 rounded-full hover:bg-red-500/10 transition flex-shrink-0"
            title="Signaler ou bloquer"
          >
            <svg className="w-4.5 h-4.5 text-[var(--c-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Reconnection banner */}
      {reconnecting && (
        <div className="reconnect-banner bg-[var(--c-accent,#F59E0B)]/10 border-b border-[var(--c-accent,#F59E0B)]/20 px-4 py-1.5 text-center">
          <p className="text-xs text-[var(--c-accent,#F59E0B)] font-medium">
            Reconnexion en cours...
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Code de conduite — toujours visible en haut */}
          <div className="glass rounded-2xl p-4 mb-4 text-center" style={{ borderLeft: "3px solid var(--c-accent, #F59E0B)" }}>
            <p className="text-sm font-semibold text-[var(--c-text)] mb-2">{"🐾"} Charte de bienveillance Pawly</p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[var(--c-text-muted)]">
              <span>{"🤝"} Respect mutuel</span>
              <span>{"🐶"} Bien-etre animal prioritaire</span>
              <span>{"📍"} Rencontres en lieux publics</span>
              <span>{"🚫"} Aucune violence toleree</span>
            </div>
            <p className="text-[10px] text-[var(--c-text-muted)] mt-2 opacity-70">
              En cas de probleme, utilisez le bouton signaler ci-dessus
            </p>
          </div>

          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🐾</div>
              <p className="text-[var(--c-text)] font-semibold">C'est un match !</p>
              <p className="text-[var(--c-text-muted)] text-sm mt-1">
                {myAnimal.name} et {theirAnimal.name} n'attendent que vous
              </p>
              <p className="text-[var(--c-text-muted)] text-xs mt-3 max-w-xs mx-auto">
                Commencez par vous presenter et proposer une balade dans un endroit sympa pour vos compagnons !
              </p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMine = msg.sender_id === profile?.id;
            const prevMsg = messages[i - 1];
            const showTime = !prevMsg || new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000;
            const isVoice = msg.content === "\uD83C\uDF99\uFE0F Message vocal" && msg.image_url && (msg.image_url.endsWith(".webm") || msg.image_url.endsWith(".m4a") || msg.image_url.endsWith(".ogg"));
            const isImage = msg.image_url && !isVoice;
            const msgReactions = getReactionCounts(msg.id);

            return (
              <div key={msg.id}>
                {showTime && (
                  <p className="text-center text-[10px] text-[var(--c-text-muted)] my-2">{formatTime(msg.created_at)}</p>
                )}
                <div className={"flex " + (isMine ? "justify-end" : "justify-start")}>
                  <div className="relative max-w-[85%] sm:max-w-[70%]">
                    {/* Message bubble with reaction touch/click handlers */}
                    <div
                      className={"rounded-2xl text-sm select-none " +
                        (isMine
                          ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-br-md"
                          : "bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text)] rounded-bl-md") +
                        (isImage ? " p-1.5" : isVoice ? " p-0.5" : " px-4 py-2.5")}
                      onDoubleClick={() => handleMsgDoubleClick(msg.id)}
                      onTouchStart={() => handleMsgTouchStart(msg.id)}
                      onTouchEnd={handleMsgTouchEnd}
                      onTouchMove={handleMsgTouchEnd}
                    >
                      {isVoice ? (
                        <VoiceMessage audioUrl={msg.image_url!} isMine={isMine} />
                      ) : isImage ? (
                        <div>
                          <div className="relative max-w-full" style={{ maxHeight: 240 }}>
                            <Image
                              src={msg.image_url!}
                              alt="Photo"
                              width={300}
                              height={240}
                              className="rounded-xl object-cover cursor-pointer hover:opacity-90 transition"
                              onClick={() => setExpandedImage(msg.image_url)}
                              sizes="(max-width: 768px) 250px, 300px"
                            />
                          </div>
                          {msg.content && msg.content !== "\uD83D\uDCF7 Photo" && (
                            <p className="whitespace-pre-wrap leading-relaxed px-2.5 py-1.5 text-sm">{msg.content}</p>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      )}
                      {/* Read receipts for own messages */}
                      {isMine && (
                        <div className={"flex justify-end mt-0.5 " + (isImage ? "px-2 pb-1" : isVoice ? "px-3 pb-1" : "")}>
                          <span className={"text-[10px] font-medium " + (msg.read_at ? "text-blue-300" : "text-white/40")}>
                            {msg.read_at ? "\u2713\u2713" : "\u2713"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Reaction badges below the bubble */}
                    {msgReactions.length > 0 && (
                      <div className={"flex gap-1 mt-0.5 " + (isMine ? "justify-end pr-1" : "justify-start pl-1")}>
                        {msgReactions.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => handleReactionSelect(msg.id, r.emoji)}
                            className={"reaction-badge-pop inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition " +
                              (r.isMine
                                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                : "bg-[var(--c-card)] border-[var(--c-border)] text-[var(--c-text-muted)]")}
                          >
                            <span>{r.emoji}</span>
                            {r.count > 1 && <span className="text-[10px]">{r.count}</span>}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Reaction picker overlay */}
                    {reactionPickerMsgId === msg.id && (
                      <div
                        className={"reaction-picker-enter absolute z-20 " +
                          (isMine ? "right-0" : "left-0") +
                          " -top-11"}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-[var(--c-card)] border border-[var(--c-border)] rounded-full shadow-lg">
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReactionSelect(msg.id, emoji)}
                              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[var(--c-bg)] rounded-full transition active:scale-125"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isOtherTyping && (
            <div className="flex justify-start typing-indicator-enter">
              <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Smart suggestions */}
      <div className="px-4 pb-2 max-w-3xl mx-auto w-full">
        {suggestions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {loadingAI && !aiReady && (
              <div className="flex-shrink-0 h-8 w-24 shimmer-bg rounded-full" />
            )}
            {suggestions.map((s, i) => (
              <button
                key={s + i}
                onClick={() => handleSuggestionTap(s)}
                disabled={sending}
                className="suggestion-chip flex-shrink-0 px-3 py-1.5 bg-[var(--c-card)] border border-[var(--c-border)] hover:border-amber-500/40 hover:bg-amber-500/10 text-[var(--c-text-muted)] hover:text-[var(--c-text)] rounded-full text-xs transition-all duration-150 active:scale-95 whitespace-nowrap"
                style={{ animationDelay: i * 0.05 + "s" }}>
                {aiReady && i === 0 && <span className="mr-1 text-amber-400">✦</span>}
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="backdrop-blur-xl border-t border-[var(--c-border)] px-4 py-3 safe-area-bottom" style={{ background: "var(--c-deep)" }}>
        <div className="max-w-3xl mx-auto">
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          {uploadingVoice && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-[var(--c-text-muted)] text-xs">Envoi du message vocal...</span>
            </div>
          )}
          <div className="flex gap-2 items-end">
            {/* Hidden file input for photo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {isRecordingVoice ? (
              /* Voice recorder replaces text input when recording */
              <VoiceRecorder
                onRecordingComplete={handleVoiceComplete}
                onCancel={() => setIsRecordingVoice(false)}
              />
            ) : (
              <>
                {/* Photo button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto || uploadingVoice}
                  className="w-10 h-10 bg-[var(--c-card)] border border-[var(--c-border)] hover:border-amber-500/30 hover:bg-amber-500/10 rounded-2xl flex items-center justify-center transition active:scale-95 flex-shrink-0"
                  title="Envoyer une photo"
                >
                  {uploadingPhoto
                    ? <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    : <svg className="w-4.5 h-4.5 text-[var(--c-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                      </svg>}
                </button>
                {/* Emoji picker button */}
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={"w-10 h-10 border rounded-2xl flex items-center justify-center transition active:scale-95 flex-shrink-0 " + (showEmojiPicker ? "bg-amber-500/10 border-amber-500/40" : "bg-[var(--c-card)] border-[var(--c-border)] hover:border-amber-500/30 hover:bg-amber-500/10")}
                    title="Emojis animaux"
                  >
                    <span className="text-lg">🐾</span>
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-72 bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl shadow-xl p-3 z-30" onClick={(e) => e.stopPropagation()}>
                      <p className="text-[10px] font-semibold text-[var(--c-text-muted)] mb-2 uppercase tracking-wide">Animaux</p>
                      <div className="grid grid-cols-8 gap-1 mb-2">
                        {["🐶","🐕","🦮","🐕‍🦺","🐩","🐺","🐱","🐈","🐈‍⬛","🦁","🐯","🐅","🐆","🐴","🦄","🐎","🐮","🐂","🐃","🐄","🐷","🐖","🐗","🐏","🐑","🐐","🐪","🐫","🦙","🦒","🐘","🦏","🦛","🐭","🐁","🐀","🐹","🐰","🐇","🐿️","🦔","🦇","🐻","🐻‍❄️","🐨","🐼","🦥","🦦","🦨","🦘","🦡"].map(e => (
                          <button key={e} type="button" onClick={() => { setNewMessage(prev => prev + e); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-[var(--c-bg)] rounded-lg transition active:scale-110">{e}</button>
                        ))}
                      </div>
                      <p className="text-[10px] font-semibold text-[var(--c-text-muted)] mb-2 uppercase tracking-wide">Oiseaux & mer</p>
                      <div className="grid grid-cols-8 gap-1 mb-2">
                        {["🐦","🐦‍⬛","🐧","🐔","🐓","🐣","🐤","🐥","🦆","🦅","🦉","🦜","🪶","🦩","🕊️","🐸","🐊","🐢","🦎","🐍","🐉","🐲","🦕","🐟","🐠","🐡","🦈","🐙","🐚","🐬","🐳","🐋","🦭","🦞","🦀","🦑"].map(e => (
                          <button key={e} type="button" onClick={() => { setNewMessage(prev => prev + e); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-[var(--c-bg)] rounded-lg transition active:scale-110">{e}</button>
                        ))}
                      </div>
                      <p className="text-[10px] font-semibold text-[var(--c-text-muted)] mb-2 uppercase tracking-wide">Insectes & nature</p>
                      <div className="grid grid-cols-8 gap-1">
                        {["🐛","🦋","🐌","🐞","🐜","🪲","🪳","🦗","🕷️","🦂","🐝","🪰","🌿","🌱","🍀","🌸","🌺","🌻","🌾","🪴","❤️","🧡","💛","💚","💙","💜","🤎","🖤","💕","💖"].map(e => (
                          <button key={e} type="button" onClick={() => { setNewMessage(prev => prev + e); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-[var(--c-bg)] rounded-lg transition active:scale-110">{e}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); sendTyping(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  onFocus={() => setShowEmojiPicker(false)}
                  placeholder="Message..."
                  maxLength={2000}
                  className="flex-1 px-4 py-2.5 bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/30 outline-none text-sm transition"
                />
                {/* Mic button - show when no text typed */}
                {!newMessage.trim() ? (
                  <button
                    onClick={() => setIsRecordingVoice(true)}
                    disabled={uploadingVoice || uploadingPhoto}
                    className="w-10 h-10 bg-[var(--c-card)] border border-[var(--c-border)] hover:border-amber-500/30 hover:bg-amber-500/10 rounded-2xl flex items-center justify-center transition active:scale-95 flex-shrink-0"
                    title="Message vocal"
                  >
                    <svg className="w-4.5 h-4.5 text-[var(--c-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend()}
                    disabled={sending || !newMessage.trim()}
                    className="w-10 h-10 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 rounded-2xl flex items-center justify-center transition active:scale-95 flex-shrink-0">
                    {sending
                      ? <div className="w-4 h-4 border-2 border-[var(--c-border)] border-t-white rounded-full animate-spin" />
                      : <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-light"
            onClick={() => setExpandedImage(null)}
          >
            &#10005;
          </button>
          <Image
            src={expandedImage}
            alt="Photo agrandie"
            width={800}
            height={800}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
            sizes="90vw"
          />
        </div>
      )}

      {/* Block/Report modal */}
      {showBlockReport && otherProfile && (
        <BlockReportModal
          targetUserId={otherProfile.id}
          targetAnimalId={theirAnimal?.id}
          targetName={otherProfile.full_name || otherProfile.email || "Utilisateur"}
          onClose={() => setShowBlockReport(false)}
          onBlocked={() => { window.location.href = "/matches"; }}
        />
      )}

      {/* Chat image crop modal */}
      {chatCropFile && (
        <ImageCropper
          file={chatCropFile}
          aspectRatio={4 / 3}
          outputWidth={1024}
          title="Recadrer la photo"
          onConfirm={handleChatCropConfirm}
          onCancel={() => setChatCropFile(null)}
        />
      )}

      {/* Voice coming-soon toast */}
      {voiceToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 toast-enter">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl shadow-xl">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <span className="text-sm text-[var(--c-text)]">Bientot disponible</span>
          </div>
        </div>
      )}
    </div>
  );
}
