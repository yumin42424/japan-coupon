"use client";

import { useActionState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { createCoupon, type CouponFormState } from "./actions";
import { JaKo } from "@/components/ja-ko";

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
        <JaKo ja="店舗" ko="매장" />
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
        <JaKo ja="クーポン名" ko="쿠폰명" />
        <input
          type="text"
          name="title"
          required
          placeholder="初回来店20%OFF"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        <JaKo ja="割引内容" ko="할인 내용" />
        <input
          type="text"
          name="discountInfo"
          placeholder="20% OFF"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          <JaKo ja="正規価格 (円)" ko="정상가격 (엔)" />
          <input
            type="number"
            name="regularPrice"
            min={0}
            placeholder="10000"
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          <JaKo ja="クーポン価格 (円)" ko="쿠폰가격 (엔)" />
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
        <JaKo ja="利用条件" ko="이용조건" />
        <input
          type="text"
          name="usageCondition"
          placeholder="1名様1回限り"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          <JaKo ja="開始日" ko="시작일" />
          <input
            type="date"
            name="validFrom"
            required
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          <JaKo ja="終了日" ko="종료일" />
          <input
            type="date"
            name="validTo"
            required
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        <JaKo ja="先着順の数量制限（任意）" ko="선착순 수량 제한 (선택)" />
        <input
          type="number"
          name="quantityLimit"
          min={1}
          placeholder="空欄なら無制限 (비워두면 무제한)"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="memberOnly" defaultChecked />
        <JaKo ja="会員限定クーポン" ko="회원 전용 쿠폰" />
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
