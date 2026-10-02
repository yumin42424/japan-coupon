import { MessageCircleQuestion } from "lucide-react";

const LINE_URL = "https://line.me/R/ti/p/@490gzucs";

export default function SupportPage() {
  return (
    <main className="relative flex min-h-[calc(100vh-65px)] items-center justify-center px-6 py-12">
      <div className="relative flex w-full max-w-sm flex-col items-center rounded-3xl border border-border bg-card p-7 text-center shadow-elevated sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageCircleQuestion className="h-6 w-6" />
        </span>
        <h1 className="text-h1 font-display mt-4 tracking-tight">
          カスタマーサポート
        </h1>
        <p className="mt-2 text-body leading-relaxed text-muted">
          ご不明な点は、LINE公式アカウント（@490gzucs）よりお気軽にお問い合わせください。担当者が確認次第、順次ご返信いたします。
        </p>
        <a
          href={LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center gap-2 self-center rounded-full bg-[#06C755] px-6 py-3 text-body font-semibold text-white shadow-card transition hover:opacity-90"
        >
          LINEで問い合わせる
        </a>
        <p className="mt-4 text-caption text-muted">
          よくあるご質問は、トップページの「よくある質問」もあわせてご確認ください。
        </p>
      </div>
    </main>
  );
}
