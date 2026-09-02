"use client";

import { useActionState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { createStore, type StoreFormState } from "./actions";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";

const initialState: StoreFormState = {};

export function StoreForm() {
  const [state, formAction, pending] = useActionState(createStore, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        店舗名
        <input
          type="text"
          name="name"
          required
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          カテゴリ
          <select
            name="category"
            required
            defaultValue=""
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          >
            <option value="" disabled>
              -
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.ja}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          エリア
          <select
            name="area"
            required
            defaultValue=""
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          >
            <option value="" disabled>
              -
            </option>
            {AREAS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.ja}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        住所
        <input
          type="text"
          name="address"
          placeholder="ソウル特別市中区明洞…"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          緯度
          <input
            type="number"
            step="any"
            name="latitude"
            placeholder="37.5636"
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          経度
          <input
            type="number"
            step="any"
            name="longitude"
            placeholder="126.9834"
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-muted">
        Googleマップで店舗を検索→右クリックで座標をコピーできます。
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium">
        営業時間
        <input
          type="text"
          name="businessHours"
          placeholder="10:00〜20:00"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        予約方法
        <input
          type="text"
          name="reservationInfo"
          placeholder="LINE公式アカウントから予約"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="lineAvailable" />
        日本語対応可能
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="popularWithJapanese" />
        日本人に人気の店舗
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
        className="self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "登録中..." : "登録する"}
      </button>
    </form>
  );
}
