"use client";

import { useRef, type ReactNode } from "react";

// 마우스 위치에 따라 카드가 살짝 기울어지는 3D 틸트 효과.
// perspective + rotateX/Y를 CSS 변수로 넘겨서 매 프레임 리렌더 없이 처리한다.
export function TiltCard({
  children,
  className = "",
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--ry", `${px * max * 2}deg`);
    el.style.setProperty("--rx", `${-py * max * 2}deg`);
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transform: "perspective(800px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
        transition: "transform 0.15s ease-out",
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </div>
  );
}
