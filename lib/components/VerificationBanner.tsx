"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import ImageCropper from "./ImageCropper";

export default function VerificationBanner() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [done, setDone] = useState(false);
  const fetched = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        setStatus(data.verification_status);
        // Show banner if not approved and not dismissed this session
        if (data.verification_status !== "approved") {
          const dismissed = sessionStorage.getItem("pawly_verif_dismissed");
          if (!dismissed) setShow(true);
        }
      }
    }
    check();
  }, []);

  const [cropFile, setCropFile] = useState<File | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setCropFile(f);
    }
    e.target.value = "";
  }

  function handleCropConfirm(blob: Blob) {
    const croppedFile = new File([blob], "verification.jpg", { type: "image/jpeg" });
    setFile(croppedFile);
    setPreview(URL.createObjectURL(blob));
    setCropFile(null);
  }

  async function handleSubmit() {
    if (!file) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `verifications/${user.id}-${Date.now()}.${ext}`;

      // Try uploading to "photos" bucket, fallback to "avatars" if it doesn't exist
      let uploadError: any = null;
      let bucket = "photos";

      const { error: err1 } = await supabase.storage.from("photos").upload(path, file, { cacheControl: "3600", upsert: true });
      if (err1) {
        // If "photos" bucket fails, try "avatars" bucket
        const { error: err2 } = await supabase.storage.from("avatars").upload(path, file, { cacheControl: "3600", upsert: true });
        if (err2) {
          uploadError = err1;
        } else {
          bucket = "avatars";
        }
      }

      if (uploadError) throw new Error(uploadError.message || "Upload echoue");

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

      const { error: updateError } = await supabase.from("profiles").update({
        verification_photo_url: urlData.publicUrl,
        verification_status: "submitted",
        verification_submitted_at: new Date().toISOString(),
      }).eq("id", user.id);

      if (updateError) throw new Error(updateError.message || "Mise a jour profil echouee");

      setDone(true);
      setTimeout(() => setShow(false), 3000);
    } catch (e: any) {
      alert("Erreur : " + (e?.message || "Reessaie."));
    }
    setUploading(false);
  }

  function dismiss() {
    sessionStorage.setItem("pawly_verif_dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  // Already submitted, waiting for review
  if (status === "submitted" && !done) {
    return (
      <div className="mx-4 mt-2 p-3 rounded-xl text-sm flex items-center gap-3" style={{
        background: "rgba(59,130,246,0.08)",
        border: "1px solid rgba(59,130,246,0.2)",
      }}>
        <span className="text-lg">⏳</span>
        <div className="flex-1">
          <span style={{ color: "var(--c-text)" }} className="font-semibold">Verification en cours</span>
          <span style={{ color: "var(--c-text-muted)" }} className="ml-1">— Ta photo est en cours d'examen.</span>
        </div>
        <button onClick={dismiss} style={{ color: "var(--c-text-muted)" }} className="text-xs hover:opacity-70">✕</button>
      </div>
    );
  }

  // Rejected
  if (status === "rejected") {
    return (
      <div className="mx-4 mt-2 p-3 rounded-xl text-sm" style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.2)",
      }}>
        <div className="flex items-center gap-3">
          <span className="text-lg">❌</span>
          <div className="flex-1">
            <span style={{ color: "#ef4444" }} className="font-semibold">Photo refusee</span>
            <span style={{ color: "var(--c-text-muted)" }} className="ml-1">— Renvoie une photo claire de toi avec ton animal.</span>
          </div>
        </div>
        <button onClick={() => setShowUpload(true)} className="mt-2 w-full py-2 text-sm font-bold rounded-lg text-white" style={{ background: "#ef4444" }}>
          Renvoyer une photo
        </button>
        {showUpload && <UploadZone preview={preview} onChange={handleFileChange} onSubmit={handleSubmit} uploading={uploading} file={file} />}
        {cropFile && <VerifCropWrapper cropFile={cropFile} onConfirm={handleCropConfirm} onCancel={() => setCropFile(null)} />}
      </div>
    );
  }

  // Done (just submitted)
  if (done) {
    return (
      <div className="mx-4 mt-2 p-3 rounded-xl text-sm flex items-center gap-3" style={{
        background: "rgba(34,197,94,0.08)",
        border: "1px solid rgba(34,197,94,0.2)",
      }}>
        <span className="text-lg">✅</span>
        <span style={{ color: "#22c55e" }} className="font-semibold">Photo envoyee ! Verification sous 24h.</span>
      </div>
    );
  }

  // Pending (never submitted)
  return (
    <div className="mx-4 mt-2 rounded-xl overflow-hidden" style={{
      background: "rgba(249,115,22,0.06)",
      border: "1px solid rgba(249,115,22,0.2)",
    }}>
      <div className="p-3 flex items-center gap-3">
        <span className="text-lg">📸</span>
        <div className="flex-1">
          <span style={{ color: "var(--c-accent)" }} className="font-bold text-sm">Verifie ton compte !</span>
          <p style={{ color: "var(--c-text-muted)" }} className="text-xs mt-0.5">
            Envoie une photo de toi avec ton animal pour securiser la communaute.
          </p>
        </div>
        <button onClick={dismiss} style={{ color: "var(--c-text-muted)" }} className="text-xs hover:opacity-70 flex-shrink-0">Plus tard</button>
      </div>

      {!showUpload ? (
        <button onClick={() => setShowUpload(true)}
          className="w-full py-2.5 text-sm font-bold transition"
          style={{
            background: "rgba(249,115,22,0.1)",
            color: "var(--c-accent)",
            borderTop: "1px solid rgba(249,115,22,0.15)",
          }}>
          Envoyer ma photo
        </button>
      ) : (
        <UploadZone preview={preview} onChange={handleFileChange} onSubmit={handleSubmit} uploading={uploading} file={file} />
      )}
      {cropFile && <VerifCropWrapper cropFile={cropFile} onConfirm={handleCropConfirm} onCancel={() => setCropFile(null)} />}
    </div>
  );
}

function VerifCropWrapper({ cropFile, onConfirm, onCancel }: { cropFile: File; onConfirm: (blob: Blob) => void; onCancel: () => void }) {
  return (
    <ImageCropper
      file={cropFile}
      aspectRatio={4 / 3}
      outputWidth={1024}
      title="Recadrer la verification"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

function UploadZone({ preview, onChange, onSubmit, uploading, file }: {
  preview: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  uploading: boolean;
  file: File | null;
}) {
  return (
    <div className="p-3 pt-0" style={{ borderTop: "1px solid rgba(249,115,22,0.1)" }}>
      <div className="mt-3 flex gap-3 items-center">
        <div className="w-20 h-20 rounded-xl bg-[var(--c-bg)] border-2 border-dashed border-[var(--c-border)] flex items-center justify-center overflow-hidden flex-shrink-0 relative">
          {preview ? (
            <Image src={preview} alt="verification" fill className="object-cover" unoptimized sizes="80px" />
          ) : (
            <span className="text-2xl">🤳</span>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <label className="px-3 py-1.5 text-xs font-semibold rounded-lg text-center cursor-pointer" style={{
            background: "var(--c-bg)",
            border: "1px solid var(--c-border)",
            color: "var(--c-text-muted)",
          }}>
            {preview ? "Changer" : "Choisir une photo"}
            <input type="file" accept="image/*" onChange={onChange} className="hidden" />
          </label>
          {file && (
            <button onClick={onSubmit} disabled={uploading}
              className="px-3 py-1.5 text-xs font-bold rounded-lg text-white disabled:opacity-50"
              style={{ background: "var(--c-accent)" }}>
              {uploading ? "Envoi..." : "Envoyer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
