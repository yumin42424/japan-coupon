import Link from "next/link";
import { Pencil } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { StoreForm } from "./store-form";
import { DeleteStoreButton } from "./delete-store-button";

type StoreRow = {
  id: string;
  name: string;
  category: string;
  area: string;
  line_available: boolean;
};

export default async function AdminStoresPage() {
  const { data } = await supabaseAdmin
    .from("stores")
    .select("id, name, category, area, line_available")
    .order("created_at", { ascending: false });
  const stores = (data ?? []) as StoreRow[];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        店舗管理
      </h1>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold">
          新しい店舗を登録
        </h2>
        <StoreForm />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">
          登録済み店舗 ({stores.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {stores.length === 0 && (
            <p className="text-sm text-muted">
              まだ店舗がありません
            </p>
          )}
          {stores.map((store) => {
            const c = CATEGORIES.find((x) => x.value === store.category);
            const a = AREAS.find((x) => x.value === store.area);
            return (
              <li
                key={store.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{store.name}</p>
                  <p className="text-xs text-muted">
                    {c?.ja} ・ {a?.ja}
                    {store.line_available && (
                      <span className="ml-1 text-success">
                        ・ 日本語対応可
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/stores/${store.id}/edit`}
                    aria-label="edit"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-background hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <DeleteStoreButton storeId={store.id} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
