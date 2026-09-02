import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { EditNoticeForm } from "./edit-notice-form";

export default async function EditNoticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: notice } = await supabaseAdmin
    .from("notices")
    .select("id, title, body")
    .eq("id", id)
    .maybeSingle();

  if (!notice) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        お知らせを編集
      </h1>
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <EditNoticeForm notice={notice} />
      </section>
    </main>
  );
}
