import Link from "next/link";
import { Store, TrendingUp, MessageCircle } from "lucide-react";

export default function PartnershipPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        パートナーシップ
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-foreground/80">
        K-Coupon Japanは、日本人旅行者に韓国の店舗を紹介するサービスです。クーポンの掲載や店舗情報の追加にご興味のある店舗様は、下記の窓口までお気軽にご連絡ください。
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Store className="h-4 w-4" />
          </span>
          <p className="text-sm text-foreground/80">
            店舗情報・クーポン内容を日本語で掲載します。
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </span>
          <p className="text-sm text-foreground/80">
            日本人旅行者に絞ったユーザーへ店舗を届けます。
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageCircle className="h-4 w-4" />
          </span>
          <p className="text-sm text-foreground/80">
            掲載条件・費用については個別にご案内します。
          </p>
        </div>
      </div>

      <Link
        href="/support"
        className="btn-glossy mt-8 inline-block rounded-full px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-105"
      >
        提携についてお問い合わせ
      </Link>
    </main>
  );
}
