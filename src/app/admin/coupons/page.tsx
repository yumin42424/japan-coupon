import Link from "next/link";
import { Pencil } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CouponForm } from "./coupon-form";
import { DeleteCouponButton } from "./delete-coupon-button";

type CouponRow = {
  id: string;
  title: string;
  discount_info: string | null;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  is_demo: boolean;
  stores: { name: string } | null;
};

export default async function AdminCouponsPage() {
  const [couponsRes, storesRes] = await Promise.all([
    supabaseAdmin
      .from("coupons")
      .select("id, title, discount_info, valid_from, valid_to, is_active, is_demo, stores(name)")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("stores").select("id, name").order("name"),
  ]);

  const coupons = (couponsRes.data ?? []) as unknown as CouponRow[];
  const stores = storesRes.data ?? [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">
        クーポン管理
      </h1>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-h3">
          新しいクーポンを登録
        </h2>
        {stores.length === 0 ? (
          <p className="mt-3 text-body text-muted">
            先に店舗を登録してください。
          </p>
        ) : (
          <CouponForm stores={stores} />
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-h2 font-display">
          登録済みクーポン ({coupons.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {coupons.length === 0 && (
            <p className="text-body text-muted">
              まだクーポンがありません
            </p>
          )}
          {coupons.map((coupon) => (
            <li
              key={coupon.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-caption text-muted">{coupon.stores?.name}</p>
                <p className="flex items-center gap-1.5 truncate text-h3 text-primary">
                  {coupon.title}
                  {coupon.is_demo && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-label font-medium text-primary">
                      DEMO
                    </span>
                  )}
                  {!coupon.is_active && (
                    <span className="shrink-0 rounded-full bg-border px-1.5 py-0.5 text-label font-normal text-muted">
                      停止中
                    </span>
                  )}
                </p>
                <p className="text-caption text-muted">
                  {coupon.discount_info} ・ {coupon.valid_from} 〜 {coupon.valid_to}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href={`/admin/coupons/${coupon.id}/edit`}
                  aria-label="edit"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-background hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <DeleteCouponButton couponId={coupon.id} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
