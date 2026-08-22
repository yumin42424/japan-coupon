"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, UserRound, Lock } from "lucide-react";
import { updateNickname, changePassword, type SettingsState } from "./actions";
import { JaKo } from "@/components/ja-ko";

const initialState: SettingsState = {};

function Message({ state }: { state: SettingsState }) {
  if (state.error) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-primary" role="alert">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-success" role="status">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {state.success}
      </p>
    );
  }
  return null;
}

export function NicknameForm({ currentNickname }: { currentNickname: string }) {
  const [state, formAction, pending] = useActionState(updateNickname, initialState);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <UserRound className="h-4 w-4 text-primary" />
        <JaKo ja="ニックネーム" ko="닉네임" />
      </h2>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <input
          type="text"
          name="nickname"
          required
          maxLength={30}
          defaultValue={currentNickname}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <Message state={state} />
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <JaKo ja="保存中..." ko="저장 중..." /> : <JaKo ja="保存する" ko="저장하기" />}
        </button>
      </form>
      <p className="mt-2 text-xs text-muted">
        <JaKo
          ja="※ ヘッダーの表示名は再ログイン後に反映されます。"
          ko="※ 상단 표시 이름은 재로그인 후에 반영됩니다."
        />
      </p>
    </section>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Lock className="h-4 w-4 text-primary" />
        <JaKo ja="パスワード変更" ko="비밀번호 변경" />
      </h2>

      {!hasPassword ? (
        <p className="mt-3 text-sm text-muted">
          <JaKo
            ja="LINEログインのアカウントのため、パスワードは設定されていません。"
            ko="LINE 로그인 계정이라 비밀번호가 설정되어 있지 않습니다."
          />
        </p>
      ) : (
        <form action={formAction} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            <JaKo ja="現在のパスワード" ko="현재 비밀번호" />
            <input
              type="password"
              name="currentPassword"
              required
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            <JaKo ja="新しいパスワード" ko="새 비밀번호" />
            <input
              type="password"
              name="newPassword"
              required
              minLength={8}
              placeholder="8文字以上 (8자 이상)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary"
            />
          </label>
          <Message state={state} />
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? <JaKo ja="変更中..." ko="변경 중..." /> : <JaKo ja="変更する" ko="변경하기" />}
          </button>
        </form>
      )}
    </section>
  );
}
