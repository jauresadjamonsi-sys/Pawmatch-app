"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitioning, setTransitioning] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current === pathname) {
      setDisplayChildren(children);
      return;
    }
    prevPath.current = pathname;

    // Start exit animation
    setTransitioning(true);
    setAnimDone(false);

    // After exit animation, swap children and enter
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setTransitioning(false);
    }, 120); // Short exit duration

    return () => clearTimeout(timer);
  }, [pathname, children]);

  // After enter animation completes, clear transform to avoid
  // creating a containing block that breaks fixed positioning
  useEffect(() => {
    if (!transitioning) {
      const timer = setTimeout(() => setAnimDone(true), 300);
      return () => clearTimeout(timer);
    }
  }, [transitioning]);

  return (
    <div
      id="main-content"
      className={transitioning ? "page-exit" : animDone ? "" : "page-enter"}
      style={{ minHeight: "calc(100vh - 120px)" }}
    >
      {displayChildren}
    </div>
  );
}
