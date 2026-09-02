"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { login, type LoginState } from "./actions";
import { loginWithLine, loginWithGoogle } from "./oauth-actions";
import { SIGNUPS_ENABLED } from "@/lib/feature-flags";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  // LINE/Googleは新規会員登録なら同意チェックが必要なので、まだ登録していない
  // アカウントでここからログインしようとすると signIn コールバックが弾いて
  // ?error= 付きで戻ってくる。その場合だけ案内を出す。
  const hasOAuthError = useSearchParams().has("error");

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-extrabold tracking-tight">
        ログイン
      </h1>

      {hasOAuthError && (
        <p className="mt-4 flex items-start gap-1.5 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-primary" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            ログインできませんでした。初めてご利用の方は
            <Link href="/signup" className="font-semibold underline underline-offset-2">
              無料会員登録
            </Link>
            からお進みください。
          </span>
        </p>
      )}

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
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

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-primary" />
            パスワード
          </span>
          <input
            type="password"
            name="password"
            required
            className="rounded-xl border border-border bg-card px-3.5 py-2.5 font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </label>

        {state.error && (
          <p className="flex items-center gap-1.5 text-sm text-primary" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none"
        >
          {pending ? "ログイン中..." : "ログイン"}
        </button>
      </form>

      {SIGNUPS_ENABLED && (
        <>
          <div className="mt-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            または
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <form action={loginWithLine}>
              <button
                type="submit"
                className="w-full rounded-full bg-[#06C755] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                LINEでログイン
              </button>
            </form>
            <form action={loginWithGoogle}>
              <button
                type="submit"
                className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background"
              >
                Googleでログイン
              </button>
            </form>
          </div>
        </>
      )}

      {SIGNUPS_ENABLED && (
        <p className="mt-6 text-center text-sm text-muted">
          アカウントをお持ちでないですか？{" "}
          <Link href="/signup" className="font-medium text-primary underline underline-offset-4">
            無料会員登録
          </Link>
        </p>
      )}
    </main>
  );
}
