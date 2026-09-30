import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { consumeAuthToken } from "@/lib/auth-tokens";

export const metadata: Metadata = {
  title: "メールアドレスの確認",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const userId = token ? await consumeAuthToken(token, "email_verify") : null;

  if (userId) {
    await supabaseAdmin
      .from("users")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", userId);
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col items-center justify-center px-6 py-12 text-center">
      {userId ? (
        <>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h1 className="text-h1 font-display mt-4 tracking-tight">
            確認できました
          </h1>
          <p className="mt-2 text-body text-muted">
            メールアドレスの確認が完了しました。
          </p>
        </>
      ) : (
        <>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <XCircle className="h-6 w-6" />
          </span>
          <h1 className="text-h1 font-display mt-4 tracking-tight">
            確認できませんでした
          </h1>
          <p className="mt-2 text-body text-muted">
            リンクの有効期限が切れているか、すでに使用されています。
          </p>
        </>
      )}
      <Link
        href="/mypage"
        className="btn-glossy mt-6 rounded-full px-6 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105"
      >
        マイページへ
      </Link>
    </main>
  );
}
