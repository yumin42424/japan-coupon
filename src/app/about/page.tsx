import { Ticket, Languages, ShieldCheck } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        K-Coupon Japanについて
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-foreground/80">
        K-Coupon Japanは、韓国を旅行する日本人旅行者向けのクーポンサービスです。明洞・弘大・江南・聖水など人気エリアのグルメ・美容・ショッピング・観光などのお得なクーポンを、日本語でかんたんに探して韓国滞在中にそのまま使えることを目指して開発しています。
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Ticket className="h-4 w-4" />
          </span>
          <p className="text-sm text-foreground/80">
            会員登録・クーポンの利用は無料です。
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Languages className="h-4 w-4" />
          </span>
          <p className="text-sm text-foreground/80">
            サービス内の表記はすべて日本語に対応しています。
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <p className="text-sm text-foreground/80">
            掲載店舗は日本語対応や日本人旅行者向けの受け入れ実績を確認した上でご紹介しています。
          </p>
        </div>
      </div>

      <p className="mt-8 text-xs text-muted">
        運営者情報（正式名称・所在地・連絡先）は事業者情報の確定次第こちらに掲載します。お問い合わせはサポートページよりご連絡ください。
      </p>
    </main>
  );
}
