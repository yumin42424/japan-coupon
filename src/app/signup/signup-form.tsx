"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail, Lock, UserRound, AlertCircle } from "lucide-react";
import { signup, type SignupState } from "./actions";
import { loginWithLine, loginWithGoogle } from "../login/oauth-actions";
import { JaKo } from "@/components/ja-ko";

const initialState: SignupState = {};

export function SignupForm({ acquisitionSource }: { acquisitionSource: string }) {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <>
      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="acquisitionSource" value={acquisitionSource} />

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-primary" />
            <JaKo ja="メールアドレス" ko="이메일 주소" />
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
            <JaKo ja="パスワード" ko="비밀번호" />
          </span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="rounded-xl border border-border bg-card px-3.5 py-2.5 font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="8文字以上 (8자 이상)"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <UserRound className="h-4 w-4 text-primary" />
            <JaKo ja="ニックネーム" ko="닉네임" />
          </span>
          <input
            type="text"
            name="nickname"
            required
            maxLength={30}
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
          {pending ? (
            <JaKo ja="登録中..." ko="가입 중..." />
          ) : (
            <JaKo ja="無料会員登録" ko="무료 회원가입" />
          )}
        </button>
      </form>

      <div className="mt-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        <JaKo ja="または" ko="또는" />
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <form action={loginWithLine}>
          <button
            type="submit"
            className="w-full rounded-full bg-[#06C755] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <JaKo ja="LINEで登録" ko="LINE로 가입" />
          </button>
        </form>
        <form action={loginWithGoogle}>
          <button
            type="submit"
            className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background"
          >
            <JaKo ja="Googleで登録" ko="Google로 가입" />
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <JaKo ja="既にアカウントをお持ちですか？" ko="이미 계정이 있으신가요?" />{" "}
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">
          <JaKo ja="ログイン" ko="로그인" />
        </Link>
      </p>
    </>
  );
}
