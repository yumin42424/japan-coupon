import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
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
        "id, store_id, title, discount_info, valid_from, valid_to, member_only, is_active, usage_condition, regular_price, discounted_price, quantity_limit, reusable_after_days"
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin.from("stores").select("id, name").order("name"),
  ]);

  if (!coupon) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">
        クーポンを編集
      </h1>
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
        <EditCouponForm coupon={coupon} stores={stores ?? []} />
      </section>
    </main>
  );
}
