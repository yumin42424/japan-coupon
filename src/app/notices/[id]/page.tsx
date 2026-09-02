import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Megaphone } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: notice } = await supabaseAdmin
    .from("notices")
    .select("id, title, body, published_at")
    .eq("id", id)
    .maybeSingle();

  if (!notice) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/notices"
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        お知らせ一覧に戻る
      </Link>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted">
        <Megaphone className="h-3.5 w-3.5 text-primary" />
        {new Date(notice.published_at).toISOString().slice(0, 10)}
      </div>
      <h1 className="mt-1 text-xl font-extrabold tracking-tight">{notice.title}</h1>

      <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed shadow-sm">
        {notice.body}
      </div>
    </main>
  );
}
