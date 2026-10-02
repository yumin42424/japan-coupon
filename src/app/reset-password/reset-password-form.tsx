"use client";

import { useActionState } from "react";
import { Lock, AlertCircle } from "lucide-react";
import { resetPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <main className="relative flex min-h-[calc(100vh-65px)] items-center justify-center px-6 py-12">
      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-elevated sm:p-8">
        <h1 className="text-h1 font-display tracking-tight">
          新しいパスワード
        </h1>

        {!token && (
          <p className="mt-4 flex items-start gap-1.5 rounded-xl border border-primary/30 bg-primary/5 p-3 text-body text-primary" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            リンクが無効です。もう一度パスワード再設定をお試しください。
          </p>
        )}

        <form action={formAction} className="mt-8 flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <label className="flex flex-col gap-1.5 text-body font-medium">
            <span className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-primary" />
              新しいパスワード
            </span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="8文字以上"
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
            disabled={pending || !token}
            className="btn-glossy mt-2 rounded-full px-4 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
          >
            {pending ? "更新中..." : "パスワードを更新"}
          </button>
        </form>
      </div>
    </main>
  );
}
