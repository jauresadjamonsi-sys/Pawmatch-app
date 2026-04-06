export default function AnimalsLoading() {
  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Title skeleton */}
        <div
          className="h-8 w-64 rounded-lg mb-2 animate-pulse"
          style={{ background: "var(--c-border, #E8E2D9)" }}
        />
        <div
          className="h-5 w-80 rounded-lg mb-6 animate-pulse"
          style={{ background: "var(--c-border, #E8E2D9)", opacity: 0.6 }}
        />

        {/* Filters skeleton */}
        <div className="flex flex-wrap gap-3 mb-8">
          {[160, 140, 150].map((w, i) => (
            <div
              key={i}
              className="h-10 rounded-xl animate-pulse"
              style={{
                width: `${w}px`,
                background: "var(--c-border, #E8E2D9)",
                opacity: 0.5,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{
                border: "1px solid var(--c-border, #E8E2D9)",
                background: "var(--c-card, #FFFFFF)",
              }}
            >
              <div
                className="aspect-square animate-pulse"
                style={{
                  background: "var(--c-border, #E8E2D9)",
                  opacity: 0.5,
                  animationDelay: `${i * 75}ms`,
                }}
              />
              <div className="p-4 space-y-2">
                <div
                  className="h-4 w-20 rounded animate-pulse"
                  style={{
                    background: "var(--c-border, #E8E2D9)",
                    animationDelay: `${i * 75 + 50}ms`,
                  }}
                />
                <div
                  className="h-3 w-16 rounded animate-pulse"
                  style={{
                    background: "var(--c-border, #E8E2D9)",
                    opacity: 0.6,
                    animationDelay: `${i * 75 + 100}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
