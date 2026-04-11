import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Pawly — Trouve des copains pour ton animal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1225 0%, #2a2248 40%, #3d3462 70%, #16A34A 100%)",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34, 197, 94,0.25) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-120px",
            left: "-60px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Paw emoji */}
        <div
          style={{
            fontSize: "96px",
            marginBottom: "16px",
            display: "flex",
          }}
        >
          🐾
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 800,
            letterSpacing: "-2px",
            background: "linear-gradient(90deg, #22C55E, #4ADE80, #fbbf24)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
          }}
        >
          PAWLY
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "28px",
            color: "#e0daf0",
            marginTop: "12px",
            fontWeight: 500,
            display: "flex",
          }}
        >
          Trouve des copains pour ton animal
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "18px",
            color: "#b5aad0",
            marginTop: "16px",
            display: "flex",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <span style={{ display: "flex" }}>26 cantons</span>
          <span style={{ display: "flex", color: "#22C55E" }}>&#x2022;</span>
          <span style={{ display: "flex" }}>Toutes les especes</span>
          <span style={{ display: "flex", color: "#22C55E" }}>&#x2022;</span>
          <span style={{ display: "flex" }}>Gratuit</span>
        </div>

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            right: "40px",
            fontSize: "16px",
            color: "#8a7faa",
            fontWeight: 600,
            display: "flex",
          }}
        >
          pawlyapp.ch
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
