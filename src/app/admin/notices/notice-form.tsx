"use client";

import { useActionState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { createNotice, type NoticeFormState } from "./actions";
import { JaKo } from "@/components/ja-ko";

const initialState: NoticeFormState = {};

export function NoticeForm() {
  const [state, formAction, pending] = useActionState(createNotice, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        <JaKo ja="タイトル" ko="제목" />
        <input
          type="text"
          name="title"
          required
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        <JaKo ja="本文" ko="내용" />
        <textarea
          name="body"
          required
          rows={5}
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
        {pending ? <JaKo ja="登録中..." ko="등록 중..." /> : <JaKo ja="投稿する" ko="게시하기" />}
      </button>
    </form>
  );
}
