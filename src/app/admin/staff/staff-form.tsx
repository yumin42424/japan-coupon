"use client";

import { useActionState, useRef, useEffect } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { addStaff, type StaffFormState } from "./actions";

const initialState: StaffFormState = {};

export function StaffForm({ stores }: { stores: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(addStaff, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && state.ok) formRef.current?.reset();
  }, [pending, state.ok]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-body font-medium">
        会員のメールアドレス（またはニックネーム）
        <input
          type="text"
          name="who"
          required
          maxLength={100}
          autoComplete="off"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-body font-medium">
        担当する店舗
        <select
          name="storeId"
          required
          defaultValue=""
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        >
          <option value="" disabled>
            選択してください
          </option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {state.error && (
        <p className="flex items-center gap-1.5 text-body text-primary" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="flex items-center gap-1.5 text-body text-success" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-glossy self-start rounded-full px-4 py-2 text-body font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
      >
        {pending ? "登録中..." : "スタッフに登録する"}
      </button>
    </form>
  );
}
