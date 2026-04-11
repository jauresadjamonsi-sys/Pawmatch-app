"use client";

import BackButton from "./BackButton";

interface Props {
  title: string;
  fallback?: string;
  right?: React.ReactNode;
}

/** Reusable page header with back button. Drop into any inner page. */
export default function PageHeader({ title, fallback = "/", right }: Props) {
  return (
    <header className="flex items-center gap-3 mb-4">
      <BackButton fallback={fallback} />
      <h1
        className="flex-1 text-lg font-bold truncate"
        style={{ color: "var(--c-text)" }}
      >
        {title}
      </h1>
      {right && <div className="flex-shrink-0">{right}</div>}
    </header>
  );
}
