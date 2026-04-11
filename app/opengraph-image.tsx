import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PawlyApp — Le reseau social des animaux en Suisse";
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
          background: "linear-gradient(145deg, #0f0a1e 0%, #1a1333 25%, #2a2248 50%, #1a1333 75%, #0f0a1e 100%)",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow top-right amber */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-50px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,191,36,0.25) 0%, rgba(251,191,36,0.08) 40%, transparent 70%)",
            display: "flex",
          }}
        />
        {/* Ambient glow bottom-left violet */}
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-80px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, rgba(167,139,250,0.05) 40%, transparent 70%)",
            display: "flex",
          }}
        />
        {/* Ambient glow center amber subtle */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "800px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(251,191,36,0.06) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Top bar with Swiss badge */}
        <div
          style={{
            position: "absolute",
            top: "32px",
            left: "40px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "#DC2626",
              color: "#fff",
              fontSize: "18px",
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            +
          </div>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Made in Switzerland
          </span>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0px",
            marginTop: "10px",
          }}
        >
          {/* Paw icon with glow */}
          <div
            style={{
              fontSize: "80px",
              display: "flex",
              filter: "drop-shadow(0 0 40px rgba(251,191,36,0.4))",
              marginBottom: "8px",
            }}
          >
            🐾
          </div>

          {/* PAWLY title */}
          <div
            style={{
              fontSize: "82px",
              fontWeight: 900,
              letterSpacing: "-3px",
              background: "linear-gradient(135deg, #FBBF24 0%, #FCD34D 30%, #FBBF24 60%, #F59E0B 100%)",
              backgroundClip: "text",
              color: "transparent",
              display: "flex",
              lineHeight: 1,
            }}
          >
            PAWLYAPP
          </div>

          {/* Main tagline */}
          <div
            style={{
              fontSize: "26px",
              color: "#f0eeff",
              marginTop: "16px",
              fontWeight: 600,
              display: "flex",
              letterSpacing: "-0.5px",
            }}
          >
            Le reseau social des animaux en Suisse
          </div>

          {/* Features row */}
          <div
            style={{
              display: "flex",
              gap: "32px",
              alignItems: "center",
              marginTop: "28px",
            }}
          >
            {/* Feature 1 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(251,191,36,0.15)",
                  border: "1px solid rgba(251,191,36,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                💛
              </div>
              <span style={{ color: "#b5aad0", fontSize: "15px", fontWeight: 500, display: "flex" }}>
                Matching IA
              </span>
            </div>

            {/* Feature 2 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(251,191,36,0.15)",
                  border: "1px solid rgba(251,191,36,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                📍
              </div>
              <span style={{ color: "#b5aad0", fontSize: "15px", fontWeight: 500, display: "flex" }}>
                26 cantons
              </span>
            </div>

            {/* Feature 3 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(251,191,36,0.15)",
                  border: "1px solid rgba(251,191,36,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                🎉
              </div>
              <span style={{ color: "#b5aad0", fontSize: "15px", fontWeight: 500, display: "flex" }}>
                Gratuit
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "56px",
            background: "rgba(0,0,0,0.3)",
            borderTop: "1px solid rgba(251,191,36,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#22c55e",
                display: "flex",
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 500, display: "flex" }}>
              Disponible maintenant
            </span>
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#FBBF24",
              display: "flex",
              letterSpacing: "-0.5px",
            }}
          >
            pawlyapp.ch
          </div>
        </div>

        {/* Decorative paw prints scattered */}
        <div
          style={{
            position: "absolute",
            top: "45px",
            right: "55px",
            fontSize: "32px",
            opacity: 0.08,
            transform: "rotate(25deg)",
            display: "flex",
          }}
        >
          🐾
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "90px",
            left: "50px",
            fontSize: "28px",
            opacity: 0.06,
            transform: "rotate(-15deg)",
            display: "flex",
          }}
        >
          🐾
        </div>
        <div
          style={{
            position: "absolute",
            top: "160px",
            left: "120px",
            fontSize: "22px",
            opacity: 0.05,
            transform: "rotate(40deg)",
            display: "flex",
          }}
        >
          🐾
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "130px",
            right: "100px",
            fontSize: "24px",
            opacity: 0.05,
            transform: "rotate(-30deg)",
            display: "flex",
          }}
        >
          🐾
        </div>
      </div>
    ),
    { ...size }
  );
}
