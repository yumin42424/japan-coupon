"use client";

import { useEffect, useRef, useState } from "react";

/** 뷰포트에 들어올 때마다 살짝 떠오르며 나타나고, 벗어나면 다시 숨는다 —
 * 스크롤을 올렸다 다시 내려도 매번 같은 연출이 반복된다.
 * prefers-reduced-motion이면 처음부터 그냥 보이게 한다. */
export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`motion-reduce:opacity-100 motion-reduce:translate-y-0 transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
