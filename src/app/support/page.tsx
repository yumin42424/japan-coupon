import { MessageCircleQuestion } from "lucide-react";

export default function SupportPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col justify-center px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageCircleQuestion className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
        カスタマーサポート
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        ご不明な点は、LINE公式アカウント（@490gzucs）よりお気軽にお問い合わせください。担当者が確認次第、順次ご返信いたします。
      </p>
      <p className="mt-4 text-xs text-muted">
        よくあるご質問は、トップページの「よくある質問」もあわせてご確認ください。
      </p>
    </main>
  );
}
