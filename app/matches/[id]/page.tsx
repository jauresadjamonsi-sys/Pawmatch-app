"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { getMessages, sendMessageWithLimit, sendImageMessage, markAsRead, MessageRow } from "@/lib/services/messages";
import { useParams } from "next/navigation";
import Link from "next/link";
import BlockReportModal from "@/lib/components/BlockReportModal";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import PresenceDot from "@/lib/components/PresenceDot";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

// Suggestions statiques par contexte (fallback + instantané)
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
  } catch {}
  return [];
}

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
  const [otherTyping, setOtherTyping] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSent = useRef<number>(0);
  const params = useParams();
  const supabase = createClient();
  const { profile } = useAuth();

  // Compute other user ID early (before early returns) for hooks rule compliance
  const otherUserIdEarly = match
    ? (match.sender_user_id === profile?.id ? match.receiver_user_id : match.sender_user_id)
    : null;
  const { onlineMap: chatOnlineMap } = useOnlineStatus(otherUserIdEarly ? [otherUserIdEarly] : []);

  useEffect(() => {
    if (profile) {
      fetchMatch();
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [profile]);

  async function fetchMatch() {
    const { data } = await supabase
      .from("matches")
      .select(`*, sender_animal:sender_animal_id(id,name,species,breed,photo_url), receiver_animal:receiver_animal_id(id,name,species,breed,photo_url), sender_profile:sender_user_id(id,full_name,email), receiver_profile:receiver_user_id(id,full_name,email)`)
      .eq("id", params.id)
      .single();
    setMatch(data);
    setLoading(false);
  }

  async function fetchMessages() {
    const matchId = params.id as string;
    const result = await getMessages(supabase, matchId);
    if (result.data) {
      setMessages(result.data);
      if (profile) await markAsRead(supabase, matchId, profile.id);
    }
    // Piggyback typing status on message poll
    try {
      const res = await fetch(`/api/chat/typing?match_id=${matchId}`);
      const data = await res.json();
      setOtherTyping(!!data.typing);
    } catch {
      // Silent
    }
  }

  async function notifyTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 3000) return;
    lastTypingSent.current = now;
    try {
      await fetch("/api/chat/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: params.id }),
      });
    } catch {
      // Silent
    }
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image trop volumineuse (max 5 Mo)");
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${params.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

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
        supabase, params.id as string, profile.id, urlData.publicUrl, profile.subscription || "free"
      );

      if (result.error) {
        setError(result.error);
      } else {
        fetchMessages();
      }
    } catch {
      setError("Erreur inattendue lors de l'envoi de la photo.");
    }

    setUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Charger suggestions statiques immédiatement, IA en arrière-plan
  useEffect(() => {
    if (!match || !profile) return;
    const isMe = match.sender_user_id === profile.id;
    const myAnimal = isMe ? match.sender_animal : match.receiver_animal;
    const theirAnimal = isMe ? match.receiver_animal : match.sender_animal;

    // Statique instantané
    const staticSuggestions = getStaticSuggestions(messages, myAnimal.name, theirAnimal.name, profile.id);
    setSuggestions(staticSuggestions);
    setAiReady(false);

    // IA en arrière-plan
    setLoadingAI(true);
    fetchAISuggestions(messages, myAnimal.name, theirAnimal.name, myAnimal.species, theirAnimal.species, profile.id)
      .then(aiSuggestions => {
        if (aiSuggestions.length > 0) {
          setSuggestions(aiSuggestions);
          setAiReady(true);
        }
      })
      .finally(() => setLoadingAI(false));
  }, [messages.length, match, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text?: string) {
    const content = text || newMessage;
    if (!content.trim() || !profile) return;
    setSending(true);
    setError(null);

    const result = await sendMessageWithLimit(
      supabase, params.id as string, profile.id, content, profile.subscription || "free"
    );

    if (result.error) {
      setError(result.error);
    } else {
      setNewMessage("");
      fetchMessages();
    }
    setSending(false);
    inputRef.current?.focus();
  }

  function handleSuggestionTap(suggestion: string) {
    handleSend(suggestion);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#1a1225] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    </div>
  );

  if (!match || match.status !== "accepted") {
    return (
      <div className="min-h-screen bg-[#1a1225] flex items-center justify-center">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-white mb-2">Conversation indisponible</h2>
          <p className="text-gray-400">Ce match n'existe pas ou n'a pas encore été accepté.</p>
          <Link href="/matches" className="inline-block mt-4 text-orange-500 font-medium">← Retour</Link>
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
    <div className="min-h-screen bg-[#1a1225] flex flex-col">
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
          background: #9ca3af; display: inline-block;
          animation: bounce-dot 1.2s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
      `}} />

      {/* Header */}
      <div className="bg-[#1a1225]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/matches" className="text-gray-400 hover:text-white transition p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="w-9 h-9 rounded-full bg-[#241d33] border border-orange-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
            {theirAnimal.photo_url
              ? <img src={theirAnimal.photo_url} alt={theirAnimal.name} className="w-full h-full object-cover" />
              : <span className="text-base">{EMOJI_MAP[theirAnimal.species] || "🐾"}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm truncate">{otherProfile.full_name || otherProfile.email}</p>
            <p className="text-xs text-gray-500">{theirAnimal.name} × {myAnimal.name}</p>
          </div>
          <PresenceDot isOnline={isOtherOnline} size="sm" />
          <button
            onClick={() => setShowBlockReport(true)}
            className="p-1.5 rounded-full hover:bg-red-500/10 transition flex-shrink-0"
            title="Signaler ou bloquer"
          >
            <svg className="w-4.5 h-4.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-2">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🐾</div>
              <p className="text-white font-semibold">C'est un match !</p>
              <p className="text-gray-500 text-sm mt-1">
                {myAnimal.name} et {theirAnimal.name} n'attendent que vous
              </p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMine = msg.sender_id === profile?.id;
            const prevMsg = messages[i - 1];
            const showTime = !prevMsg || new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000;

            return (
              <div key={msg.id}>
                {showTime && (
                  <p className="text-center text-[10px] text-gray-600 my-2">{formatTime(msg.created_at)}</p>
                )}
                <div className={"flex " + (isMine ? "justify-end" : "justify-start")}>
                  <div className={"max-w-[75%] rounded-2xl text-sm " +
                    (isMine
                      ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-md"
                      : "bg-[#241d33] border border-white/8 text-gray-100 rounded-bl-md") +
                    (msg.image_url ? " p-1.5" : " px-4 py-2.5")}>
                    {msg.image_url ? (
                      <div>
                        <img
                          src={msg.image_url}
                          alt="Photo"
                          className="rounded-xl max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition"
                          onClick={() => setExpandedImage(msg.image_url)}
                        />
                        {msg.content && msg.content !== "📷 Photo" && (
                          <p className="whitespace-pre-wrap leading-relaxed px-2.5 py-1.5 text-sm">{msg.content}</p>
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}
                    {/* Read receipts for own messages */}
                    {isMine && (
                      <div className={"flex justify-end mt-0.5 " + (msg.image_url ? "px-2 pb-1" : "")}>
                        <span className={"text-[10px] font-medium " + (msg.read_at ? "text-blue-300" : "text-white/40")}>
                          {msg.read_at ? "✓✓" : "✓"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {otherTyping && (
            <div className="flex justify-start">
              <div className="bg-[#241d33] border border-white/8 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
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
                className="suggestion-chip flex-shrink-0 px-3 py-1.5 bg-[#241d33] border border-white/10 hover:border-orange-500/40 hover:bg-orange-500/10 text-gray-300 hover:text-white rounded-full text-xs transition-all duration-150 active:scale-95 whitespace-nowrap"
                style={{ animationDelay: i * 0.05 + "s" }}>
                {aiReady && i === 0 && <span className="mr-1 text-orange-400">✦</span>}
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-[#1a1225]/90 backdrop-blur-xl border-t border-white/5 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          <div className="flex gap-2 items-end">
            {/* Hidden file input for photo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            {/* Photo button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-10 h-10 bg-[#241d33] border border-white/10 hover:border-orange-500/30 hover:bg-orange-500/10 rounded-2xl flex items-center justify-center transition active:scale-95 flex-shrink-0"
              title="Envoyer une photo"
            >
              {uploadingPhoto
                ? <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                : <svg className="w-4.5 h-4.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); notifyTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Message..."
              maxLength={2000}
              className="flex-1 px-4 py-2.5 bg-[#241d33] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30 outline-none text-sm transition"
            />
            <button
              onClick={() => handleSend()}
              disabled={sending || !newMessage.trim()}
              className="w-10 h-10 bg-orange-500 hover:bg-orange-600 disabled:opacity-30 rounded-2xl flex items-center justify-center transition active:scale-95 flex-shrink-0">
              {sending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>}
            </button>
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
          <img
            src={expandedImage}
            alt="Photo agrandie"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
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
    </div>
  );
}
