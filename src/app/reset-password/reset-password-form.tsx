"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { resetPassword, type ResetPasswordState } from "./actions";
import { useT } from "@/i18n/client";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <main className="relative flex min-h-[calc(100vh-65px)] items-center justify-center px-6 py-12">
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-7 sm:p-8">
        <h1 className="text-h1 font-display tracking-tight">
          {t("新しいパスワード")}
        </h1>

        {!token && (
          <p className="mt-4 flex items-start gap-1.5 rounded-xl border border-primary/30 bg-primary/5 p-3 text-body text-primary" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {t("リンクが無効です。もう一度パスワード再設定をお試しください。")}
          </p>
        )}

        <form action={formAction} className="mt-8 flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <label className="flex flex-col gap-1.5 text-body font-medium">
            <span className="flex items-center gap-1.5">
              {t("新しいパスワード")}
            </span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder={t("8文字以上")}
              className="rounded-xl border border-border bg-card px-3.5 py-2.5 font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          {state.error && (
            <p className="flex items-center gap-1.5 text-body text-primary" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t(state.error)}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !token}
            className="btn-glossy mt-2 rounded-lg px-4 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
          >
            {pending ? t("更新中...") : t("パスワードを更新")}
          </button>
        </form>
      </div>
    </main>
  );
}
