"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitioning, setTransitioning] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current === pathname) {
      setDisplayChildren(children);
      return;
    }
    prevPath.current = pathname;

    // Start exit animation
    setTransitioning(true);

    // After exit animation, swap children and enter
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setTransitioning(false);
    }, 120); // Short exit duration

    return () => clearTimeout(timer);
  }, [pathname, children]);

  return (
    <div
      id="main-content"
      className={transitioning ? "page-exit" : "page-enter"}
      style={{ minHeight: "calc(100vh - 120px)" }}
    >
      {displayChildren}
    </div>
  );
}
