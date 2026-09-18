import Link from "next/link";

const MENU_LINKS = [
  { href: "/coupons", ja: "クーポンを探す" },
  { href: "/coupons", ja: "エリアから探す" },
  { href: "/coupons", ja: "カテゴリーから探す" },
  { href: "/about", ja: "K-Coupon Japanについて" },
  { href: "/#faq", ja: "よくある質問" },
  { href: "/support", ja: "お問い合わせ" },
];

const LEGAL_LINKS = [
  { href: "/terms", ja: "利用規約" },
  { href: "/privacy", ja: "プライバシーポリシー" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/40 px-6 py-10 md:pb-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-extrabold tracking-tight">
            K-Coupon <span className="text-primary">Japan</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            韓国旅行をもっとお得に、もっと便利に。
          </p>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
          <nav className="flex flex-col gap-1.5 text-sm">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Menu</p>
            {MENU_LINKS.map((l) => (
              <Link
                key={l.ja}
                href={l.href}
                className="text-muted transition hover:text-foreground"
              >
                {l.ja}
              </Link>
            ))}
          </nav>

          <nav className="flex flex-col gap-1.5 text-sm">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Legal</p>
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.ja}
                href={l.href}
                className="text-muted transition hover:text-foreground"
              >
                {l.ja}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-3xl text-xs text-muted">
        © {new Date().getFullYear()} K-Coupon Japan
      </p>
    </footer>
  );
}
