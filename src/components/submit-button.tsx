"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

// 서버 액션 폼의 제출 버튼 — 처리 중에는 눌리지 않게 막고(중복 제출 방지) 진행 중임을 보여준다.
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
