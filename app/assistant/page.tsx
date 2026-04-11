"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Animal {
  id: string;
  name: string;
  species: string;
}

// ── Quick Suggestion Chips ─────────────────────────────────────
const SUGGESTIONS = [
  "Mon chien mange moins",
  "Activites pour un chat",
  "Vaccins recommandes",
  "Mon animal est anxieux",
];

// ── Component ──────────────────────────────────────────────────
export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loadingAnimal, setLoadingAnimal] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Fetch user's animal on mount
  useEffect(() => {
    async function fetchAnimal() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("animals")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: true })
          .limit(1);
        if (data && data.length > 0) {
          setAnimal(data[0]);
        }
      } catch {
        // Silently fail
      } finally {
        setLoadingAnimal(false);
      }
    }
    fetchAnimal();
  }, []);

  // Add welcome message after animal is loaded
  useEffect(() => {
    if (!loadingAnimal && messages.length === 0) {
      const welcome: Message = {
        id: "welcome",
        role: "assistant",
        content: animal
          ? `Salut ! Je suis PawBot 🐾 Pose-moi tes questions sur ${animal.name}, je connais deja son profil !`
          : "Salut ! Je suis PawBot 🐾 Pose-moi tes questions sur ton animal, je connais deja son profil !",
        timestamp: new Date(),
      };
      setMessages([welcome]);
    }
  }, [loadingAnimal]);

  // ── Send message ─────────────────────────────────────────────
  async function sendMessage(text?: string) {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          animal_id: animal?.id,
        }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          data.reply ||
          "Desole, je n'ai pas pu generer une reponse. Reessaie !",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "Oups ! Une erreur est survenue. Verifie ta connexion et reessaie.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  // ── Handle key press ─────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Format time ──────────────────────────────────────────────
  function formatTime(date: Date) {
    return date.toLocaleTimeString("fr-CH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ── Show suggestion chips ────────────────────────────────────
  const showSuggestions = messages.length <= 1 && !loading;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--c-deep)" }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3"
        style={{
          background: "var(--c-card)",
          borderBottom: "1px solid var(--c-border)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <Link
          href="/profile"
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
          style={{
            background: "rgba(34, 197, 94, 0.1)",
            color: "var(--c-accent, #22C55E)",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
            }}
          >
            <span role="img" aria-label="robot">
              🤖
            </span>
          </div>
          <div className="min-w-0">
            <h1
              className="text-sm font-bold truncate"
              style={{ color: "var(--c-text)" }}
            >
              PawBot
            </h1>
            <p
              className="text-[11px] truncate"
              style={{ color: "var(--c-text-muted)" }}
            >
              {animal
                ? `Assistant pour ${animal.name}`
                : "Ton assistant animal"}
            </p>
          </div>
        </div>

        {/* Online status dot */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={{
            background: "rgba(34, 197, 94, 0.1)",
            color: "#22c55e",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#22c55e" }}
          />
          En ligne
        </div>
      </header>

      {/* ── Messages area ───────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ paddingBottom: "140px" }}
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
              style={{
                animation: `slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                animationDelay: `${idx === messages.length - 1 ? 0.05 : 0}s`,
              }}
            >
              {/* Assistant avatar */}
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 mr-2 mt-1"
                  style={{
                    background: "linear-gradient(135deg, #22C55E, #16A34A)",
                  }}
                >
                  🐾
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"
                }`}
                style={
                  msg.role === "user"
                    ? {
                        background:
                          "linear-gradient(135deg, #22C55E, #16A34A)",
                        color: "#fff",
                      }
                    : {
                        background: "var(--c-card)",
                        color: "var(--c-text)",
                        border: "1px solid var(--c-border)",
                      }
                }
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
                <p
                  className="text-[10px] mt-1.5 text-right"
                  style={{
                    opacity: 0.6,
                    color:
                      msg.role === "user"
                        ? "rgba(255,255,255,0.7)"
                        : "var(--c-text-muted)",
                  }}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {/* ── Typing indicator ─────────────────────────────── */}
          {loading && (
            <div className="flex justify-start" style={{ animation: "slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 mr-2 mt-1"
                style={{
                  background: "linear-gradient(135deg, #22C55E, #16A34A)",
                }}
              >
                🐾
              </div>
              <div
                className="rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5"
                style={{
                  background: "var(--c-card)",
                  border: "1px solid var(--c-border)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "var(--c-text-muted)",
                    animation: "breathe 1.2s ease-in-out infinite",
                    animationDelay: "0s",
                  }}
                />
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "var(--c-text-muted)",
                    animation: "breathe 1.2s ease-in-out infinite",
                    animationDelay: "0.2s",
                  }}
                />
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "var(--c-text-muted)",
                    animation: "breathe 1.2s ease-in-out infinite",
                    animationDelay: "0.4s",
                  }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Bottom section (suggestions + input) ────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: "var(--c-deep)",
          borderTop: "1px solid var(--c-border)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Suggestion chips */}
          {showSuggestions && (
            <div className="px-4 pt-3 pb-1">
              <p
                className="text-[11px] font-semibold mb-2 uppercase tracking-wider"
                style={{ color: "var(--c-text-muted)" }}
              >
                Suggestions
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                    style={{
                      background: "rgba(34, 197, 94, 0.1)",
                      color: "var(--c-accent, #22C55E)",
                      border: "1px solid rgba(249, 115, 22, 0.2)",
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="px-4 py-3 safe-area-bottom">
            <div
              className="flex items-center gap-2 rounded-2xl px-4 py-2"
              style={{
                background: "var(--c-card)",
                border: "1px solid var(--c-border)",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  animal
                    ? `Pose une question sur ${animal.name}...`
                    : "Pose ta question..."
                }
                disabled={loading}
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:opacity-50"
                style={{
                  color: "var(--c-text)",
                }}
                autoComplete="off"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0 disabled:opacity-30"
                style={{
                  background:
                    input.trim() && !loading
                      ? "linear-gradient(135deg, #22C55E, #16A34A)"
                      : "rgba(34, 197, 94, 0.15)",
                  color: input.trim() && !loading ? "#fff" : "var(--c-text-muted)",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
