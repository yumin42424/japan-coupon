"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-h2 font-display">
        エラーが発生しました
      </h1>
      <p className="mt-2 text-body text-muted">
        一時的な問題が発生しました。もう一度お試しください。
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-primary px-6 py-3 text-body font-bold text-primary-foreground"
      >
        再読み込み
      </button>
    </main>
  );
}
