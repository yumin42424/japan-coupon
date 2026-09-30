"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail, AlertCircle } from "lucide-react";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <main className="relative flex min-h-[calc(100vh-65px)] items-center justify-center overflow-hidden px-6 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
        <div className="bg-blob -right-20 -top-24 h-80 w-80 opacity-[0.06]" />
        <div className="bg-blob -left-24 bottom-0 h-72 w-72 opacity-[0.05]" />
      </div>
      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-elevated sm:p-8">
        <h1 className="text-h1 font-display tracking-tight">
          パスワード再設定
        </h1>
        <p className="mt-2 text-body text-muted">
          ご登録のメールアドレスを入力してください。再設定用のリンクをお送りします。
        </p>

        {state.submitted ? (
          <p className="mt-6 rounded-xl border border-border bg-background p-4 text-body">
            メールを送信しました。届かない場合は迷惑メールフォルダもご確認ください。
          </p>
        ) : (
          <form action={formAction} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-body font-medium">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-primary" />
                メールアドレス
              </span>
              <input
                type="email"
                name="email"
                required
                className="rounded-xl border border-border bg-card px-3.5 py-2.5 font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>

            {state.error && (
              <p className="flex items-center gap-1.5 text-body text-primary" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="btn-glossy mt-2 rounded-full px-4 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
            >
              {pending ? "送信中..." : "再設定メールを送る"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-body text-muted">
          <Link href="/login" className="font-medium text-primary underline underline-offset-4">
            ログインに戻る
          </Link>
        </p>
      </div>
    </main>
  );
}
