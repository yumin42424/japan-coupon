"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin";

export type CouponFormState = { error?: string };

export async function createCoupon(
  _prevState: CouponFormState,
  formData: FormData
): Promise<CouponFormState> {
  await requireAdmin();

  const storeId = formData.get("storeId") as string;
  const title = (formData.get("title") as string)?.trim();
  const discountInfo = (formData.get("discountInfo") as string)?.trim();
  const validFrom = formData.get("validFrom") as string;
  const validTo = formData.get("validTo") as string;
  const memberOnly = formData.get("memberOnly") === "on";
  const usageCondition = (formData.get("usageCondition") as string)?.trim();
  const regularPriceRaw = formData.get("regularPrice") as string;
  const discountedPriceRaw = formData.get("discountedPrice") as string;
  const regularPrice = regularPriceRaw ? Number(regularPriceRaw) : null;
  const discountedPrice = discountedPriceRaw ? Number(discountedPriceRaw) : null;
  const quantityLimitRaw = formData.get("quantityLimit") as string;
  const quantityLimit = quantityLimitRaw ? Number(quantityLimitRaw) : null;

  if (!storeId) return { error: "店舗を選択してください。(매장을 선택해주세요.)" };
  if (!title) return { error: "クーポン名を入力してください。(쿠폰명을 입력해주세요.)" };
  if (!validFrom || !validTo) {
    return { error: "利用期間を入力してください。(이용기간을 입력해주세요.)" };
  }
  if (validFrom > validTo) {
    return {
      error: "利用開始日は終了日より前にしてください。(시작일이 종료일보다 늦을 수 없습니다.)",
    };
  }
  if ((regularPriceRaw && Number.isNaN(regularPrice)) || (discountedPriceRaw && Number.isNaN(discountedPrice))) {
    return { error: "価格は数字で入力してください。(가격은 숫자로 입력해주세요.)" };
  }
  if (quantityLimitRaw && (Number.isNaN(quantityLimit) || (quantityLimit as number) < 1)) {
    return { error: "数量は1以上の数字で入力してください。(수량은 1 이상의 숫자로 입력해주세요.)" };
  }

  const { error } = await supabaseAdmin.from("coupons").insert({
    store_id: storeId,
    title,
    discount_info: discountInfo || null,
    valid_from: validFrom,
    valid_to: validTo,
    member_only: memberOnly,
    usage_condition: usageCondition || null,
    regular_price: regularPrice,
    discounted_price: discountedPrice,
    quantity_limit: quantityLimit,
  });

  if (error) {
    return { error: "登録に失敗しました。(등록에 실패했습니다.)" };
  }

  revalidatePath("/admin/coupons");
  revalidatePath("/coupons");
  return {};
}

export async function updateCoupon(
  couponId: string,
  _prevState: CouponFormState,
  formData: FormData
): Promise<CouponFormState> {
  await requireAdmin();

  const storeId = formData.get("storeId") as string;
  const title = (formData.get("title") as string)?.trim();
  const discountInfo = (formData.get("discountInfo") as string)?.trim();
  const validFrom = formData.get("validFrom") as string;
  const validTo = formData.get("validTo") as string;
  const memberOnly = formData.get("memberOnly") === "on";
  const usageCondition = (formData.get("usageCondition") as string)?.trim();
  const regularPriceRaw = formData.get("regularPrice") as string;
  const discountedPriceRaw = formData.get("discountedPrice") as string;
  const regularPrice = regularPriceRaw ? Number(regularPriceRaw) : null;
  const discountedPrice = discountedPriceRaw ? Number(discountedPriceRaw) : null;
  const quantityLimitRaw = formData.get("quantityLimit") as string;
  const quantityLimit = quantityLimitRaw ? Number(quantityLimitRaw) : null;

  if (!storeId) return { error: "店舗を選択してください。(매장을 선택해주세요.)" };
  if (!title) return { error: "クーポン名を入力してください。(쿠폰명을 입력해주세요.)" };
  if (!validFrom || !validTo) {
    return { error: "利用期間を入力してください。(이용기간을 입력해주세요.)" };
  }
  if (validFrom > validTo) {
    return {
      error: "利用開始日は終了日より前にしてください。(시작일이 종료일보다 늦을 수 없습니다.)",
    };
  }
  if ((regularPriceRaw && Number.isNaN(regularPrice)) || (discountedPriceRaw && Number.isNaN(discountedPrice))) {
    return { error: "価格は数字で入力してください。(가격은 숫자로 입력해주세요.)" };
  }
  if (quantityLimitRaw && (Number.isNaN(quantityLimit) || (quantityLimit as number) < 1)) {
    return { error: "数量は1以上の数字で入力してください。(수량은 1 이상의 숫자로 입력해주세요.)" };
  }

  const { error } = await supabaseAdmin
    .from("coupons")
    .update({
      store_id: storeId,
      title,
      discount_info: discountInfo || null,
      valid_from: validFrom,
      valid_to: validTo,
      member_only: memberOnly,
      usage_condition: usageCondition || null,
      regular_price: regularPrice,
      discounted_price: discountedPrice,
      quantity_limit: quantityLimit,
    })
    .eq("id", couponId);

  if (error) {
    return { error: "更新に失敗しました。(수정에 실패했습니다.)" };
  }

  revalidatePath("/admin/coupons");
  revalidatePath("/coupons");
  redirect("/admin/coupons");
}

export async function deleteCoupon(couponId: string) {
  await requireAdmin();
  await supabaseAdmin.from("coupons").delete().eq("id", couponId);
  revalidatePath("/admin/coupons");
  revalidatePath("/coupons");
}
