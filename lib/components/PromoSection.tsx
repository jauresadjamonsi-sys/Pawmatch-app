"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ── Types ─────────────────────── */
interface SlideItem {
  id: string;
  name: string;
  species: string;
  photo_url: string;
  isHero?: boolean;
  duration: number; // ms to show this slide
}

/* ── Ken Burns animation presets ─── */
const kenBurnsVariants = [
  { from: "scale(1) translate(0, 0)", to: "scale(1.2) translate(3%, -2%)" },
  { from: "scale(1.25) translate(-2%, 1%)", to: "scale(1) translate(2%, -1%)" },
  { from: "scale(1) translate(0, 0)", to: "scale(1.18) translate(-1%, 2%)" },
  { from: "scale(1.1) translate(1%, -3%)", to: "scale(1.15) translate(-2%, 3%)" },
  { from: "scale(1.05) translate(-3%, -2%)", to: "scale(1.2) translate(2%, 1%)" },
  { from: "scale(1.3) translate(0, 0)", to: "scale(1.05) translate(-1%, -1%)" },
];

/* ── Hero Ken Burns: slow zoom into center where the two dogs meet ─── */
const heroKenBurns = {
  from: "scale(1) translate(0, 0)",
  to: "scale(1.15) translate(0%, -3%)",
};

/* ── Component ────────────────── */
export default function PromoSection() {
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [videoProgress, setVideoProgress] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const isHeroSlide = slides.length > 0 && slides[currentIdx]?.isHero;

  const tracks = ["/promo-music.mp3", "/promo-music-2.mp3"];
  const trackNames = ["🎵 Son 1", "🎶 Son 2"];

  // Fetch community animals + append Ruby & Merlin hero at the end
  const loadSlides = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("animals")
      .select("id, name, species, photo_url")
      .not("photo_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    const animalSlides: SlideItem[] = (data || [])
      .filter((a: any) => a.photo_url)
      .map((a: any) => ({
        id: a.id,
        name: a.name,
        species: a.species,
        photo_url: a.photo_url,
        isHero: false,
        duration: 3500,
      }));

    // Add Ruby & Merlin hero as the LAST slide (longest duration)
    animalSlides.push({
      id: "hero-ruby-merlin",
      name: "Ruby & Merlin",
      species: "chien",
      photo_url: "/promo-hero.jpg",
      isHero: true,
      duration: 10000,
    });

    setSlides(animalSlides);
    setCurrentIdx(0);
    setNextIdx(animalSlides.length > 1 ? 1 : 0);
  }, []);

  // Initial load
  useEffect(() => { loadSlides(); }, [loadSlides]);

  // Auto-refresh every 5 minutes to pick up new companions
  useEffect(() => {
    const autoRefresh = setInterval(loadSlides, 30 * 60 * 1000);
    return () => clearInterval(autoRefresh);
  }, [loadSlides]);

  // Smart slideshow: variable duration, stops at last slide (hero)
  useEffect(() => {
    if (slides.length <= 1) return;

    // If we're on the last slide (hero), stop — don't loop
    const isLastSlide = currentIdx === slides.length - 1;
    if (isLastSlide) return;

    const currentDuration = slides[currentIdx]?.duration || 4000;

    timerRef.current = setTimeout(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIdx((prev) => {
          const next = prev + 1; // Don't wrap around
          setNextIdx(Math.min(next + 1, slides.length - 1));
          return next;
        });
        setTransitioning(false);
      }, 900);
    }, currentDuration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIdx, slides]);

  // Music toggle with MP3
  const toggleMusic = useCallback(() => {
    if (musicPlaying) {
      setMusicPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(tracks[trackIdx]);
        audioRef.current.loop = false;
        audioRef.current.volume = 0.5;
        audioRef.current.onended = () => setMusicPlaying(false);
      }
      audioRef.current.play().catch(() => {});
      setMusicPlaying(true);
    }
  }, [musicPlaying, trackIdx]);

  // Switch track
  const switchTrack = useCallback(() => {
    const newIdx = (trackIdx + 1) % tracks.length;
    setTrackIdx(newIdx);
    if (audioRef.current) {
      const wasPlaying = musicPlaying;
      audioRef.current.pause();
      audioRef.current = new Audio(tracks[newIdx]);
      audioRef.current.loop = false;
      audioRef.current.volume = 0.5;
      audioRef.current.onended = () => setMusicPlaying(false);
      if (wasPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [trackIdx, musicPlaying]);

  // Fetch and cache the promo image as a File
  const promoFileRef = useRef<File | null>(null);
  const getPromoFile = useCallback(async (): Promise<File | null> => {
    if (promoFileRef.current) return promoFileRef.current;
    try {
      const res = await fetch("/promo-hero.jpg");
      const blob = await res.blob();
      const file = new File([blob], "pawly-promo.jpg", { type: "image/jpeg" });
      promoFileRef.current = file;
      return file;
    } catch { return null; }
  }, []);

  // Share with image via Web Share API
  const shareWithImage = useCallback(async (text: string) => {
    const file = await getPromoFile();

    if (navigator.share) {
      try {
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Pawband 🐾", text });
        } else {
          await navigator.share({ title: "Pawband 🐾", text, url: "https://pawband.ch" });
        }
        return;
      } catch { /* user cancelled */ return; }
    }

    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text + "\nhttps://pawband.ch").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [getPromoFile]);

  // Download image for platforms that need manual posting (Instagram, TikTok)
  const downloadPromoImage = useCallback(async () => {
    const file = await getPromoFile();
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pawly-promo.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [getPromoFile]);

  // Load an image onto a canvas frame (handles CORS)
  const loadImageToCanvas = (src: string, w: number, h: number): Promise<ImageData | null> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }

        // Fill black background
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);

        // Draw image cover-style
        const imgRatio = img.width / img.height;
        const canvasRatio = w / h;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > canvasRatio) {
          sw = img.height * canvasRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / canvasRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

        // Gradient overlay
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "rgba(0,0,0,0.25)");
        grad.addColorStop(0.5, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        resolve(ctx.getImageData(0, 0, w, h));
      };
      img.onerror = () => resolve(null);
      // Add cache-buster for CORS
      img.src = src.startsWith("/") ? src : src + (src.includes("?") ? "&" : "?") + "t=" + Date.now();
    });
  };

  // Generate downloadable animated GIF (canvas-based, no html2canvas)
  const downloadGif = useCallback(async () => {
    if (recording || slides.length === 0) return;
    setRecording(true);

    try {
      const { GIFEncoder, quantize, applyPalette } = await import("gifenc");

      const gifW = 480;
      const gifH = Math.round(gifW * (360 / 400)); // ~aspect ratio

      const frames: ImageData[] = [];
      const maxFrames = Math.min(slides.length, 10);

      for (let i = 0; i < maxFrames; i++) {
        const slide = slides[i];
        if (!slide?.photo_url) continue;

        const frame = await loadImageToCanvas(slide.photo_url, gifW, gifH);
        if (frame) {
          frames.push(frame);

          // Add name label via a second canvas pass
          const canvas = document.createElement("canvas");
          canvas.width = gifW;
          canvas.height = gifH;
          const ctx = canvas.getContext("2d")!;
          ctx.putImageData(frame, 0, 0);

          // Draw name badge
          const emoji = slide.species === "chat" ? "🐱" : slide.species === "chien" ? "🐶" : "🐾";
          const label = `${emoji} ${slide.name}`;
          ctx.font = "bold 18px -apple-system, sans-serif";
          const textW = ctx.measureText(label).width;
          const badgeX = 12;
          const badgeY = gifH - 30;

          ctx.fillStyle = "rgba(249,115,22,0.75)";
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY - 18, textW + 20, 28, 14);
          ctx.fill();

          ctx.fillStyle = "#fff";
          ctx.fillText(label, badgeX + 10, badgeY + 2);

          // Overwrite frame with labeled version
          frames[frames.length - 1] = ctx.getImageData(0, 0, gifW, gifH);
        }
      }

      if (frames.length === 0) {
        alert("Aucune image disponible pour le GIF.");
        setRecording(false);
        return;
      }

      // Encode animated GIF
      const gif = GIFEncoder();

      for (let i = 0; i < frames.length; i++) {
        const isHero = slides[i]?.isHero;
        const palette = quantize(frames[i].data, 256);
        const index = applyPalette(frames[i].data, palette);
        gif.writeFrame(index, gifW, gifH, {
          palette,
          delay: isHero ? 4000 : 1500,
        });
      }
      gif.finish();

      const blob = new Blob([new Uint8Array(gif.bytes())], { type: "image/gif" });

      // Try native share first (mobile)
      if (navigator.share) {
        const file = new File([blob], "pawly-promo.gif", { type: "image/gif" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Pawband — Vidéo Promo 🐾",
              text: "Regarde la promo Pawband → https://pawband.ch/promo",
            });
            setRecording(false);
            return;
          } catch {}
        }
      }

      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pawly-promo.gif";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setRecording(false);

    } catch (err: any) {
      console.error("GIF error:", err);
      alert("Erreur lors de la création du GIF. Réessaie !");
      setRecording(false);
    }
  }, [recording, slides]);

  // Generate downloadable MP4 video with audio (Canvas + MediaRecorder)
  const downloadVideo = useCallback(async () => {
    if (recording || slides.length === 0) return;
    setRecording(true);
    setVideoProgress("Préparation...");

    try {
      const w = 720;
      const h = Math.round(w * (360 / 400));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      if (typeof MediaRecorder === "undefined") {
        alert("Ton navigateur ne supporte pas la création de vidéo. Utilise le GIF.");
        setRecording(false);
        setVideoProgress("");
        return;
      }

      const videoStream = canvas.captureStream(30);

      let audioCtx: AudioContext | null = null;
      let audioSource: AudioBufferSourceNode | null = null;
      let combinedStream: MediaStream;

      try {
        audioCtx = new AudioContext();
        const audioRes = await fetch(tracks[trackIdx]);
        const audioArrayBuffer = await audioRes.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer);
        audioSource = audioCtx.createBufferSource();
        audioSource.buffer = audioBuffer;
        const dest = audioCtx.createMediaStreamDestination();
        audioSource.connect(dest);
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
      } catch {
        combinedStream = videoStream;
      }

      const mimeType =
        MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2") ? "video/mp4;codecs=avc1,mp4a.40.2" :
        MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" :
        MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus" :
        "video/webm";
      const isMP4 = mimeType.includes("mp4");

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 3_000_000 });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const videoReady = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: isMP4 ? "video/mp4" : "video/webm" }));
        };
      });

      recorder.start(1000);
      audioSource?.start();

      const maxSlides = Math.min(slides.length, 12);
      for (let i = 0; i < maxSlides; i++) {
        const slide = slides[i];
        if (!slide?.photo_url) continue;
        setVideoProgress(`📹 ${i + 1}/${maxSlides} — ${slide.name}`);

        await new Promise<void>((resolve) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, w, h);
            const imgRatio = img.width / img.height;
            const canvasRatio = w / h;
            let sx = 0, sy = 0, sw = img.width, sh = img.height;
            if (imgRatio > canvasRatio) { sw = img.height * canvasRatio; sx = (img.width - sw) / 2; }
            else { sh = img.width / canvasRatio; sy = (img.height - sh) / 2; }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, "rgba(0,0,0,0.25)");
            grad.addColorStop(0.5, "rgba(0,0,0,0)");
            grad.addColorStop(1, "rgba(0,0,0,0.6)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            const emoji = slide.species === "chat" ? "🐱" : slide.species === "chien" ? "🐶" : "🐾";
            const label = `${emoji} ${slide.name}`;
            ctx.font = "bold 24px -apple-system, sans-serif";
            const textW = ctx.measureText(label).width;
            const badgeX = 16;
            const badgeY = h - 40;
            ctx.fillStyle = slide.isHero ? "rgba(244,63,94,0.8)" : "rgba(249,115,22,0.75)";
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY - 22, textW + 28, 36, 18);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.fillText(label, badgeX + 14, badgeY + 4);

            if (slide.isHero) {
              ctx.font = "bold 16px -apple-system, sans-serif";
              const hb = "⭐ Ruby & Merlin — Best Friends";
              const hbW = ctx.measureText(hb).width;
              ctx.fillStyle = "rgba(244,63,94,0.85)";
              ctx.beginPath();
              ctx.roundRect(12, 12, hbW + 24, 30, 15);
              ctx.fill();
              ctx.fillStyle = "#fff";
              ctx.fillText(hb, 24, 32);

              ctx.font = "bold 20px -apple-system, sans-serif";
              const cta = "🐾 Rejoins Pawband — pawband.ch";
              const ctaW = ctx.measureText(cta).width;
              const ctaX = (w - ctaW - 32) / 2;
              const ctaY = h - 90;
              const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW + 32, ctaY + 36);
              ctaGrad.addColorStop(0, "rgba(249,115,22,0.9)");
              ctaGrad.addColorStop(0.5, "rgba(244,63,94,0.9)");
              ctaGrad.addColorStop(1, "rgba(167,139,250,0.9)");
              ctx.fillStyle = ctaGrad;
              ctx.beginPath();
              ctx.roundRect(ctaX, ctaY, ctaW + 32, 38, 12);
              ctx.fill();
              ctx.fillStyle = "#fff";
              ctx.fillText(cta, ctaX + 16, ctaY + 27);
            }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = slide.photo_url.startsWith("/") ? slide.photo_url : slide.photo_url + (slide.photo_url.includes("?") ? "&" : "?") + "t=" + Date.now();
        });

        const holdMs = slide.isHero ? 8000 : 3000;
        await new Promise(r => setTimeout(r, holdMs));
      }

      setVideoProgress("Finalisation...");
      try { audioSource?.stop(); } catch {}
      recorder.stop();
      const blob = await videoReady;
      try { audioCtx?.close(); } catch {}

      if (navigator.share) {
        const file = new File([blob], `pawly-promo.${isMP4 ? "mp4" : "webm"}`, { type: blob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "Pawband — Vidéo Promo 🐾", text: "Regarde la promo Pawband → https://pawband.ch" });
            setRecording(false);
            setVideoProgress("");
            return;
          } catch {}
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pawly-promo.${isMP4 ? "mp4" : "webm"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error("Video error:", err);
      alert("Erreur lors de la création de la vidéo. Essaie le GIF !");
    }

    setRecording(false);
    setVideoProgress("");
  }, [recording, slides, trackIdx]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (slides.length === 0) return null;

  const current = slides[currentIdx];
  const next = slides[nextIdx];
  const currentIsHero = current?.isHero;
  const nextIsHero = next?.isHero;

  return (
    <section ref={sectionRef} className="glass rounded-2xl overflow-hidden relative">
      {/* Full-size animated photo slideshow */}
      <div className="promo-slideshow relative w-full" style={{ height: 360 }}>

        {/* ── Current slide ── */}
        {current?.photo_url && (
          <div
            key={`current-${currentIdx}`}
            className="absolute inset-0 overflow-hidden"
            style={{
              opacity: transitioning ? 0 : 1,
              transition: "opacity 0.9s ease-in-out",
              zIndex: 2,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                animation: currentIsHero
                  ? "heroKenBurns 10s ease-in-out forwards"
                  : `kenBurns_${currentIdx % kenBurnsVariants.length} 4s ease-in-out forwards`,
              }}
            >
              <Image
                src={current.photo_url}
                alt={current.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
                priority
              />
            </div>

            {/* ── Tail wag overlays (only on hero) ── */}
            {currentIsHero && (
              <>
                {/* Left dog tail — white glow wag at ~8% left, 30% top */}
                <div className="absolute z-[3] pointer-events-none"
                  style={{ left: "5%", top: "22%", width: 50, height: 70 }}>
                  <div style={{
                    width: "100%", height: "100%",
                    background: "radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 70%)",
                    animation: "tailWagLeft 0.4s ease-in-out infinite alternate",
                    transformOrigin: "bottom center",
                    borderRadius: "50%",
                  }} />
                </div>
                {/* Left tail tip accent */}
                <div className="absolute z-[3] pointer-events-none"
                  style={{ left: "3%", top: "15%", width: 30, height: 40 }}>
                  <div style={{
                    width: "100%", height: "100%",
                    background: "radial-gradient(ellipse, rgba(255,255,250,0.35) 0%, transparent 70%)",
                    animation: "tailWagLeft 0.35s ease-in-out infinite alternate-reverse",
                    transformOrigin: "bottom right",
                    borderRadius: "50%",
                  }} />
                </div>

                {/* Right dog tail — white glow wag at ~88% left, 20% top */}
                <div className="absolute z-[3] pointer-events-none"
                  style={{ right: "4%", top: "18%", width: 55, height: 75 }}>
                  <div style={{
                    width: "100%", height: "100%",
                    background: "radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 70%)",
                    animation: "tailWagRight 0.45s ease-in-out infinite alternate",
                    transformOrigin: "bottom center",
                    borderRadius: "50%",
                  }} />
                </div>
                {/* Right tail tip accent */}
                <div className="absolute z-[3] pointer-events-none"
                  style={{ right: "1%", top: "12%", width: 35, height: 45 }}>
                  <div style={{
                    width: "100%", height: "100%",
                    background: "radial-gradient(ellipse, rgba(255,255,250,0.35) 0%, transparent 70%)",
                    animation: "tailWagRight 0.38s ease-in-out infinite alternate-reverse",
                    transformOrigin: "bottom left",
                    borderRadius: "50%",
                  }} />
                </div>

                {/* Sparkle particles around tails */}
                {[
                  { left: "4%", top: "12%", delay: "0s" },
                  { left: "7%", top: "18%", delay: "0.6s" },
                  { left: "10%", top: "25%", delay: "1.2s" },
                  { right: "3%", top: "10%", delay: "0.3s" },
                  { right: "7%", top: "16%", delay: "0.9s" },
                  { right: "10%", top: "22%", delay: "1.5s" },
                ].map((pos, i) => (
                  <div
                    key={`sparkle-${i}`}
                    className="absolute z-[3] pointer-events-none text-sm"
                    style={{
                      ...pos,
                      animation: `sparkle 1.5s ease-in-out infinite`,
                      animationDelay: pos.delay,
                      opacity: 0,
                    }}
                  >
                    ✨
                  </div>
                ))}

                {/* Heart between the two dogs */}
                <div
                  className="absolute z-[4] pointer-events-none"
                  style={{
                    left: "50%",
                    top: "25%",
                    transform: "translateX(-50%)",
                    animation: "heartPulse 1.2s ease-in-out infinite",
                  }}
                >
                  <span className="text-2xl">❤️</span>
                </div>

                {/* Hero badge */}
                <div className="absolute top-3 left-3 z-20">
                  <span
                    className="px-3 py-1.5 rounded-full text-xs font-bold text-white backdrop-blur-md"
                    style={{ background: "rgba(244,63,94,0.8)" }}
                  >
                    ⭐ Ruby &amp; Merlin — Best Friends
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Next slide (behind, for crossfade) ── */}
        {next?.photo_url && (
          <div
            key={`next-${nextIdx}`}
            className="absolute inset-0 overflow-hidden"
            style={{
              opacity: transitioning ? 1 : 0,
              transition: "opacity 0.9s ease-in-out",
              zIndex: 1,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                animation: nextIsHero
                  ? "heroKenBurns 10s ease-in-out forwards"
                  : `kenBurns_${nextIdx % kenBurnsVariants.length} 4s ease-in-out forwards`,
              }}
            >
              <Image
                src={next.photo_url}
                alt={next.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/60 z-10 pointer-events-none" />

        {/* Controls: refresh + music */}
        <div className="absolute top-3 right-3 z-20 flex gap-1.5">
          {/* Refresh slides (load new companions) */}
          <button
            onClick={() => { loadSlides(); }}
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 active:rotate-180"
            style={{ background: "rgba(0,0,0,0.4)" }}
            aria-label="Rafraichir les compagnons"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
          {/* Switch track */}
          {musicPlaying && (
            <button
              onClick={switchTrack}
              className="h-10 px-2.5 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90"
              style={{ background: "rgba(0,0,0,0.4)" }}
              aria-label="Changer de musique"
            >
              <span className="text-[10px] font-bold text-white">{trackNames[trackIdx]}</span>
            </button>
          )}
          {/* Play/pause */}
          <button
            onClick={toggleMusic}
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90"
            style={{ background: musicPlaying ? "rgba(249,115,22,0.6)" : "rgba(0,0,0,0.4)" }}
            aria-label={musicPlaying ? "Couper la musique" : "Jouer la musique"}
          >
            <span className="text-lg">{musicPlaying ? "🔊" : "🎵"}</span>
          </button>
        </div>

        {/* Animal name badge (non-hero slides) */}
        {current && !currentIsHero && (
          <div className="absolute bottom-3 left-3 z-20" style={{ animation: "nameSlide 0.5s ease-out" }} key={`name-${currentIdx}`}>
            <span className="px-3 py-1.5 rounded-full text-sm font-bold text-white backdrop-blur-md"
              style={{ background: "rgba(249,115,22,0.7)" }}>
              {current.species === "chat" ? "🐱" : current.species === "chien" ? "🐶" : "🐾"} {current.name}
            </span>
          </div>
        )}

        {/* Hero CTA overlay — link + share + name */}
        {currentIsHero && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-3 flex flex-col gap-2" style={{ animation: "heroCTAAppear 0.8s ease-out" }}>
            {/* Name badge */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1.5 rounded-full text-sm font-bold text-white backdrop-blur-md"
                style={{ background: "rgba(249,115,22,0.8)" }}>
                🐶 Ruby &amp; Merlin
              </span>
              <button
                onClick={() => shareWithImage("🐾 Pawband — Le Tinder des Animaux 🇨🇭\nRegarde la vidéo promo → https://pawband.ch/promo\n\nConnecte ton compagnon avec d'autres animaux en Suisse ! Gratuit")}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-white backdrop-blur-md flex items-center gap-1 active:scale-95 transition-transform"
                style={{ background: "rgba(244,63,94,0.8)" }}>
                📤 Partager
              </button>
            </div>
            {/* Big CTA link to the app */}
            <a
              href="https://pawband.ch"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-extrabold text-white transition-transform active:scale-95"
              style={{
                background: "linear-gradient(135deg, #FBBF24 0%, #F43F5E 50%, #A78BFA 100%)",
                boxShadow: "0 4px 20px rgba(249,115,22,0.4)",
                animation: "ctaPulse 2s ease-in-out infinite",
              }}
            >
              🐾 Rejoins Pawband — C&apos;est gratuit !
            </a>
            {/* Replay button */}
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentIdx(0); setNextIdx(1); setTransitioning(false); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-white/90 transition-transform active:scale-95 mt-1"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
            >
              🔄 Rejouer la vidéo
            </button>
          </div>
        )}

        {/* Photo counter */}
        <div className="absolute bottom-3 right-3 z-20" style={{ display: currentIsHero ? "none" : "block" }}>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white/80 backdrop-blur-md"
            style={{ background: "rgba(0,0,0,0.4)" }}>
            {currentIdx + 1}/{slides.length}
          </span>
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-1">
          {slides.slice(0, Math.min(slides.length, 12)).map((s, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentIdx ? (s.isHero ? 22 : 16) : 5,
                height: 5,
                background: i === currentIdx
                  ? (s.isHero ? "#F43F5E" : "#FBBF24")
                  : s.isHero
                    ? "rgba(244,63,94,0.5)"
                    : "rgba(255,255,255,0.5)",
              }}
            />
          ))}
        </div>

        {/* Floating paws */}
        {!currentIsHero && [0, 1, 2].map((i) => (
          <div key={i} className="absolute text-2xl opacity-15 pointer-events-none z-10"
            style={{
              left: `${15 + i * 30}%`,
              animation: `promoFloat ${3 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
              top: "12%",
            }}>
            🐾
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-extrabold mb-1" style={{ color: "var(--c-text)" }}>
          🎬 Partage Pawband autour de toi !
        </h3>
        <p className="text-xs mb-3" style={{ color: "var(--c-text-muted)" }}>
          Connecte ton compagnon avec d&apos;autres animaux en Suisse 🇨🇭
        </p>

        {/* Download + Share buttons */}
        {/* Video progress bar */}
        {videoProgress && (
          <div className="mb-2 p-2 rounded-xl text-xs font-bold text-center text-white" style={{ background: "linear-gradient(135deg, #8B5CF6, #6366F1)" }}>
            {videoProgress}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-2">
          <button
            onClick={downloadVideo}
            disabled={recording}
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold text-white transition-transform active:scale-95"
            style={{
              background: recording ? "#6b7280" : "linear-gradient(135deg, #FBBF24, #EC4899)",
              opacity: recording ? 0.7 : 1,
            }}
          >
            {recording && videoProgress ? "⏳ ..." : "🎬 Vidéo MP4"}
          </button>
          <button
            onClick={downloadGif}
            disabled={recording}
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold text-white transition-transform active:scale-95"
            style={{
              background: recording ? "#6b7280" : "linear-gradient(135deg, #8B5CF6, #6366F1)",
              opacity: recording ? 0.7 : 1,
            }}
          >
            {recording && !videoProgress ? "⏳ ..." : "📥 GIF"}
          </button>
          <button
            onClick={() => shareWithImage("🐾 Pawband — Le Tinder des Animaux 🇨🇭\nRegarde la vidéo promo → https://pawband.ch/promo\n\nConnecte ton compagnon avec d'autres animaux en Suisse ! Gratuit")}
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold text-white transition-transform active:scale-95"
            style={{ background: "linear-gradient(135deg, #FBBF24, #F43F5E)" }}
          >
            📤 Partager
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-2">
          <button
            onClick={() => shareWithImage("🐾 Pawband — Le Tinder des Animaux 🇨🇭\nRegarde la vidéo promo → https://pawband.ch/promo\n\nConnecte ton compagnon avec d'autres animaux en Suisse ! Gratuit")}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold text-white transition-transform active:scale-95"
            style={{ background: "#25D366" }}>
            💬 WhatsApp
          </button>
          <button
            onClick={async () => {
              await downloadPromoImage();
              alert("📸 Image téléchargée !\nOuvre Instagram → Story → choisis l'image Pawband depuis ta galerie.");
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold text-white transition-transform active:scale-95"
            style={{ background: "linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)" }}>
            📸 Instagram
          </button>
          <button
            onClick={async () => {
              await downloadPromoImage();
              alert("🎵 Image téléchargée !\nOuvre TikTok → + → choisis l'image Pawband depuis ta galerie.");
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold text-white transition-transform active:scale-95"
            style={{ background: "#000" }}>
            🎵 TikTok
          </button>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://pawband.ch")}&quote=${encodeURIComponent("Pawband connecte les animaux en Suisse ! 🐾")}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold text-white transition-transform active:scale-95"
            style={{ background: "#1877F2" }}>
            👍 Facebook
          </a>
          <a
            href={`https://x.com/intent/tweet?text=${encodeURIComponent("Pawband — Le Tinder des Animaux 🐾🇨🇭 Connecte ton compagnon →")}&url=${encodeURIComponent("https://pawband.ch")}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold text-white transition-transform active:scale-95"
            style={{ background: "#000" }}>
            ✖ X (Twitter)
          </a>
          <button
            onClick={() => {
              navigator.clipboard.writeText("🐾 Pawband — Le Tinder des Animaux 🇨🇭\nGratuit → https://pawband.ch").then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }).catch(() => {});
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-transform active:scale-95"
            style={{ background: "var(--c-card)", color: "var(--c-text)", border: "1px solid var(--c-border)" }}>
            {copied ? "✅ Copié !" : "🔗 Copier"}
          </button>
        </div>
        <Link href="/promo"
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white w-full transition-transform active:scale-95"
          style={{ background: "var(--c-accent)" }}>
          🎬 Tous les templates promo
        </Link>
      </div>

      {/* ── Animations ── */}
      <style>{`
        @keyframes promoFloat {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-8px) scale(1.05); }
        }
        @keyframes nameSlide {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroKenBurns {
          0% { transform: ${heroKenBurns.from}; }
          100% { transform: ${heroKenBurns.to}; }
        }
        @keyframes tailWagLeft {
          0% { transform: rotate(-12deg) translateX(-3px); }
          100% { transform: rotate(12deg) translateX(3px); }
        }
        @keyframes tailWagRight {
          0% { transform: rotate(12deg) translateX(3px); }
          100% { transform: rotate(-12deg) translateX(-3px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5) translateY(0); }
          50% { opacity: 1; transform: scale(1.2) translateY(-8px); }
        }
        @keyframes heartPulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.9; }
          50% { transform: translateX(-50%) scale(1.3); opacity: 1; }
        }
        @keyframes heroCTAAppear {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(249,115,22,0.4); }
          50% { box-shadow: 0 4px 30px rgba(249,115,22,0.7), 0 0 40px rgba(244,63,94,0.3); }
        }
        ${kenBurnsVariants.map((v, i) => `
        @keyframes kenBurns_${i} {
          0% { transform: ${v.from}; }
          100% { transform: ${v.to}; }
        }`).join("\n")}
      `}</style>
    </section>
  );
}
