"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { updateStore, type StoreFormState } from "../../actions";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";

const initialState: StoreFormState = {};

type Store = {
  id: string;
  name: string;
  category: string;
  area: string;
  line_available: boolean;
  popular_with_japanese: boolean;
  address: string | null;
  business_hours: string | null;
  reservation_info: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function EditStoreForm({ store }: { store: Store }) {
  const updateWithId = updateStore.bind(null, store.id);
  const [state, formAction, pending] = useActionState(updateWithId, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        店舗名
        <input
          type="text"
          name="name"
          required
          defaultValue={store.name}
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          カテゴリ
          <select
            name="category"
            required
            defaultValue={store.category}
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          >
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
            defaultValue={store.area}
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          >
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
          defaultValue={store.address ?? ""}
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
            defaultValue={store.latitude ?? ""}
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
            defaultValue={store.longitude ?? ""}
            placeholder="126.9834"
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        営業時間
        <input
          type="text"
          name="businessHours"
          defaultValue={store.business_hours ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        予約方法
        <input
          type="text"
          name="reservationInfo"
          defaultValue={store.reservation_info ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="lineAvailable" defaultChecked={store.line_available} />
        日本語対応可能
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="popularWithJapanese"
          defaultChecked={store.popular_with_japanese}
        />
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
        {pending ? "更新中..." : "更新する"}
      </button>
    </form>
  );
}
