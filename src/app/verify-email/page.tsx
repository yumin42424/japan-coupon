import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, XCircle, MailCheck } from "lucide-react";
import { confirmEmail } from "./actions";

export const metadata: Metadata = {
  title: "メールアドレスの確認",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const { token, status } = await searchParams;
  const done = status === "done";
  // token이 있고 아직 결과(status)가 없으면 "확인 버튼" 화면, 그 외에는 결과 화면.
  const needsConfirm = !!token && !status;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col items-center justify-center px-6 py-12 text-center">
      {needsConfirm ? (
        <>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </span>
          <h1 className="text-h1 font-display mt-4 tracking-tight">メールアドレスの確認</h1>
          <p className="mt-2 text-body text-muted">下のボタンを押して、メールアドレスの確認を完了してください。</p>
          <form action={confirmEmail} className="mt-6 w-full">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="btn-glossy w-full rounded-full px-6 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105"
            >
              確認する
            </button>
          </form>
        </>
      ) : done ? (
        <>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h1 className="text-h1 font-display mt-4 tracking-tight">確認できました</h1>
          <p className="mt-2 text-body text-muted">メールアドレスの確認が完了しました。</p>
        </>
      ) : (
        <>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <XCircle className="h-6 w-6" />
          </span>
          <h1 className="text-h1 font-display mt-4 tracking-tight">確認できませんでした</h1>
          <p className="mt-2 text-body text-muted">リンクの有効期限が切れているか、すでに使用されています。</p>
        </>
      )}
      <Link
        href="/mypage"
        className={`mt-6 rounded-full px-6 py-3 text-body font-bold transition ${
          needsConfirm
            ? "text-muted hover:text-foreground"
            : "btn-glossy text-primary-foreground hover:brightness-105"
        }`}
      >
        マイページへ
      </Link>
    </main>
  );
}
