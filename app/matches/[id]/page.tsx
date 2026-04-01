"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { getMessages, sendMessage, markAsRead, MessageRow } from "@/lib/services/messages";
import { useParams } from "next/navigation";
import Link from "next/link";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

export default function ConversationPage() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [match, setMatch] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      .select(`
        *,
        sender_animal:sender_animal_id(id, name, species, breed, photo_url),
        receiver_animal:receiver_animal_id(id, name, species, breed, photo_url),
        sender_profile:sender_user_id(id, full_name, email),
        receiver_profile:receiver_user_id(id, full_name, email)
      `)
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
      if (profile) {
        await markAsRead(supabase, matchId, profile.id);
      }
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;
    setSending(true);
    setError(null);

    const result = await sendMessage(
      supabase,
      params.id as string,
      profile.id,
      newMessage
    );

    if (result.error) {
      setError(result.error);
    } else {
      setNewMessage("");
      fetchMessages();
    }
    setSending(false);
  }

  if (loading) return <p className="text-center py-12 text-gray-500">Chargement...</p>;

  if (!match || match.status !== "accepted") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Conversation indisponible</h2>
          <p className="text-gray-600">Ce match n'existe pas ou n'a pas encore été accepté.</p>
          <Link href="/matches" className="inline-block mt-4 text-orange-500 hover:underline font-medium">
            Retour aux matchs
          </Link>
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
    if (isToday) {
      return date.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("fr-CH", { day: "numeric", month: "short" }) + " " + date.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/matches" className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
              {theirAnimal.photo_url ? (
                <img src={theirAnimal.photo_url} alt={theirAnimal.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">{EMOJI_MAP[theirAnimal.species] || "🐾"}</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {otherProfile.full_name || otherProfile.email}
              </p>
              <p className="text-xs text-gray-500">
                {theirAnimal.name} · {myAnimal.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">👋</p>
              <p className="text-gray-500">Commencez la conversation !</p>
              <p className="text-gray-400 text-sm mt-1">
                Présentez {myAnimal.name} à {otherProfile.full_name || "son propriétaire"}
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isMine = msg.sender_id === profile?.id;
            return (
              <div key={msg.id} className={"flex " + (isMine ? "justify-end" : "justify-start")}>
                <div className={"max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl " + (isMine ? "bg-orange-500 text-white rounded-br-sm" : "bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-sm")}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={"text-xs mt-1 " + (isMine ? "text-orange-200" : "text-gray-400")}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {error && (
            <p className="text-red-500 text-xs mb-2">{error}</p>
          )}
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              maxLength={2000}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
            >
              {sending ? "..." : "Envoyer"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
