import Link from "next/link";
import { Pencil } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { JaKo } from "@/components/ja-ko";
import { CouponForm } from "./coupon-form";
import { DeleteCouponButton } from "./delete-coupon-button";

type CouponRow = {
  id: string;
  title: string;
  discount_info: string | null;
  valid_from: string;
  valid_to: string;
  stores: { name: string } | null;
};

export default async function AdminCouponsPage() {
  const [couponsRes, storesRes] = await Promise.all([
    supabaseAdmin
      .from("coupons")
      .select("id, title, discount_info, valid_from, valid_to, stores(name)")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("stores").select("id, name").order("name"),
  ]);

  const coupons = (couponsRes.data ?? []) as unknown as CouponRow[];
  const stores = storesRes.data ?? [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <JaKo ja="クーポン管理" ko="쿠폰 관리" />
      </h1>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold">
          <JaKo ja="新しいクーポンを登録" ko="새 쿠폰 등록" />
        </h2>
        {stores.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            <JaKo
              ja="先に店舗を登録してください。"
              ko="먼저 매장을 등록해주세요."
            />
          </p>
        ) : (
          <CouponForm stores={stores} />
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">
          <JaKo ja="登録済みクーポン" ko="등록된 쿠폰" /> ({coupons.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {coupons.length === 0 && (
            <p className="text-sm text-muted">
              <JaKo ja="まだクーポンがありません" ko="아직 쿠폰이 없습니다" />
            </p>
          )}
          {coupons.map((coupon) => (
            <li
              key={coupon.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-xs text-muted">{coupon.stores?.name}</p>
                <p className="truncate font-bold text-primary">{coupon.title}</p>
                <p className="text-xs text-muted">
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
