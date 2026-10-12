"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Lock, Loader2 } from "lucide-react";
import { spendPoints, checkPointUse } from "./actions";
import type { PointUseResult } from "@/lib/point-use";

type Option = { id: string; label: string; description: string; cost: number };

const RESULT_MESSAGES: Record<string, string> = {
  insufficient: "ポイントが不足しています。",
  option_unavailable: "このポイント利用先は現在ご利用いただけません。",
  disabled: "ポイントの利用機能は準備中です。",
  invalid_request: "リクエストを処理できませんでした。画面を読み込み直してから、もう一度お試しください。",
  unauthenticated: "ログインが必要です。",
  error: "サーバーでエラーが発生しました。下の「処理状況を確認する」で、ポイントが引かれたかどうかを確認できます。",
};

export function PointUsePanel({
  balance,
  enabled,
  options,
}: {
  balance: number;
  enabled: boolean;
  options: Option[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Option | null>(null);
  // 같은 "확정" 시도는 항상 같은 requestId를 쓴다 — 재전송·연타·통신 오류 후 재시도에도 서버가 한 번만 처리한다.
  const [requestId, setRequestId] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PointUseResult | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [checkNote, setCheckNote] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const open = (option: Option) => {
    setSelected(option);
    setRequestId(crypto.randomUUID());
    setResult(null);
    setNetworkError(false);
    setCheckNote(null);
  };

  const close = () => {
    if (submittingRef.current) return;
    const done = result?.status === "success" || result?.status === "already_processed";
    setSelected(null);
    setResult(null);
    setNetworkError(false);
    setCheckNote(null);
    if (done) router.refresh();
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, result]);

  const confirm = async () => {
    if (!selected || submittingRef.current) return; // 버튼 비활성화만 믿지 않고 핸들러에서도 한 번 더 막는다
    submittingRef.current = true;
    setPending(true);
    setNetworkError(false);
    setCheckNote(null);
    try {
      const r = await spendPoints({ optionId: selected.id, requestId });
      setResult(r);
      if (r.status === "success" || r.status === "already_processed") router.refresh();
    } catch {
      setNetworkError(true);
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  };

  const checkStatus = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPending(true);
    try {
      const c = await checkPointUse(requestId);
      if (!c.known) {
        setCheckNote("処理状況を確認できませんでした。しばらくしてから、もう一度お試しください。");
      } else if (c.applied) {
        setResult({ status: "already_processed", used: c.used, balance: c.balance });
        setNetworkError(false);
        router.refresh();
      } else {
        setCheckNote("このリクエストはまだ処理されていません（ポイントは引かれていません）。もう一度「利用を確定する」を押しても、二重に引かれることはありません。");
      }
    } catch {
      setCheckNote("通信エラーが発生しました。しばらくしてから、もう一度お試しください。");
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  };

  if (!enabled || options.length === 0) {
    return (
      <section className="mt-6 rounded-2xl border border-dashed border-border bg-card p-5">
        <p className="flex items-center gap-2 text-h3">
          <Lock className="h-5 w-5 text-muted" />
          ポイントの利用機能は準備中です
        </p>
        <p className="mt-2 text-body text-muted">ポイントの利用方法・条件は、決まり次第お知らせします。</p>
        <button
          type="button"
          disabled
          className="mt-4 rounded-full bg-border px-5 py-2.5 text-body font-bold text-muted"
        >
          ポイントを使う（準備中）
        </button>
      </section>
    );
  }

  const done = result?.status === "success" || result?.status === "already_processed";
  const insufficient = !!selected && balance < selected.cost;

  return (
    <section className="mt-6">
      <h2 className="text-h3">ポイントを使う</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {options.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0">
              <p className="text-body font-bold">{o.label}</p>
              <p className="text-caption text-muted">{o.description}</p>
              <p className="mt-1 text-caption font-bold text-primary">{o.cost.toLocaleString()}pt</p>
            </div>
            <button
              type="button"
              onClick={() => open(o)}
              className="btn-glossy shrink-0 rounded-full px-4 py-2 text-body font-bold text-primary-foreground transition hover:brightness-105"
            >
              ポイントを使う
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={close}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="point-use-title"
            className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
                <p id="point-use-title" className="mt-2 text-h3 text-success">
                  {result?.status === "already_processed" ? "すでに処理済みです" : "ポイントを利用しました"}
                </p>
                <dl className="mt-3 text-body">
                  {typeof result?.used === "number" && (
                    <div className="flex justify-between py-1">
                      <dt className="text-muted">利用ポイント</dt>
                      <dd className="font-bold">{result.used.toLocaleString()}pt</dd>
                    </div>
                  )}
                  {typeof result?.balance === "number" && (
                    <div className="flex justify-between py-1">
                      <dt className="text-muted">現在の残高</dt>
                      <dd className="font-bold">{result.balance.toLocaleString()}pt</dd>
                    </div>
                  )}
                </dl>
                <button type="button" onClick={close} className="btn-glossy mt-4 w-full rounded-full px-4 py-2.5 text-body font-bold text-primary-foreground">
                  閉じる
                </button>
              </div>
            ) : (
              <>
                <p id="point-use-title" className="text-h3">ポイントの利用内容を確認</p>
                <p className="mt-1 text-caption text-muted">
                  「利用を確定する」を押すまで、ポイントは減りません。
                </p>
                <dl className="mt-4 divide-y divide-border rounded-xl border border-border text-body">
                  <div className="flex justify-between gap-3 px-3 py-2">
                    <dt className="text-muted">利用内容</dt>
                    <dd className="text-right font-medium">{selected.label}</dd>
                  </div>
                  <div className="flex justify-between gap-3 px-3 py-2">
                    <dt className="text-muted">使用ポイント</dt>
                    <dd className="font-bold text-primary">{selected.cost.toLocaleString()}pt</dd>
                  </div>
                  <div className="flex justify-between gap-3 px-3 py-2">
                    <dt className="text-muted">現在の保有ポイント</dt>
                    <dd>{balance.toLocaleString()}pt</dd>
                  </div>
                  <div className="flex justify-between gap-3 px-3 py-2">
                    <dt className="text-muted">利用後の残高</dt>
                    <dd className="font-bold">{insufficient ? "—" : `${(balance - selected.cost).toLocaleString()}pt`}</dd>
                  </div>
                </dl>

                {insufficient && (
                  <p className="mt-3 flex items-center gap-1.5 text-body text-primary" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    ポイントが不足しています。
                  </p>
                )}
                {result && !done && (
                  <p className="mt-3 flex items-start gap-1.5 text-body text-primary" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {RESULT_MESSAGES[result.status] ?? RESULT_MESSAGES.error}
                      {result.status === "unauthenticated" && (
                        <>
                          {" "}
                          <Link href="/login?callbackUrl=%2Fmypage%2Fpoints" className="underline underline-offset-2">
                            ログインする
                          </Link>
                        </>
                      )}
                    </span>
                  </p>
                )}
                {networkError && (
                  <p className="mt-3 flex items-start gap-1.5 text-body text-primary" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    通信エラーが発生しました。ポイントが引かれたかどうかは「処理状況を確認する」で確認できます。
                  </p>
                )}
                {checkNote && <p className="mt-3 text-caption text-muted">{checkNote}</p>}

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={pending || insufficient}
                    className="btn-glossy flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-body font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
                  >
                    {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {pending ? "処理中..." : "利用を確定する"}
                  </button>
                  {(networkError || result?.status === "error") && (
                    <button
                      type="button"
                      onClick={checkStatus}
                      disabled={pending}
                      className="rounded-full border border-border px-4 py-2.5 text-body font-medium transition hover:bg-background disabled:opacity-50"
                    >
                      処理状況を確認する
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    disabled={pending}
                    className="rounded-full px-4 py-2 text-body text-muted transition hover:text-foreground disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
