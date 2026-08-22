"use client";

import { useActionState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { createStore, type StoreFormState } from "./actions";
import { JaKo } from "@/components/ja-ko";
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
        <JaKo ja="店舗名" ko="매장명" />
        <input
          type="text"
          name="name"
          required
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          <JaKo ja="カテゴリ" ko="카테고리" />
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
                {c.ja}({c.ko})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          <JaKo ja="エリア" ko="지역" />
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
                {a.ja}({a.ko})
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        <JaKo ja="住所" ko="주소" />
        <input
          type="text"
          name="address"
          placeholder="ソウル特別市中区明洞…"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        <JaKo ja="営業時間" ko="영업시간" />
        <input
          type="text"
          name="businessHours"
          placeholder="10:00〜20:00"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        <JaKo ja="予約方法" ko="예약방법" />
        <input
          type="text"
          name="reservationInfo"
          placeholder="LINE公式アカウントから予約"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="lineAvailable" />
        <JaKo ja="日本語対応可能" ko="일본어 대응 가능" />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="popularWithJapanese" />
        <JaKo ja="日本人に人気の店舗" ko="일본인이 많이 찾는 매장" />
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
        {pending ? <JaKo ja="登録中..." ko="등록 중..." /> : <JaKo ja="登録する" ko="등록하기" />}
      </button>
    </form>
  );
}
