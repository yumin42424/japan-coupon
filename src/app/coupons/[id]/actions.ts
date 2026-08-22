"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function recordView(couponId: string) {
  const session = await auth();
  await supabaseAdmin.from("coupon_events").insert({
    coupon_id: couponId,
    user_id: session?.user?.id ?? null,
    event_type: "view",
  });
}

export async function issueCoupon(couponId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await supabaseAdmin.from("coupon_events").insert({
    coupon_id: couponId,
    user_id: session.user.id,
    event_type: "issue",
  });

  redirect(`/coupons/${couponId}`);
}

export async function toggleFavorite(couponId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  // favorite은 view/issue/use처럼 쌓이는 로그가 아니라 "찜 여부"라는 상태라서,
  // 행이 있으면 지우고 없으면 만드는 토글로 구현한다.
  const { data: existing } = await supabaseAdmin
    .from("coupon_events")
    .select("id")
    .eq("coupon_id", couponId)
    .eq("user_id", userId)
    .eq("event_type", "favorite")
    .maybeSingle();

  if (existing) {
    await supabaseAdmin.from("coupon_events").delete().eq("id", existing.id);
  } else {
    await supabaseAdmin.from("coupon_events").insert({
      coupon_id: couponId,
      user_id: userId,
      event_type: "favorite",
    });
  }

  revalidatePath(`/coupons/${couponId}`);
  revalidatePath("/mypage");
}
