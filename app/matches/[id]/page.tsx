"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { getMessages, sendMessageWithLimit, markAsRead, MessageRow } from "@/lib/services/messages";
import { useParams } from "next/navigation";
import Link from "next/link";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const params = useParams();
  const supabase = createClient();
  const { profile } = useAuth();

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
  const myAnimal = isMe ? match.sender_animal : match.receiver_animal;
  const theirAnimal = isMe ? match.receiver_animal : match.sender_animal;

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
          <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" title="En ligne" />
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
                  <div className={"max-w-[75%] px-4 py-2.5 rounded-2xl text-sm " +
                    (isMine
                      ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-md"
                      : "bg-[#241d33] border border-white/8 text-gray-100 rounded-bl-md")}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
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
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
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
    </div>
  );
}
