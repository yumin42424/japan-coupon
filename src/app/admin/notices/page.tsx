import Link from "next/link";
import { Pencil } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NoticeForm } from "./notice-form";
import { DeleteNoticeButton } from "./delete-notice-button";

type NoticeRow = {
  id: string;
  title: string;
  published_at: string;
};

export default async function AdminNoticesPage() {
  const { data } = await supabaseAdmin
    .from("notices")
    .select("id, title, published_at")
    .order("published_at", { ascending: false });
  const notices = (data ?? []) as NoticeRow[];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        お知らせ管理
      </h1>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold">
          新しいお知らせを投稿
        </h2>
        <NoticeForm />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">
          投稿済み ({notices.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {notices.length === 0 && (
            <p className="text-sm text-muted">
              まだありません
            </p>
          )}
          {notices.map((notice) => (
            <li
              key={notice.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-xs text-muted">
                  {new Date(notice.published_at).toISOString().slice(0, 10)}
                </p>
                <p className="truncate font-medium">{notice.title}</p>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href={`/admin/notices/${notice.id}/edit`}
                  aria-label="edit"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-background hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <DeleteNoticeButton noticeId={notice.id} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
