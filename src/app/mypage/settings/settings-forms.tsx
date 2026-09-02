"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, UserRound, Lock, UserX } from "lucide-react";
import { updateNickname, changePassword, deleteAccount, type SettingsState } from "./actions";

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
        ニックネーム
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
          {pending ? "保存中..." : "保存する"}
        </button>
      </form>
      <p className="mt-2 text-xs text-muted">
        ※ ヘッダーの表示名は再ログイン後に反映されます。
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
        パスワード変更
      </h2>

      {!hasPassword ? (
        <p className="mt-3 text-sm text-muted">
          LINEログインのアカウントのため、パスワードは設定されていません。
        </p>
      ) : (
        <form action={formAction} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            現在のパスワード
            <input
              type="password"
              name="currentPassword"
              required
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            新しいパスワード
            <input
              type="password"
              name="newPassword"
              required
              minLength={8}
              placeholder="8文字以上"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary"
            />
          </label>
          <Message state={state} />
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "変更中..." : "変更する"}
          </button>
        </form>
      )}
    </section>
  );
}

export function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(deleteAccount, initialState);

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold text-primary">
        <UserX className="h-4 w-4" />
        退会
      </h2>
      <p className="mt-2 text-sm text-foreground/80">
        退会すると、保有クーポン・お気に入り・ポイントなどすべてのデータが削除され、元に戻せません。
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-full border border-primary/40 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
        >
          退会する
        </button>
      ) : (
        <form action={formAction} className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "退会処理中..." : "本当に退会する"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-background disabled:opacity-50"
            >
              キャンセル
            </button>
          </div>
          <Message state={state} />
        </form>
      )}
    </section>
  );
}
