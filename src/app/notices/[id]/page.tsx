import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Megaphone } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getT } from "@/i18n/server";
import { translateRow } from "@/i18n/content";
import { NOTICE_TEXT } from "@/i18n/content-fields";
import { AutoTranslatedNote } from "@/components/auto-translated-note";

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getT();
  const { id } = await params;

  const { data: storedNotice } = await supabaseAdmin
    .from("notices")
    .select("id, title, body, published_at")
    .eq("id", id)
    .maybeSingle();

  if (!storedNotice) notFound();
  const notice = await translateRow(storedNotice, NOTICE_TEXT);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/notices"
        className="flex items-center gap-1 text-body text-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("お知らせ一覧に戻る")}
      </Link>

      <div className="mt-4 flex items-center gap-2 text-caption text-muted">
        <Megaphone className="h-3.5 w-3.5 text-primary" />
        {new Date(notice.published_at).toISOString().slice(0, 10)}
      </div>
      <h1 className="mt-1 text-h1 font-display tracking-tight">{notice.title}</h1>

      <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 text-body leading-relaxed shadow-card">
        {notice.body}
      </div>
      <AutoTranslatedNote />
    </main>
  );
}
