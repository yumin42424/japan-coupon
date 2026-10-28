import { AlertCircle } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminPage } from "@/lib/admin";
import { StaffForm } from "./staff-form";
import { DeleteStaffButton } from "./delete-staff-button";

type StaffLink = { user_id: string; store_id: string; created_at: string };

export default async function AdminStaffPage() {
  await requireAdminPage();

  const [linksRes, storesRes] = await Promise.all([
    supabaseAdmin.from("store_staff").select("user_id, store_id, created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("stores").select("id, name, is_active").order("name"),
  ]);

  // 테이블이 아직 없으면(마이그레이션 적용 전) 목록 대신 안내를 보여준다.
  const tableMissing = linksRes.error?.code === "PGRST205" || linksRes.error?.code === "42P01";
  const loadFailed = !!linksRes.error && !tableMissing;
  const links = (linksRes.data ?? []) as StaffLink[];
  const stores = (storesRes.data ?? []) as { id: string; name: string; is_active: boolean }[];

  // 임베드 조인 대신 ID 로 따로 읽는다 (store_staff 가 users 를 두 번 참조해서 조인 힌트가 필요해지는 것을 피함).
  const userIds = [...new Set(links.map((l) => l.user_id))];
  const { data: userRows } = userIds.length
    ? await supabaseAdmin.from("users").select("id, nickname, email").in("id", userIds)
    : { data: [] as { id: string; nickname: string; email: string | null }[] };
  const userById = new Map((userRows ?? []).map((u) => [u.id, u]));
  const storeName = new Map(stores.map((s) => [s.id, s.name]));

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">スタッフ管理</h1>
      <p className="mt-2 text-body text-muted">
        会員を店舗のスタッフとして登録すると、その会員は /staff/redeem で自分の店舗のクーポンだけを使用処理できます。
        登録するには、本人が先に会員登録（ログイン）を済ませている必要があります。
      </p>

      {tableMissing && (
        <p className="mt-6 flex items-start gap-1.5 rounded-xl border border-border bg-card p-4 text-body text-primary" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          スタッフ機能のDB設定がまだ適用されていません。db/apply/apply-store-staff.sql を Supabase の SQL Editor で実行すると使えるようになります。
        </p>
      )}
      {loadFailed && (
        <p className="mt-6 flex items-start gap-1.5 rounded-xl border border-border bg-card p-4 text-body text-primary" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          スタッフ一覧を読み込めませんでした。時間をおいて再度お試しください。
        </p>
      )}

      {!tableMissing && !loadFailed && (
        <>
          <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-h3">スタッフを追加</h2>
            <StaffForm stores={stores.map((s) => ({ id: s.id, name: s.is_active ? s.name : `${s.name}（停止中）` }))} />
          </section>

          <section className="mt-8">
            <h2 className="text-h2 font-display">登録済み ({links.length})</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {links.length === 0 && <p className="text-body text-muted">まだありません</p>}
              {links.map((l) => {
                const user = userById.get(l.user_id);
                return (
                  <li
                    key={`${l.user_id}:${l.store_id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{storeName.get(l.store_id) ?? "（不明な店舗）"}</p>
                      <p className="truncate text-caption text-muted">
                        {user?.nickname ?? "（不明な会員）"}
                        {user?.email ? ` · ${user.email}` : ""}
                      </p>
                    </div>
                    <DeleteStaffButton userId={l.user_id} storeId={l.store_id} />
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
