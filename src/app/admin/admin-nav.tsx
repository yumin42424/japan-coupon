import Link from "next/link";
import { LayoutDashboard, Store, Tag, Link2, TicketCheck, Megaphone } from "lucide-react";

const LINKS = [
  { href: "/admin", icon: LayoutDashboard, ja: "ダッシュボード" },
  { href: "/admin/stores", icon: Store, ja: "店舗管理" },
  { href: "/admin/coupons", icon: Tag, ja: "クーポン管理" },
  { href: "/admin/redeem", icon: TicketCheck, ja: "使用処理" },
  { href: "/admin/notices", icon: Megaphone, ja: "お知らせ管理" },
  { href: "/admin/landing-pages", icon: Link2, ja: "LP管理" },
];

// admin 하위 모든 페이지가 각자 독립된 화면이라 대시보드 밖으로 나가면 돌아올 길이
// 브라우저 뒤로가기뿐이었음 — 모든 admin 페이지에 공통으로 뜨는 네비바로 고정.
export function AdminNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-6 py-3">
        <Link href="/" className="mr-2 shrink-0 text-caption font-bold tracking-tight text-foreground/70 hover:text-foreground">
          K-Coupon <span className="text-primary">Admin</span>
        </Link>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-caption font-medium text-foreground/70 transition hover:bg-card hover:text-foreground"
          >
            <l.icon className="h-3.5 w-3.5" strokeWidth={2.25} />
            {l.ja}
          </Link>
        ))}
      </div>
    </header>
  );
}
