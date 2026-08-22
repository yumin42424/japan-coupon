import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { JaKo } from "@/components/ja-ko";
import { EditStoreForm } from "./edit-store-form";

export default async function EditStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select(
      "id, name, category, area, line_available, popular_with_japanese, address, business_hours, reservation_info"
    )
    .eq("id", id)
    .maybeSingle();

  if (!store) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <JaKo ja="店舗を編集" ko="매장 수정" />
      </h1>
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <EditStoreForm store={store} />
      </section>
    </main>
  );
}
