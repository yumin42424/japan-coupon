"use client";

import { useActionState, useRef, useState } from "react";
import { Star, AlertCircle, Camera, X } from "lucide-react";
import { submitReview, type ReviewState } from "./actions";
import { useT } from "@/i18n/client";

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
  const t = useT();
  const action = submitReview.bind(null, storeId, couponId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [rating, setRating] = useState(initialRating ?? 0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = initialBody != null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <input type="hidden" name="rating" value={rating} />
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={t("{n}点", { n })}
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
        {t("口コミ内容")}
      </label>
      <textarea
        id="review-body"
        name="body"
        required
        maxLength={2000}
        defaultValue={initialBody}
        rows={3}
        placeholder={t("日本語対応や実際に行ってみた感想を書いてください")}
        className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
      />

      <div className="flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary/40 hover:text-foreground">
          <Camera className="h-3.5 w-3.5" />
          {t("写真を追加")}
          <input
            ref={fileInputRef}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </label>
        {photoPreview && (
          <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: URLのローカルプレビューはnext/imageの対象外 */}
            <img src={photoPreview} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={clearPhoto}
              aria-label={t("写真を削除")}
              className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl bg-black/60 text-white"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>

      {state.error && (
        <p className="flex items-center gap-1.5 text-xs text-primary" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {t(state.error)}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || rating === 0}
        className="btn-glossy self-end rounded-lg px-4 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
      >
        {pending ? t("投稿中...") : isEdit ? t("口コミを更新") : t("口コミを投稿")}
      </button>
    </form>
  );
}
