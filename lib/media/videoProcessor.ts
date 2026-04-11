/**
 * videoProcessor.ts — Premium video processing engine
 *
 * Uses FFmpeg.wasm (single-threaded, no SharedArrayBuffer needed)
 * to compress, resize, and generate thumbnails entirely client-side.
 *
 * Target output:
 *   - Reels:   1080x1920 (9:16), H.264, max 60s, ~8Mbps
 *   - Stories: 1080x1920 (9:16), H.264, max 30s, ~6Mbps
 *   - Thumbnails: 540x960 JPEG @ 85%
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

/* ── Types ────────────────────────────────────────────── */

export interface VideoProcessResult {
  compressedBlob: Blob;
  thumbnailBlob: Blob;
  durationSeconds: number;
  originalSizeMB: number;
  compressedSizeMB: number;
  width: number;
  height: number;
}

export interface ProcessOptions {
  maxDuration: number;       // seconds
  maxWidth?: number;         // default 1080
  maxHeight?: number;        // default 1920
  videoBitrate?: string;     // default "4M"
  audioBitrate?: string;     // default "128k"
  thumbnailTime?: number;    // seconds into video for thumbnail, default 1
  onProgress?: (ratio: number) => void; // 0..1
}

const DEFAULT_OPTS: Required<ProcessOptions> = {
  maxDuration: 60,
  maxWidth: 1080,
  maxHeight: 1920,
  videoBitrate: "4M",
  audioBitrate: "128k",
  thumbnailTime: 1,
  onProgress: () => {},
};

/* ── Singleton FFmpeg instance ────────────────────────── */

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;

async function getFFmpeg(onProgress?: (ratio: number) => void): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  if (loadPromise) {
    await loadPromise;
    return ffmpeg!;
  }

  ffmpeg = new FFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.min(Math.max(progress, 0), 1));
    });
  }

  // Load single-threaded core from CDN (no SharedArrayBuffer required)
  loadPromise = ffmpeg.load({
    coreURL: await toBlobURL(
      "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
      "text/javascript"
    ),
    wasmURL: await toBlobURL(
      "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
      "application/wasm"
    ),
  });

  await loadPromise;
  return ffmpeg;
}

/* ── Helpers ──────────────────────────────────────────── */

/** Get video metadata using a hidden <video> element */
export function getVideoMeta(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      URL.revokeObjectURL(url);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire les metadonnees video"));
    };
  });
}

/** Generate a thumbnail from a video file at a specific time using Canvas */
export function generateThumbnailCanvas(
  file: File,
  timeSeconds: number = 1,
  width: number = 540,
  height: number = 960
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = Math.min(timeSeconds, video.duration - 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;

        // Calculate cover crop (center)
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const targetRatio = width / height;
        const videoRatio = vw / vh;

        let sx = 0, sy = 0, sw = vw, sh = vh;
        if (videoRatio > targetRatio) {
          sw = vh * targetRatio;
          sx = (vw - sw) / 2;
        } else {
          sh = vw / targetRatio;
          sy = (vh - sh) / 2;
        }

        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve(blob);
            else reject(new Error("Echec generation miniature"));
          },
          "image/jpeg",
          0.85
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Erreur lecture video pour miniature"));
    };
  });
}

/* ── Main processor ───────────────────────────────────── */

export async function processVideo(
  file: File,
  options: ProcessOptions
): Promise<VideoProcessResult> {
  const opts = { ...DEFAULT_OPTS, ...options };
  const originalSizeMB = file.size / (1024 * 1024);

  // 1. Get metadata
  const meta = await getVideoMeta(file);

  // 2. Validate duration
  if (meta.duration > opts.maxDuration + 1) {
    throw new Error(
      `Video trop longue: ${Math.round(meta.duration)}s (max ${opts.maxDuration}s)`
    );
  }

  // 3. Generate thumbnail (using Canvas — fast, no FFmpeg needed)
  const thumbnailBlob = await generateThumbnailCanvas(
    file,
    Math.min(opts.thumbnailTime, meta.duration - 0.1),
    Math.round(opts.maxWidth / 2),
    Math.round(opts.maxHeight / 2)
  );

  // 4. Check if compression is needed
  const needsResize = meta.width > opts.maxWidth || meta.height > opts.maxHeight;
  const needsCompress = originalSizeMB > 10; // Compress if > 10MB
  const needsTrim = meta.duration > opts.maxDuration;

  // If small enough and right size, skip FFmpeg (saves time)
  if (!needsResize && !needsCompress && !needsTrim) {
    return {
      compressedBlob: file,
      thumbnailBlob,
      durationSeconds: meta.duration,
      originalSizeMB,
      compressedSizeMB: originalSizeMB,
      width: meta.width,
      height: meta.height,
    };
  }

  // 5. Load FFmpeg
  const ff = await getFFmpeg(opts.onProgress);

  // 6. Write input file
  const inputName = "input" + getExtension(file.name);
  await ff.writeFile(inputName, await fetchFile(file));

  // 7. Build FFmpeg command
  const outputName = "output.mp4";
  const args: string[] = ["-i", inputName];

  // Duration trim
  if (needsTrim) {
    args.push("-t", String(opts.maxDuration));
  }

  // Video filter: scale to fit within maxWidth x maxHeight, maintaining 9:16
  // pad to exact dimensions if needed
  const vf = [
    `scale=${opts.maxWidth}:${opts.maxHeight}:force_original_aspect_ratio=decrease`,
    `pad=${opts.maxWidth}:${opts.maxHeight}:(ow-iw)/2:(oh-ih)/2:black`,
    "format=yuv420p",
  ].join(",");

  args.push(
    "-vf", vf,
    "-c:v", "libx264",
    "-preset", "fast",
    "-b:v", opts.videoBitrate,
    "-maxrate", opts.videoBitrate,
    "-bufsize", String(parseInt(opts.videoBitrate) * 2) + "M",
    "-c:a", "aac",
    "-b:a", opts.audioBitrate,
    "-movflags", "+faststart",
    "-y",
    outputName
  );

  // 8. Run FFmpeg
  await ff.exec(args);

  // 9. Read output
  const data = await ff.readFile(outputName);
  const compressedBlob = new Blob([data], { type: "video/mp4" });
  const compressedSizeMB = compressedBlob.size / (1024 * 1024);

  // 10. Cleanup
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  return {
    compressedBlob,
    thumbnailBlob,
    durationSeconds: Math.min(meta.duration, opts.maxDuration),
    originalSizeMB,
    compressedSizeMB,
    width: opts.maxWidth,
    height: opts.maxHeight,
  };
}

/* ── Presets ───────────────────────────────────────────── */

export const REEL_OPTIONS: ProcessOptions = {
  maxDuration: 60,
  maxWidth: 1080,
  maxHeight: 1920,
  videoBitrate: "4M",
  audioBitrate: "128k",
  thumbnailTime: 1,
};

export const STORY_OPTIONS: ProcessOptions = {
  maxDuration: 30,
  maxWidth: 1080,
  maxHeight: 1920,
  videoBitrate: "3M",
  audioBitrate: "96k",
  thumbnailTime: 0.5,
};

/* ── Utils ────────────────────────────────────────────── */

function getExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && ["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return `.${ext}`;
  return ".mp4";
}

/** Human-readable file size */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
