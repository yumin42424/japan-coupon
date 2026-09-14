import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <SearchX className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-xl font-extrabold tracking-tight">
        ページが見つかりませんでした
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        お探しのページは、削除されたか、URLが正しくない可能性があります。
      </p>
      <Link
        href="/coupons"
        className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-card transition hover:brightness-105"
      >
        クーポンを探す
      </Link>
    </main>
  );
}
