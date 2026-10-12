import type { Metadata } from "next";

// 로그인·계정·개인 화면은 검색엔진에 노출하지 않는다 (접근 제어는 별도로 서버에서 수행하며, noindex는 노출 방지용).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
