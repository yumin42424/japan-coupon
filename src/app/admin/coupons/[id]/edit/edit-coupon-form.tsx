"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { updateCoupon, type CouponFormState } from "../../actions";

const initialState: CouponFormState = {};

type StoreOption = { id: string; name: string };
type Coupon = {
  id: string;
  store_id: string;
  title: string;
  discount_info: string | null;
  valid_from: string;
  valid_to: string;
  member_only: boolean;
  usage_condition: string | null;
  regular_price: number | null;
  discounted_price: number | null;
  quantity_limit: number | null;
};

export function EditCouponForm({ coupon, stores }: { coupon: Coupon; stores: StoreOption[] }) {
  const updateWithId = updateCoupon.bind(null, coupon.id);
  const [state, formAction, pending] = useActionState(updateWithId, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        店舗
        <select
          name="storeId"
          required
          defaultValue={coupon.store_id}
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        >
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
          defaultValue={coupon.title}
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        割引内容
        <input
          type="text"
          name="discountInfo"
          defaultValue={coupon.discount_info ?? ""}
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
            defaultValue={coupon.regular_price ?? ""}
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          クーポン価格 (円)
          <input
            type="number"
            name="discountedPrice"
            min={0}
            defaultValue={coupon.discounted_price ?? ""}
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        利用条件
        <input
          type="text"
          name="usageCondition"
          defaultValue={coupon.usage_condition ?? ""}
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
            defaultValue={coupon.valid_from}
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          終了日
          <input
            type="date"
            name="validTo"
            required
            defaultValue={coupon.valid_to}
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
          defaultValue={coupon.quantity_limit ?? ""}
          placeholder="空欄なら無制限"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="memberOnly" defaultChecked={coupon.member_only} />
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
        {pending ? "更新中..." : "更新する"}
      </button>
    </form>
  );
}
