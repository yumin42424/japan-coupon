import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <SearchX className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-h2 font-display">
        ページが見つかりませんでした
      </h1>
      <p className="mt-2 text-body text-muted">
        お探しのページは、削除されたか、URLが正しくない可能性があります。
      </p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Link
          href="/coupons"
          className="rounded-lg bg-primary px-6 py-3 text-body font-bold text-primary-foreground"
        >
          クーポンを探す
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-border bg-card px-6 py-3 text-body font-medium transition-colors hover:bg-background"
        >
          トップページへ
        </Link>
      </div>
    </main>
  );
}
