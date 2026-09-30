"use client";

import { useEffect, useState } from "react";

/** ヘッダーの見た目だけを担当するクライアント境界 — スクロールすると
 * 背景がより不透明になり、微かな影が付いて「浮いている」感じを出す。 */
export function ScrollHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-10 border-b px-4 py-3.5 backdrop-blur-md transition-shadow duration-300 sm:px-6 ${
        scrolled ? "border-border bg-background/95 shadow-card" : "border-border/80 bg-background/80"
      }`}
    >
      {children}
    </header>
  );
}
