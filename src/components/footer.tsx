import Link from "next/link";

const MENU_LINKS = [
  { href: "/coupons", ja: "クーポンを探す" },
  { href: "/nearby", ja: "現在地から探す" },
  { href: "/ranking", ja: "おすすめランキング" },
  { href: "/guide", ja: "初めての方へ" },
  { href: "/notices", ja: "お知らせ" },
  { href: "/board", ja: "Q&A" },
];

const ABOUT_LINKS = [
  { href: "/about", ja: "K-Coupon Japanについて" },
  { href: "/partnership", ja: "店舗の方へ" },
  { href: "/support", ja: "お問い合わせ" },
];

const LEGAL_LINKS = [
  { href: "/terms", ja: "利用規約" },
  { href: "/privacy", ja: "プライバシーポリシー" },
  { href: "/credits", ja: "画像クレジット" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background-alt px-6 py-10 md:pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-h3 font-display tracking-tight">
            K-Coupon <span className="text-primary">Japan</span>
          </p>
          <p className="mt-1 text-body text-muted">
            日本人旅行者向けの韓国クーポンサイト
          </p>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
          <nav aria-label="フッターメニュー" className="flex flex-col text-body">
            <p className="mb-1 text-label font-bold uppercase tracking-wider text-muted">Menu</p>
            {MENU_LINKS.map((l) => (
              <Link
                key={l.ja}
                href={l.href}
                className="py-1.5 text-muted transition-colors hover:text-foreground"
              >
                {l.ja}
              </Link>
            ))}
          </nav>

          <nav aria-label="サービス情報" className="flex flex-col text-body">
            <p className="mb-1 text-label font-bold uppercase tracking-wider text-muted">About</p>
            {ABOUT_LINKS.map((l) => (
              <Link
                key={l.ja}
                href={l.href}
                className="py-1.5 text-muted transition-colors hover:text-foreground"
              >
                {l.ja}
              </Link>
            ))}
          </nav>

          <nav aria-label="規約・ポリシー" className="flex flex-col text-body">
            <p className="mb-1 text-label font-bold uppercase tracking-wider text-muted">Legal</p>
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.ja}
                href={l.href}
                className="py-1.5 text-muted transition-colors hover:text-foreground"
              >
                {l.ja}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-6xl text-caption text-muted">
        © {new Date().getFullYear()} K-Coupon Japan
      </p>
    </footer>
  );
}
