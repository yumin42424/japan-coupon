"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin";

export type CouponFormState = { error?: string };

// 가격은 전부 한국 원화(KRW) 정수로 저장·표시한다 (공개 화면은 ₩ 표기 + 실시간 환율 기반 엔화 환산).
const MAX_PRICE_KRW = 100_000_000;
const MAX_QUANTITY = 1_000_000;
const MAX_REUSABLE_DAYS = 365;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type CouponInput = {
  storeId: string;
  title: string;
  discountInfo: string | null;
  validFrom: string;
  validTo: string;
  memberOnly: boolean;
  usageCondition: string | null;
  regularPrice: number | null;
  discountedPrice: number | null;
  quantityLimit: number | null;
  reusableAfterDays: number | null;
};

function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// 빈 값이면 null, 정수가 아니거나 범위를 벗어나면 undefined(=오류).
function parseOptionalInt(raw: FormDataEntryValue | null, min: number, max: number): number | null | undefined {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return null;
  if (!/^\d+$/.test(text)) return undefined;
  const n = Number(text);
  return n >= min && n <= max ? n : undefined;
}

function parseCouponForm(formData: FormData): { value: CouponInput } | { error: string } {
  const storeId = String(formData.get("storeId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const discountInfo = String(formData.get("discountInfo") ?? "").trim();
  const validFrom = String(formData.get("validFrom") ?? "");
  const validTo = String(formData.get("validTo") ?? "");
  const usageCondition = String(formData.get("usageCondition") ?? "").trim();

  if (!storeId) return { error: "店舗を選択してください。" };
  if (!title) return { error: "クーポン名を入力してください。" };
  if (title.length > 100) return { error: "クーポン名は100文字以内で入力してください。" };
  if (discountInfo.length > 100) return { error: "割引内容は100文字以内で入力してください。" };
  if (usageCondition.length > 300) return { error: "利用条件は300文字以内で入力してください。" };
  if (!isRealDate(validFrom) || !isRealDate(validTo)) {
    return { error: "利用期間を入力してください。" };
  }
  if (validFrom > validTo) {
    return { error: "利用開始日は終了日より前にしてください。" };
  }

  const regularPrice = parseOptionalInt(formData.get("regularPrice"), 0, MAX_PRICE_KRW);
  const discountedPrice = parseOptionalInt(formData.get("discountedPrice"), 0, MAX_PRICE_KRW);
  if (regularPrice === undefined || discountedPrice === undefined) {
    return { error: "価格は0以上の整数（ウォン）で入力してください。" };
  }
  if (regularPrice !== null && discountedPrice !== null && discountedPrice > regularPrice) {
    return { error: "クーポン価格は正規価格以下にしてください。" };
  }

  const quantityLimit = parseOptionalInt(formData.get("quantityLimit"), 1, MAX_QUANTITY);
  if (quantityLimit === undefined) {
    return { error: "数量は1以上の整数で入力してください。" };
  }

  const reusableAfterDays = parseOptionalInt(formData.get("reusableAfterDays"), 1, MAX_REUSABLE_DAYS);
  if (reusableAfterDays === undefined) {
    return { error: "再利用間隔は1〜365の整数（日）で入力してください。" };
  }

  return {
    value: {
      storeId,
      title,
      discountInfo: discountInfo || null,
      validFrom,
      validTo,
      memberOnly: formData.get("memberOnly") === "on",
      usageCondition: usageCondition || null,
      regularPrice,
      discountedPrice,
      quantityLimit,
      reusableAfterDays,
    },
  };
}

export async function createCoupon(
  _prevState: CouponFormState,
  formData: FormData
): Promise<CouponFormState> {
  await requireAdmin();

  const parsed = parseCouponForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const v = parsed.value;

  const { error } = await supabaseAdmin.from("coupons").insert({
    store_id: v.storeId,
    title: v.title,
    discount_info: v.discountInfo,
    valid_from: v.validFrom,
    valid_to: v.validTo,
    member_only: v.memberOnly,
    usage_condition: v.usageCondition,
    regular_price: v.regularPrice,
    discounted_price: v.discountedPrice,
    quantity_limit: v.quantityLimit,
    reusable_after_days: v.reusableAfterDays,
  });

  if (error) {
    return { error: "登録に失敗しました。" };
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

  const parsed = parseCouponForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const v = parsed.value;

  const { error } = await supabaseAdmin
    .from("coupons")
    .update({
      store_id: v.storeId,
      title: v.title,
      discount_info: v.discountInfo,
      valid_from: v.validFrom,
      valid_to: v.validTo,
      member_only: v.memberOnly,
      is_active: formData.get("isActive") === "on",
      usage_condition: v.usageCondition,
      regular_price: v.regularPrice,
      discounted_price: v.discountedPrice,
      quantity_limit: v.quantityLimit,
      reusable_after_days: v.reusableAfterDays,
    })
    .eq("id", couponId);

  if (error) {
    return { error: "更新に失敗しました。" };
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
