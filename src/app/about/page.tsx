import Link from "next/link";

const ROWS: { label: string; body: React.ReactNode }[] = [
  { label: "ご利用料金", body: "会員登録・クーポンの利用は無料です。" },
  { label: "対応言語", body: "サービス内の表記はすべて日本語に対応しています。" },
  {
    label: "掲載店舗",
    body: "掲載店舗は運営者が個別に確認のうえ、日本語対応状況などの情報とあわせてご紹介しています。",
  },
  {
    label: "運営者情報",
    body: (
      <>
        正式名称・所在地・連絡先は事業者情報の確定次第こちらに掲載します。お問い合わせは
        <Link href="/support" className="text-primary underline underline-offset-4">
          サポートページ
        </Link>
        よりご連絡ください。
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">K-Coupon Japanについて</h1>
      <p className="mt-4 text-body-lg text-foreground/80">
        K-Coupon Japanは、韓国を旅行する日本人旅行者向けのクーポンサービスです。明洞・弘大・江南・聖水など人気エリアのグルメ・美容・ショッピング・観光などのお得なクーポンを、日本語でかんたんに探して韓国滞在中にそのまま使えることを目指して開発しています。
      </p>

      <dl className="mt-8 divide-y divide-border border-y border-border">
        {ROWS.map((row) => (
          <div key={row.label} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
            <dt className="text-body font-bold">{row.label}</dt>
            <dd className="text-body text-foreground/80">{row.body}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
