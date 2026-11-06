"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { signup, signupWithLine, signupWithGoogle, type SignupState } from "./actions";
import { useT } from "@/i18n/client";

const initialState: SignupState = {};

export function SignupForm({
  acquisitionSource,
  callbackUrl,
}: {
  acquisitionSource: string;
  callbackUrl?: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const canSubmit = agreeTerms && agreePrivacy;
  const isRateLimited = useSearchParams().get("error") === "rate_limited";

  return (
    <>
      {isRateLimited && (
        <p className="mt-4 flex items-start gap-1.5 rounded-xl border border-primary/30 bg-primary/5 p-3 text-body text-primary" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {t("登録の試行回数が多すぎます。しばらくしてからもう一度お試しください。")}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-2.5">
        <form action={signupWithLine}>
          <input type="hidden" name="agreeTerms" value={agreeTerms ? "on" : ""} />
          <input type="hidden" name="agreePrivacy" value={agreePrivacy ? "on" : ""} />
          <input type="hidden" name="agreeMarketing" value={agreeMarketing ? "on" : ""} />
          {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-[#06C755] px-4 py-3 text-body font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-40"
          >
            {t("LINEで続ける")}
          </button>
        </form>
        <form action={signupWithGoogle}>
          <input type="hidden" name="agreeTerms" value={agreeTerms ? "on" : ""} />
          <input type="hidden" name="agreePrivacy" value={agreePrivacy ? "on" : ""} />
          <input type="hidden" name="agreeMarketing" value={agreeMarketing ? "on" : ""} />
          {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-body font-semibold text-foreground shadow-card transition hover:bg-background disabled:opacity-40"
          >
            {t("Googleで続ける")}
          </button>
        </form>
      </div>

      <div className="mt-5 flex items-center gap-3 text-caption text-muted">
        <span className="h-px flex-1 bg-border" />
        {t("または")}
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <input type="hidden" name="acquisitionSource" value={acquisitionSource} />
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

        <label className="flex flex-col gap-1.5 text-body font-medium">
          <span className="flex items-center gap-1.5">
            {t("メールアドレス")}
          </span>
          <input
            type="email"
            name="email"
            required
            className="rounded-xl border border-border bg-card px-3.5 py-2.5 font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-body font-medium">
          <span className="flex items-center gap-1.5">
            {t("パスワード")}
          </span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="rounded-xl border border-border bg-card px-3.5 py-2.5 font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder={t("8文字以上")}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-body font-medium">
          <span className="flex items-center gap-1.5">
            {t("ニックネーム")}
          </span>
          <input
            type="text"
            name="nickname"
            required
            maxLength={30}
            className="rounded-xl border border-border bg-card px-3.5 py-2.5 font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </label>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 text-body">
          <label className="flex cursor-pointer items-start gap-2.5 py-1">
            <input
              type="checkbox"
              name="agreeTerms"
              required
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary-dark)]"
            />
            <span>
              <span className="font-medium text-primary">{t("(必須)")}</span>{" "}
              <Link href="/terms" target="_blank" className="underline underline-offset-2">
                {t("利用規約")}
              </Link>
              {t("に同意します。")}
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 py-1">
            <input
              type="checkbox"
              name="agreePrivacy"
              required
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary-dark)]"
            />
            <span>
              <span className="font-medium text-primary">{t("(必須)")}</span>{" "}
              <Link href="/privacy" target="_blank" className="underline underline-offset-2">
                {t("プライバシーポリシー")}
              </Link>
              {t("を確認しました。")}
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 py-1">
            <input
              type="checkbox"
              name="agreeMarketing"
              checked={agreeMarketing}
              onChange={(e) => setAgreeMarketing(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary-dark)]"
            />
            <span>
              <span className="font-medium text-muted">{t("(任意)")}</span>{" "}
              {t("お得な情報のメール受信に同意します。")}
            </span>
          </label>
        </div>

        {!canSubmit && (
          <p className="text-center text-caption font-medium text-primary">
            {t("利用規約・プライバシーポリシーに同意すると、上のLINE・Google登録ボタンも有効になります。")}
          </p>
        )}

        {state.error && (
          <p className="flex items-center gap-1.5 text-body text-primary" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t(state.error)}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="btn-glossy mt-2 rounded-lg px-4 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
        >
          {pending ? t("登録中...") : t("無料会員登録")}
        </button>
      </form>

      <p className="mt-6 text-center text-body text-muted">
        {t("既にアカウントをお持ちですか？")}{" "}
        <Link
          href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
          className="font-medium text-primary underline underline-offset-4"
        >
          {t("ログイン")}
        </Link>
      </p>
    </>
  );
}
