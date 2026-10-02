"use client";

import { usePathname } from "next/navigation";

// admin 영역은 자체 AdminNav가 있어서, 공개 사이트 헤더/푸터(Nav/Footer)까지
// 같이 뜨면 머리말이 두 겹으로 쌓인다 — admin 경로에서는 숨긴다.
export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
