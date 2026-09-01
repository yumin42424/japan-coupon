import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { JaKo } from "@/components/ja-ko";
import { EditCouponForm } from "./edit-coupon-form";

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: coupon }, { data: stores }] = await Promise.all([
    supabaseAdmin
      .from("coupons")
      .select(
        "id, store_id, title, discount_info, valid_from, valid_to, member_only, usage_condition, regular_price, discounted_price, quantity_limit"
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin.from("stores").select("id, name").order("name"),
  ]);

  if (!coupon) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <JaKo ja="クーポンを編集" ko="쿠폰 수정" />
      </h1>
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <EditCouponForm coupon={coupon} stores={stores ?? []} />
      </section>
    </main>
  );
}
