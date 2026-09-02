"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { updateNotice, type NoticeFormState } from "../../actions";

const initialState: NoticeFormState = {};

export function EditNoticeForm({ notice }: { notice: { id: string; title: string; body: string } }) {
  const updateWithId = updateNotice.bind(null, notice.id);
  const [state, formAction, pending] = useActionState(updateWithId, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        タイトル
        <input
          type="text"
          name="title"
          required
          defaultValue={notice.title}
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        本文
        <textarea
          name="body"
          required
          rows={8}
          defaultValue={notice.body}
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
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
