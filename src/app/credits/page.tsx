import type { Metadata } from "next";
import { IMAGE_CREDITS } from "@/lib/image-credits";

export const metadata: Metadata = {
  title: "画像クレジット",
  description: "K-Coupon Japanで使用している写真の撮影者・ライセンス・出典の一覧です。",
};

export default function CreditsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">画像クレジット</h1>
      <p className="mt-3 text-body text-muted">
        当サイトのカテゴリ・エリアの代表画像には、Wikimedia Commons で公開されているクリエイティブ・コモンズ（CC）ライセンスの写真を使用しています。
        掲載にあたり、表示サイズに合わせてリサイズ・トリミングしています。
      </p>
      <p className="mt-2 text-body text-muted">
        これらは実際の提携店舗の写真ではなく、カテゴリやエリアのイメージです。
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {IMAGE_CREDITS.map((c) => (
          <li key={c.slug} className="rounded-xl border border-border bg-card p-4 text-caption">
            <p className="text-body font-bold">{c.usage}</p>
            <dl className="mt-2 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1">
              <dt className="text-muted">タイトル</dt>
              <dd className="break-words">{c.title}</dd>
              <dt className="text-muted">撮影者</dt>
              <dd className="break-words">{c.author}</dd>
              <dt className="text-muted">ライセンス</dt>
              <dd>
                <a
                  href={c.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  {c.license}
                </a>
              </dd>
              <dt className="text-muted">出典</dt>
              <dd>
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary underline underline-offset-2"
                >
                  Wikimedia Commons
                </a>
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </main>
  );
}
