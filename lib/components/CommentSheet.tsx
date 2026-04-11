"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

type Comment = {
  id: string;
  reel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // Profile fields (fetched client-side)
  author_name?: string;
  author_avatar?: string;
};

type Props = {
  reelId: string;
  isOpen: boolean;
  onClose: () => void;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  const weeks = Math.floor(days / 7);
  return `${weeks}sem`;
}

export default function CommentSheet({ reelId, isOpen, onClose }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [closing, setClosing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  // Fetch comments when opened
  useEffect(() => {
    if (!isOpen || !reelId) return;
    setLoading(true);
    setClosing(false);
    fetch(`/api/reels/${reelId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        setComments(data.comments || []);
        setLoading(false);
        // Auto-scroll to bottom
        setTimeout(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        }, 100);
      })
      .catch(() => setLoading(false));
  }, [isOpen, reelId]);

  // Focus input when sheet opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 250);
  }, [onClose]);

  // Swipe down to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 80) {
      handleClose();
    }
  }, [handleClose]);

  // Send comment
  const sendComment = useCallback(async () => {
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/reels/${reelId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setText("");
        // Auto-scroll to new comment
        setTimeout(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        }, 50);
      }
    } catch {
      // Silent fail
    } finally {
      setSending(false);
    }
  }, [reelId, text, sending]);

  if (!isOpen && !closing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] transition-opacity duration-250 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed bottom-0 left-0 right-0 z-[101] rounded-t-3xl flex flex-col transition-transform duration-250 ease-out ${
          closing ? "translate-y-full" : "animate-slide-up"
        }`}
        style={{
          maxHeight: "60vh",
          background: "var(--c-deep, #0f0f14)",
          border: "1px solid var(--c-border)",
          borderBottom: "none",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "var(--c-border)" }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <h3 className="text-sm font-bold" style={{ color: "var(--c-text)" }}>
            Commentaires
            {comments.length > 0 && (
              <span
                className="ml-1 text-xs font-normal"
                style={{ color: "var(--c-text-muted)" }}
              >
                ({comments.length})
              </span>
            )}
          </h3>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ background: "var(--c-card)", color: "var(--c-text-muted)" }}
            aria-label="Fermer"
          >
            {"\u2715"}
          </button>
        </div>

        {/* Comments list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 space-y-3 pb-2"
          style={{ scrollbarWidth: "thin" }}
        >
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div
                className="w-5 h-5 border-2 rounded-full animate-spin"
                style={{
                  borderColor: "var(--c-border)",
                  borderTopColor: "var(--c-accent, #FBBF24)",
                }}
              />
            </div>
          )}

          {!loading && comments.length === 0 && (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">{"\uD83D\uDCAC"}</div>
              <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
                Aucun commentaire. Sois le premier !
              </p>
            </div>
          )}

          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5 animate-fade-in-scale">
              <div
                className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-[var(--c-border)]"
              >
                {comment.author_avatar ? (
                  <Image
                    src={comment.author_avatar}
                    alt=""
                    width={28}
                    height={28}
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xs"
                    style={{ background: "var(--c-card)" }}
                  >
                    {"\uD83D\uDC64"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold truncate" style={{ color: "var(--c-text)" }}>
                    {comment.author_name || "Utilisateur"}
                  </span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: "var(--c-text-muted)" }}>
                    {timeAgo(comment.created_at)}
                  </span>
                </div>
                <p className="text-xs mt-0.5 break-words" style={{ color: "var(--c-text)" }}>
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input bar */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{
            borderTop: "1px solid var(--c-border)",
            background: "var(--c-deep, #0f0f14)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendComment();
              }
            }}
            placeholder="Ajouter un commentaire..."
            maxLength={500}
            className="flex-1 rounded-full px-4 py-2 text-xs outline-none transition-colors"
            style={{
              background: "var(--c-card)",
              color: "var(--c-text)",
              border: "1px solid var(--c-border)",
            }}
          />
          <button
            onClick={sendComment}
            disabled={!text.trim() || sending}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all btn-press"
            style={{
              background: text.trim()
                ? "linear-gradient(135deg, #FBBF24, #F59E0B)"
                : "var(--c-card)",
              color: text.trim() ? "#fff" : "var(--c-text-muted)",
              opacity: sending ? 0.5 : 1,
            }}
            aria-label="Envoyer"
          >
            {sending ? (
              <div
                className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                style={{ borderColor: "transparent", borderTopColor: "#fff" }}
              />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
