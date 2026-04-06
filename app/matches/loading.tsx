export default function MatchesLoading() {
  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "var(--c-deep, #1a1225)" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Title skeleton */}
        <div
          className="h-8 w-48 rounded-lg mb-2 animate-pulse"
          style={{ background: "var(--c-border, #524878)" }}
        />
        <div
          className="h-4 w-24 rounded-lg mb-6 animate-pulse"
          style={{ background: "var(--c-border, #524878)", opacity: 0.6 }}
        />

        {/* Tab skeleton */}
        <div className="flex gap-2 mb-6">
          {[80, 72, 96, 88].map((w, i) => (
            <div
              key={i}
              className="h-10 rounded-full animate-pulse"
              style={{
                width: `${w}px`,
                background: "var(--c-border, #524878)",
                opacity: 0.4,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>

        {/* Section title skeleton */}
        <div
          className="h-4 w-32 rounded mb-3 animate-pulse"
          style={{ background: "var(--c-border, #524878)", opacity: 0.5 }}
        />

        {/* Match cards skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl p-5"
              style={{
                border: "1px solid var(--c-border, #524878)",
                background: "var(--c-card, #3d3462)",
                opacity: 0.6,
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                {/* Two avatar circles with arrow */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-full animate-pulse"
                    style={{
                      background: "var(--c-border, #524878)",
                      animationDelay: `${i * 150}ms`,
                    }}
                  />
                  <div className="space-y-1">
                    <div
                      className="h-3 w-16 rounded animate-pulse"
                      style={{ background: "var(--c-border, #524878)" }}
                    />
                    <div
                      className="h-2.5 w-12 rounded animate-pulse"
                      style={{
                        background: "var(--c-border, #524878)",
                        opacity: 0.6,
                      }}
                    />
                  </div>
                </div>
                <div
                  className="w-6 h-4 rounded animate-pulse mx-1"
                  style={{
                    background: "var(--c-border, #524878)",
                    opacity: 0.4,
                  }}
                />
                <div className="flex items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-full animate-pulse"
                    style={{
                      background: "var(--c-border, #524878)",
                      animationDelay: `${i * 150 + 75}ms`,
                    }}
                  />
                  <div className="space-y-1">
                    <div
                      className="h-3 w-16 rounded animate-pulse"
                      style={{ background: "var(--c-border, #524878)" }}
                    />
                    <div
                      className="h-2.5 w-12 rounded animate-pulse"
                      style={{
                        background: "var(--c-border, #524878)",
                        opacity: 0.6,
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Action buttons skeleton */}
              <div className="flex gap-3">
                <div
                  className="flex-1 h-10 rounded-xl animate-pulse"
                  style={{
                    background: "var(--c-border, #524878)",
                    opacity: 0.5,
                  }}
                />
                <div
                  className="flex-1 h-10 rounded-xl animate-pulse"
                  style={{
                    background: "var(--c-border, #524878)",
                    opacity: 0.3,
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
