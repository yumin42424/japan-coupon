"use client";

import { useActionState, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Search, TicketCheck } from "lucide-react";
import type { RedeemState } from "./actions";
import { QrScanner } from "@/components/qr-scanner";

const initialState: RedeemState = { step: "input" };

// 관리자 화면과 매장 직원 화면이 같은 폼을 쓴다. 어떤 처리 함수를 부를지는 서버 컴포넌트(page)가 정해서 넘겨준다.
export function RedeemForm({
  action,
  resetHref,
}: {
  action: (prevState: RedeemState, formData: FormData) => Promise<RedeemState>;
  resetHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [code, setCode] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleScan = (value: string) => {
    setCode(value);
    // state 반영 후 제출되도록 다음 tick에 submit
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  };

  if (state.step === "done") {
    return (
      <div className="rounded-2xl border border-success/40 bg-success/10 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
        <p className="mt-2 text-h3 text-success">
          使用処理が完了しました
        </p>
        <p className="mt-1 text-body text-muted">
          10ポイントが付与されました。
        </p>
        <a
          href={resetHref}
          className="mt-3 inline-block text-body text-primary underline underline-offset-4"
        >
          別のクーポンを処理する
        </a>
      </div>
    );
  }

  if (state.step === "found") {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-caption text-muted">{state.storeName}</p>
        <p className="text-h3 text-primary">{state.couponTitle}</p>
        <p className="mt-2 text-body">
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
          <input type="hidden" name="reissueKey" value={state.reissueKey} />
          <button
            type="submit"
            disabled={pending}
            className="btn-glossy flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
          >
            <TicketCheck className="h-4 w-4" />
            使用処理する
          </button>
        </form>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input
        type="text"
        name="code"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="クーポンコード"
        className="rounded-lg border border-border bg-card px-3.5 py-2.5 font-mono text-body outline-none focus:border-primary"
      />

      {state.step === "used" && (
        <p className="flex items-center gap-1.5 text-body text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" />
          既に使用済みのクーポンです。
        </p>
      )}
      {state.step === "invalid" && (
        <p className="flex items-center gap-1.5 text-body text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" />
          コードが見つかりません。
        </p>
      )}
      {state.step === "expired" && (
        <p className="flex items-center gap-1.5 text-body text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" />
          このクーポンは有効期限が終了しています。
        </p>
      )}
      {state.step === "forbidden" && (
        <p className="flex items-center gap-1.5 text-body text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" />
          このクーポンは、あなたが担当する店舗のものではありません。
        </p>
      )}
      {state.step === "own" && (
        <p className="flex items-center gap-1.5 text-body text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" />
          ご自身に発行されたクーポンは処理できません。
        </p>
      )}
      {state.step === "unavailable" && (
        <p className="flex items-center gap-1.5 text-body text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" />
          このクーポンまたは店舗は現在停止中です。
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="btn-glossy flex items-center justify-center gap-2 self-start rounded-full px-5 py-2.5 text-body font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          検索
        </button>
        <QrScanner onScan={handleScan} />
      </div>
    </form>
  );
}
