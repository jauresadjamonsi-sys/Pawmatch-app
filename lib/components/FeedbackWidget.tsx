"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppContext } from "@/lib/contexts/AppContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const TYPES = [
  { value: "bug", label: { fr: "Bug", de: "Bug", it: "Bug", en: "Bug" }, icon: "\uD83D\uDC1B" },
  { value: "suggestion", label: { fr: "Suggestion", de: "Vorschlag", it: "Suggerimento", en: "Suggestion" }, icon: "\uD83D\uDCA1" },
  { value: "feature", label: { fr: "Fonctionnalit\u00e9", de: "Feature", it: "Funzionalit\u00e0", en: "Feature" }, icon: "\u2728" },
  { value: "praise", label: { fr: "Compliment", de: "Lob", it: "Complimento", en: "Compliment" }, icon: "\uD83D\uDC4F" },
  { value: "complaint", label: { fr: "Plainte", de: "Beschwerde", it: "Reclamo", en: "Complaint" }, icon: "\u26A0\uFE0F" },
];

const CATEGORIES = [
  "Feed", "Flairer", "Matches", "Stories", "Score", "Profil", "Carte", "G\u00e9n\u00e9ral", "Autre",
];

const LABELS: Record<string, Record<string, string>> = {
  fr: {
    feedback: "Feedback",
    title: "Titre",
    titlePlaceholder: "R\u00e9sum\u00e9 en quelques mots...",
    description: "Description",
    descPlaceholder: "D\u00e9cris ton retour en d\u00e9tail...",
    email: "Email (optionnel)",
    emailPlaceholder: "ton@email.ch",
    type: "Type",
    category: "Cat\u00e9gorie",
    submit: "Envoyer",
    sending: "Envoi...",
    success: "Merci pour ton feedback !",
    error: "Erreur lors de l\u2019envoi. R\u00e9essaie.",
    close: "Fermer",
    required: "Champs requis",
  },
  de: {
    feedback: "Feedback",
    title: "Titel",
    titlePlaceholder: "Kurz zusammengefasst...",
    description: "Beschreibung",
    descPlaceholder: "Beschreibe dein Feedback im Detail...",
    email: "E-Mail (optional)",
    emailPlaceholder: "dein@email.ch",
    type: "Typ",
    category: "Kategorie",
    submit: "Absenden",
    sending: "Senden...",
    success: "Danke f\u00fcr dein Feedback!",
    error: "Fehler beim Senden. Versuche es erneut.",
    close: "Schliessen",
    required: "Pflichtfelder",
  },
  it: {
    feedback: "Feedback",
    title: "Titolo",
    titlePlaceholder: "Riassunto in poche parole...",
    description: "Descrizione",
    descPlaceholder: "Descrivi il tuo feedback in dettaglio...",
    email: "Email (opzionale)",
    emailPlaceholder: "tua@email.ch",
    type: "Tipo",
    category: "Categoria",
    submit: "Invia",
    sending: "Invio...",
    success: "Grazie per il tuo feedback!",
    error: "Errore durante l\u2019invio. Riprova.",
    close: "Chiudi",
    required: "Campi obbligatori",
  },
  en: {
    feedback: "Feedback",
    title: "Title",
    titlePlaceholder: "Quick summary...",
    description: "Description",
    descPlaceholder: "Describe your feedback in detail...",
    email: "Email (optional)",
    emailPlaceholder: "your@email.com",
    type: "Type",
    category: "Category",
    submit: "Submit",
    sending: "Sending...",
    success: "Thanks for your feedback!",
    error: "Failed to send. Please try again.",
    close: "Close",
    required: "Required fields",
  },
};

export default function FeedbackWidget() {
  const { lang } = useAppContext();
  const l = LABELS[lang] || LABELS.fr;

  const [open, setOpen] = useState(false);
  const [type, setType] = useState("suggestion");
  const [category, setCategory] = useState("G\u00e9n\u00e9ral");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Hide on fullscreen pages (reels, stories, live)
  useEffect(() => {
    const check = () => {
      const p = window.location.pathname;
      setHidden(p.startsWith("/reels") || p.startsWith("/stories") || p.startsWith("/live"));
    };
    check();
    window.addEventListener("popstate", check);
    return () => window.removeEventListener("popstate", check);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        if (data.user.email) setEmail(data.user.email);
      }
    });
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus trap for modal
  useEffect(() => {
    if (!open || !modalRef.current) return;
    const modal = modalRef.current;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableEls = modal.querySelectorAll<HTMLElement>(focusableSelector);
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];

    firstEl?.focus();

    const trapHandler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };
    modal.addEventListener("keydown", trapHandler);
    return () => modal.removeEventListener("keydown", trapHandler);
  }, [open]);

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) return;
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("feedback").insert({
        user_id: userId,
        user_email: email || null,
        type,
        category,
        title: title.trim(),
        description: description.trim(),
        page_url: typeof window !== "undefined" ? window.location.href : null,
        device: typeof navigator !== "undefined" ? navigator.userAgent : null,
        app_source: "pawly",
      });
      if (error) throw error;
      toast.success(l.success);
      setTitle("");
      setDescription("");
      setType("suggestion");
      setCategory("G\u00e9n\u00e9ral");
      setOpen(false);
    } catch {
      toast.error(l.error);
    } finally {
      setSending(false);
    }
  }

  if (hidden && !open) return null;

  const pillStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 100,
    right: 16,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "8px 14px",
    background: "var(--c-accent)",
    color: "#fff",
    border: "none",
    borderRadius: 50,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    transition: "transform 0.2s, box-shadow 0.2s",
  };

  const backdropStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 80,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    animation: "feedbackFadeIn 0.2s ease",
  };

  const modalStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85vh",
    overflowY: "auto",
    background: "var(--c-card)",
    borderRadius: "20px 20px 0 0",
    padding: "24px 20px 32px",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
    animation: "feedbackSlideUp 0.3s ease",
    color: "var(--c-text)",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--c-text-muted)",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "var(--c-deep)",
    border: "1px solid var(--c-border)",
    borderRadius: 10,
    color: "var(--c-text)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const chipBaseStyle: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: 20,
    border: "1px solid var(--c-border)",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s",
    background: "var(--c-deep)",
    color: "var(--c-text-muted)",
  };

  const chipActiveStyle: React.CSSProperties = {
    ...chipBaseStyle,
    background: "var(--c-accent)",
    color: "#fff",
    borderColor: "var(--c-accent)",
  };

  const submitBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 0",
    background: !title.trim() || !description.trim() ? "var(--c-border)" : "var(--c-accent)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: !title.trim() || !description.trim() ? "not-allowed" : "pointer",
    opacity: !title.trim() || !description.trim() ? 0.5 : 1,
    transition: "background 0.2s, opacity 0.2s",
  };

  return (
    <>
      <style>{`
        @keyframes feedbackSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes feedbackFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={pillStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,0,0,0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.25)";
          }}
          aria-label={l.feedback}
        >
          {"\uD83D\uDCA1"} {l.feedback}
        </button>
      )}

      {open && (
        <div
          style={backdropStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title" style={modalStyle}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 id="feedback-modal-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--c-text)" }}>
                {"\uD83D\uDCA1"} {l.feedback}
              </h2>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 22,
                  cursor: "pointer",
                  color: "var(--c-text-muted)",
                  padding: 4,
                  lineHeight: 1,
                }}
                aria-label={l.close}
              >
                {"\u2715"}
              </button>
            </div>

            {/* Type selector */}
            <div style={{ marginBottom: 16 }} role="radiogroup" aria-label={l.type}>
              <span style={labelStyle} id="feedback-type-label">{l.type}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    role="radio"
                    aria-checked={type === t.value}
                    style={type === t.value ? chipActiveStyle : chipBaseStyle}
                  >
                    {t.icon} {t.label[lang] || t.label.fr}
                  </button>
                ))}
              </div>
            </div>

            {/* Category selector */}
            <div style={{ marginBottom: 16 }} role="radiogroup" aria-label={l.category}>
              <span style={labelStyle} id="feedback-category-label">{l.category}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    role="radio"
                    aria-checked={category === c}
                    style={category === c ? chipActiveStyle : chipBaseStyle}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{l.title} *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={l.titlePlaceholder}
                maxLength={120}
                style={inputStyle}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{l.description} *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={l.descPlaceholder}
                maxLength={2000}
                rows={4}
                style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>{l.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={l.emailPlaceholder}
                style={inputStyle}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={sending || !title.trim() || !description.trim()}
              style={submitBtnStyle}
            >
              {sending ? l.sending : l.submit}
            </button>

            <p style={{ fontSize: 11, color: "var(--c-text-muted)", textAlign: "center", marginTop: 10, marginBottom: 0 }}>
              * {l.required}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
