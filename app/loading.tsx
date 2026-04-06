export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--c-deep, #F0ECE4)" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div
            className="w-14 h-14 rounded-full animate-spin"
            style={{
              border: "2px solid var(--c-border, #E8E2D9)",
              borderTopColor: "var(--c-accent, #EA580C)",
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center text-2xl"
            aria-hidden="true"
          >
            🐾
          </div>
        </div>
        <p
          className="text-sm animate-pulse"
          style={{ color: "var(--c-text-muted, #3d3833)" }}
        >
          Chargement...
        </p>
      </div>
    </div>
  );
}
