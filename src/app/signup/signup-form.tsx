"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Mail, Lock, UserRound, AlertCircle } from "lucide-react";
import { signup, signupWithLine, signupWithGoogle, type SignupState } from "./actions";

const initialState: SignupState = {};

export function SignupForm({ acquisitionSource }: { acquisitionSource: string }) {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const canSubmit = agreeTerms && agreePrivacy;

  return (
    <>
      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="acquisitionSource" value={acquisitionSource} />

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
            placeholder="you@example.com"
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
            minLength={8}
            className="rounded-xl border border-border bg-card px-3.5 py-2.5 font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="8文字以上"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <UserRound className="h-4 w-4 text-primary" />
            ニックネーム
          </span>
          <input
            type="text"
            name="nickname"
            required
            maxLength={30}
            className="rounded-xl border border-border bg-card px-3.5 py-2.5 font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </label>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="agreeTerms"
              required
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-primary">(必須)</span>{" "}
              <Link href="/terms" target="_blank" className="underline underline-offset-2">
                利用規約
              </Link>
              に同意します。
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="agreePrivacy"
              required
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-primary">(必須)</span>{" "}
              <Link href="/privacy" target="_blank" className="underline underline-offset-2">
                プライバシーポリシー
              </Link>
              に同意します。
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="agreeMarketing"
              checked={agreeMarketing}
              onChange={(e) => setAgreeMarketing(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-muted">(任意)</span>{" "}
              お得な情報のメール受信に同意します。
            </span>
          </label>
        </div>

        {state.error && (
          <p className="flex items-center gap-1.5 text-sm text-primary" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="mt-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none"
        >
          {pending ? "登録中..." : "無料会員登録"}
        </button>
      </form>

      <div className="mt-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        または
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <form action={signupWithLine}>
          <input type="hidden" name="agreeTerms" value={agreeTerms ? "on" : ""} />
          <input type="hidden" name="agreePrivacy" value={agreePrivacy ? "on" : ""} />
          <input type="hidden" name="agreeMarketing" value={agreeMarketing ? "on" : ""} />
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-full bg-[#06C755] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            LINEで登録
          </button>
        </form>
        <form action={signupWithGoogle}>
          <input type="hidden" name="agreeTerms" value={agreeTerms ? "on" : ""} />
          <input type="hidden" name="agreePrivacy" value={agreePrivacy ? "on" : ""} />
          <input type="hidden" name="agreeMarketing" value={agreeMarketing ? "on" : ""} />
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background disabled:opacity-40"
          >
            Googleで登録
          </button>
        </form>
        {!canSubmit && (
          <p className="text-center text-xs text-muted">
            上の必須項目に同意すると、SNS登録ボタンが有効になります。
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        既にアカウントをお持ちですか？{" "}
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">
          ログイン
        </Link>
      </p>
    </>
  );
}
