"use client";

import { useActionState, useState } from "react";
import { Star, AlertCircle } from "lucide-react";
import { submitReview, type ReviewState } from "./actions";

const initialState: ReviewState = {};

export function ReviewForm({
  storeId,
  couponId,
  initialRating,
  initialBody,
}: {
  storeId: string;
  couponId: string;
  initialRating?: number;
  initialBody?: string;
}) {
  const action = submitReview.bind(null, storeId, couponId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [rating, setRating] = useState(initialRating ?? 0);
  const isEdit = initialBody != null;

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <input type="hidden" name="rating" value={rating} />
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n}点`}
            className="p-0.5"
          >
            <Star
              className={`h-6 w-6 ${n <= rating ? "text-primary" : "text-border"}`}
              fill={n <= rating ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="review-body">
        口コミ内容
      </label>
      <textarea
        id="review-body"
        name="body"
        required
        maxLength={2000}
        defaultValue={initialBody}
        rows={3}
        placeholder="日本語対応や実際に行ってみた感想を書いてください"
        className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
      {state.error && (
        <p className="flex items-center gap-1.5 text-xs text-primary" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || rating === 0}
        className="btn-glossy self-end rounded-full px-4 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
      >
        {pending ? "投稿中..." : isEdit ? "口コミを更新" : "口コミを投稿"}
      </button>
    </form>
  );
}
