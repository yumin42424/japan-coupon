import type { Metadata } from "next";

// 매장 직원 전용 화면 — 검색 결과에 나오지 않게 한다. 접근 권한 확인은 각 page 가 데이터를 읽기 전에 한다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return children;
}
