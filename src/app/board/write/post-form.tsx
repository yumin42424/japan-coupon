"use client";

import { useActionState, useState } from "react";
import { AlertCircle } from "lucide-react";
import { createPost, type PostFormState } from "../actions";
import { BOARD_CATEGORIES, DEFAULT_BOARD_CATEGORY, type BoardCategory } from "@/lib/board-categories";

const initialState: PostFormState = {};

export function PostForm() {
  const [state, formAction, pending] = useActionState(createPost, initialState);
  const [category, setCategory] = useState<BoardCategory>(DEFAULT_BOARD_CATEGORY);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <input type="hidden" name="category" value={category} />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">カテゴリ</span>
        <div className="flex flex-wrap gap-1.5">
          {BOARD_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                category === c.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-muted hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {c.ja}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        タイトル
        <input
          type="text"
          name="title"
          required
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        本文
        <textarea
          name="body"
          required
          rows={8}
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
        className="self-start rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "投稿中..." : "投稿する"}
      </button>
    </form>
  );
}
