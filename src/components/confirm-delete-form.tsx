"use client";

import { Trash2 } from "lucide-react";

// 관리자 화면의 삭제 버튼 공통 — 한 번 클릭으로 바로 지워지지 않도록 확인 창을 띄운다.
export function ConfirmDeleteForm({
  action,
  message,
}: {
  action: () => void | Promise<void>;
  message: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        aria-label="削除"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-background hover:text-primary"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
