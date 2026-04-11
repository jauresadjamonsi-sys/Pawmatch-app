"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ImageCropperProps {
  /** The file to crop */
  file: File;
  /** Aspect ratio (width/height). 1 = square, 4/3 = landscape, 9/16 = portrait story */
  aspectRatio?: number;
  /** Output width in px (height derived from aspect ratio). Default 1024 */
  outputWidth?: number;
  /** JPEG quality 0-1. Default 0.88 */
  quality?: number;
  /** Called with cropped blob */
  onConfirm: (blob: Blob) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Optional title */
  title?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ImageCropper({
  file,
  aspectRatio = 1,
  outputWidth = 1024,
  quality = 0.88,
  onConfirm,
  onCancel,
  title = "Recadrer",
}: ImageCropperProps) {
  // Image natural dimensions
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  // Crop state
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  // Refs for drag
  const dragRef = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const pinchRef = useRef({ dist: 0, scale: 1 });
  const isPinching = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);

  // Load file as object URL
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const clamp = useCallback(
    (p: { x: number; y: number }, s: number) => {
      if (!frameRef.current || !natural.w) return p;
      const frame = frameRef.current.getBoundingClientRect();
      const iw = natural.w * s;
      const ih = natural.h * s;
      // How much the image can move: image size - frame size, divided by 2
      const maxX = Math.max(0, (iw - frame.width) / 2);
      const maxY = Math.max(0, (ih - frame.height) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, p.x)),
        y: Math.min(maxY, Math.max(-maxY, p.y)),
      };
    },
    [natural]
  );

  // Compute minimum scale so image covers the frame
  const getMinScale = useCallback(() => {
    if (!frameRef.current || !natural.w) return 1;
    const frame = frameRef.current.getBoundingClientRect();
    const scaleW = frame.width / natural.w;
    const scaleH = frame.height / natural.h;
    return Math.max(scaleW, scaleH);
  }, [natural]);

  // On image load, set initial scale to cover
  const onImgLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    },
    []
  );

  // Once natural + frame are ready, set initial scale
  useEffect(() => {
    if (natural.w && frameRef.current) {
      const min = getMinScale();
      setScale(min);
      setPos({ x: 0, y: 0 });
    }
  }, [natural, getMinScale]);

  // ---------------------------------------------------------------------------
  // Mouse / Touch handlers
  // ---------------------------------------------------------------------------
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isPinching.current) return;
      dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [pos]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current.active || isPinching.current) return;
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      setPos(clamp({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }, scale));
    },
    [scale, clamp]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  // Scroll zoom
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const min = getMinScale();
      const newScale = Math.min(min * 5, Math.max(min, scale - e.deltaY * 0.002));
      setScale(newScale);
      setPos((prev) => clamp(prev, newScale));
    },
    [scale, getMinScale, clamp]
  );

  // Pinch zoom
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        isPinching.current = true;
        dragRef.current.active = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchRef.current = { dist: Math.hypot(dx, dy), scale };
      }
    },
    [scale]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && isPinching.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = dist / pinchRef.current.dist;
        const min = getMinScale();
        const newScale = Math.min(min * 5, Math.max(min, pinchRef.current.scale * ratio));
        setScale(newScale);
        setPos((prev) => clamp(prev, newScale));
      }
    },
    [getMinScale, clamp]
  );

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) isPinching.current = false;
  }, []);

  // ---------------------------------------------------------------------------
  // Crop & output
  // ---------------------------------------------------------------------------
  const handleConfirm = useCallback(async () => {
    if (!frameRef.current || !natural.w || !imgSrc) return;
    setProcessing(true);

    try {
      const frame = frameRef.current.getBoundingClientRect();
      const imgW = natural.w * scale;
      const imgH = natural.h * scale;

      // Where is the image positioned relative to frame
      const imgLeft = (frame.width - imgW) / 2 + pos.x;
      const imgTop = (frame.height - imgH) / 2 + pos.y;

      // Visible portion in natural pixels
      const srcX = (-imgLeft / imgW) * natural.w;
      const srcY = (-imgTop / imgH) * natural.h;
      const srcW = (frame.width / imgW) * natural.w;
      const srcH = (frame.height / imgH) * natural.h;

      const outW = outputWidth;
      const outH = Math.round(outputWidth / aspectRatio);

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = imgSrc;
      });

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

      canvas.toBlob(
        (blob) => {
          setProcessing(false);
          if (blob) onConfirm(blob);
        },
        "image/jpeg",
        quality
      );
    } catch (err) {
      console.error("[ImageCropper] crop error:", err);
      setProcessing(false);
    }
  }, [natural, scale, pos, imgSrc, aspectRatio, outputWidth, quality, onConfirm]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button
          onClick={onCancel}
          className="text-sm font-medium px-3 py-1.5 rounded-lg transition active:scale-95"
          style={{ color: "var(--c-text-muted, #999)", background: "rgba(255,255,255,0.08)" }}
        >
          Annuler
        </button>
        <h3 className="text-sm font-bold" style={{ color: "var(--c-text, #fff)" }}>
          {title}
        </h3>
        <button
          onClick={handleConfirm}
          disabled={processing}
          className="text-sm font-bold px-4 py-1.5 rounded-lg transition active:scale-95 disabled:opacity-50"
          style={{ background: "#FBBF24", color: "#fff" }}
        >
          {processing ? "..." : "Valider"}
        </button>
      </div>

      {/* Crop area */}
      <div className="flex-1 flex items-center justify-center px-4 pb-4 overflow-hidden">
        <div
          ref={frameRef}
          className="relative overflow-hidden rounded-2xl"
          style={{
            aspectRatio: `${aspectRatio}`,
            width: aspectRatio >= 1 ? "100%" : "auto",
            height: aspectRatio < 1 ? "80vh" : "auto",
            maxWidth: "100%",
            maxHeight: "80vh",
            border: "2px solid rgba(251,191,36,0.4)",
            touchAction: "none",
            userSelect: "none",
            cursor: "grab",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {imgSrc && (
            <img
              src={imgSrc}
              alt="crop"
              onLoad={onImgLoad}
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
                width: natural.w ? `${natural.w * scale}px` : "auto",
                height: natural.h ? `${natural.h * scale}px` : "auto",
                pointerEvents: "none",
                maxWidth: "none",
                maxHeight: "none",
              }}
            />
          )}
        </div>
      </div>

      {/* Hint */}
      <div className="flex justify-center pb-6 flex-shrink-0">
        <span
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "var(--c-text-muted, #999)",
            backdropFilter: "blur(8px)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Glisser pour recadrer
        </span>
      </div>
    </div>
  );
}
