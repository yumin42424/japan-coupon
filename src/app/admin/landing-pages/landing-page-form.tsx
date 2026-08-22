"use client";

import { useActionState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { createLandingPage, type LandingPageFormState } from "./actions";
import { JaKo } from "@/components/ja-ko";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";

const initialState: LandingPageFormState = {};

export function LandingPageForm() {
  const [state, formAction, pending] = useActionState(createLandingPage, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        <JaKo ja="スラッグ (URL用)" ko="슬러그 (URL에 쓰임)" />
        <input
          type="text"
          name="slug"
          required
          placeholder="myeongdong-beauty"
          pattern="[a-z0-9-]+"
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          <JaKo ja="utm_source" ko="유입경로" />
          <input
            type="text"
            name="utmSource"
            placeholder="instagram"
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          <JaKo ja="utm_campaign" ko="캠페인명" />
          <input
            type="text"
            name="utmCampaign"
            placeholder="2026-autumn"
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          <JaKo ja="対象カテゴリ" ko="대상 카테고리" />
          <select
            name="targetCategory"
            defaultValue=""
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          >
            <option value="">
              全カテゴリ (전체)
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.ja}({c.ko})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          <JaKo ja="対象エリア" ko="대상 지역" />
          <select
            name="targetArea"
            defaultValue=""
            className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
          >
            <option value="">全エリア (전체)</option>
            {AREAS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.ja}({a.ko})
              </option>
            ))}
          </select>
        </label>
      </div>

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
