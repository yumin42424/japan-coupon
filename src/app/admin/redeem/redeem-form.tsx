"use client";

import { useActionState } from "react";
import { CheckCircle2, AlertCircle, Search, TicketCheck } from "lucide-react";
import { processRedeem, type RedeemState } from "./actions";

const initialState: RedeemState = { step: "input" };

export function RedeemForm() {
  const [state, formAction, pending] = useActionState(processRedeem, initialState);

  if (state.step === "done") {
    return (
      <div className="rounded-2xl border border-success/40 bg-success/10 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
        <p className="mt-2 font-bold text-success">
          使用処理が完了しました
        </p>
        <p className="mt-1 text-sm text-muted">
          10ポイントが付与されました。
        </p>
        <a
          href="/admin/redeem"
          className="mt-3 inline-block text-sm text-primary underline underline-offset-4"
        >
          別のクーポンを処理する
        </a>
      </div>
    );
  }

  if (state.step === "found") {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs text-muted">{state.storeName}</p>
        <p className="font-bold text-primary">{state.couponTitle}</p>
        <p className="mt-2 text-sm">
          <span className="text-muted">
            会員:{" "}
          </span>
          {state.nickname}
        </p>
        <form action={formAction} className="mt-4">
          <input type="hidden" name="confirm" value="true" />
          <input type="hidden" name="issueEventId" value={state.issueEventId} />
          <input type="hidden" name="couponId" value={state.couponId} />
          <input type="hidden" name="userId" value={state.userId} />
          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50"
          >
            <TicketCheck className="h-4 w-4" />
            使用処理する
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        type="text"
        name="code"
        required
        placeholder="クーポンコード"
        className="rounded-lg border border-border bg-card px-3.5 py-2.5 font-mono text-sm outline-none focus:border-primary"
      />

      {state.step === "used" && (
        <p className="flex items-center gap-1.5 text-sm text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" />
          既に使用済みのクーポンです。
        </p>
      )}
      {state.step === "invalid" && (
        <p className="flex items-center gap-1.5 text-sm text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" />
          コードが見つかりません。
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        <Search className="h-4 w-4" />
        検索
      </button>
    </form>
  );
}
