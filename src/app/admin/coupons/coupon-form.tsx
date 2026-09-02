"use client";

import { useActionState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { createCoupon, type CouponFormState } from "./actions";

const initialState: CouponFormState = {};

type StoreOption = { id: string; name: string };

export function CouponForm({ stores }: { stores: StoreOption[] }) {
  const [state, formAction, pending] = useActionState(createCoupon, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        店舗
        <select
          name="storeId"
          required
          defaultValue=""
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        >
          <option value="" disabled>
            -
          </option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        クーポン名
        <input
          type="text"
          name="title"
          required
          placeholder="初回来店20%OFF"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        割引内容
        <input
          type="text"
          name="discountInfo"
          placeholder="20% OFF"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          正規価格 (円)
          <input
            type="number"
            name="regularPrice"
            min={0}
            placeholder="10000"
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          クーポン価格 (円)
          <input
            type="number"
            name="discountedPrice"
            min={0}
            placeholder="8000"
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        利用条件
        <input
          type="text"
          name="usageCondition"
          placeholder="1名様1回限り"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          開始日
          <input
            type="date"
            name="validFrom"
            required
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          終了日
          <input
            type="date"
            name="validTo"
            required
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        先着順の数量制限（任意）
        <input
          type="number"
          name="quantityLimit"
          min={1}
          placeholder="空欄なら無制限"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="memberOnly" defaultChecked />
        会員限定クーポン
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
