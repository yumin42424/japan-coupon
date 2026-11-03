import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">お知らせ</h1>

      {notices.length === 0 && (
        <p className="mt-8 border-y border-border py-8 text-body text-muted">お知らせはまだありません。</p>
      )}
      <ul className="mt-8 flex flex-col gap-2">
        {notices.map((notice) => (
          <li key={notice.id}>
            <Link
              href={`/notices/${notice.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
            >
              <span className="min-w-0">
                <span className="block text-caption text-muted">
                  {new Date(notice.published_at).toISOString().slice(0, 10)}
                </span>
                <span className="mt-0.5 block truncate text-h3">{notice.title}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
