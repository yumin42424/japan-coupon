import Link from "next/link";
import { JaKo } from "@/components/ja-ko";

const LINKS = [
  { href: "/terms", ja: "利用規約", ko: "이용약관" },
  { href: "/privacy", ja: "プライバシーポリシー", ko: "개인정보처리방침" },
  { href: "/partnership", ja: "パートナーシップ", ko: "파트너십" },
  { href: "/support", ja: "カスタマーサポート", ko: "고객지원" },
  { href: "/about", ja: "会社概要", ko: "회사소개" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/40 px-6 py-10 md:pb-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-extrabold tracking-tight">
            K-Coupon <span className="text-primary">Japan</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            <JaKo ja="韓国旅行を、もっとお得に。" ko="한국여행을, 더 알뜰하게." />
          </p>
        </div>

        <nav className="flex flex-col gap-1.5 text-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Links</p>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-muted transition hover:text-foreground"
            >
              <JaKo ja={l.ja} ko={l.ko} />
            </Link>
          ))}
        </nav>
      </div>

      <p className="mx-auto mt-8 max-w-3xl text-xs text-muted">
        © {new Date().getFullYear()} K-Coupon Japan. All rights reserved.
      </p>
    </footer>
  );
}
