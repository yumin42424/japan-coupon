import Link from "next/link";
import { Megaphone, ChevronRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";

type NoticeRow = {
  id: string;
  title: string;
  published_at: string;
};

export default async function NoticesPage() {
  const { data } = await supabaseAdmin
    .from("notices")
    .select("id, title, published_at")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  const notices = (data ?? []) as NoticeRow[];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <Megaphone className="h-6 w-6 text-primary" />
        お知らせ
      </h1>

      <ul className="mt-8 flex flex-col gap-2">
        {notices.length === 0 && (
          <p className="text-sm text-muted">
            お知らせはまだありません。
          </p>
        )}
        {notices.map((notice) => (
          <li key={notice.id}>
            <Link
              href={`/notices/${notice.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <span className="min-w-0">
                <span className="block text-xs text-muted">
                  {new Date(notice.published_at).toISOString().slice(0, 10)}
                </span>
                <span className="mt-0.5 block truncate font-medium">{notice.title}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
