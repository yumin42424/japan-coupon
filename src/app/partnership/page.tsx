import Link from "next/link";

const ROWS = [
  { label: "掲載内容", body: "店舗情報・クーポン内容を日本語で掲載します。" },
  { label: "届ける相手", body: "韓国を旅行する日本人旅行者に絞ったユーザーへ、店舗をご紹介します。" },
  { label: "掲載条件・費用", body: "掲載条件・費用については個別にご案内します。" },
];

export default function PartnershipPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">店舗の方へ（パートナーシップ）</h1>
      <p className="mt-4 text-body-lg text-foreground/80">
        K-Coupon Japanは、日本人旅行者に韓国の店舗を紹介するサービスです。クーポンの掲載や店舗情報の追加にご興味のある店舗様は、下記の窓口までお気軽にご連絡ください。
      </p>

      <dl className="mt-8 divide-y divide-border border-y border-border">
        {ROWS.map((row) => (
          <div key={row.label} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
            <dt className="text-body font-bold">{row.label}</dt>
            <dd className="text-body text-foreground/80">{row.body}</dd>
          </div>
        ))}
      </dl>

      <Link
        href="/support"
        className="btn-glossy mt-8 inline-block rounded-lg px-6 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105"
      >
        提携についてお問い合わせ
      </Link>
    </main>
  );
}
