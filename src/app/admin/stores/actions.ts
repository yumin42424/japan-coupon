"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { requireAdmin } from "@/lib/admin";

const VALID_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.value));
const VALID_AREAS = new Set<string>(AREAS.map((a) => a.value));

export type StoreFormState = { error?: string };

export async function createStore(
  _prevState: StoreFormState,
  formData: FormData
): Promise<StoreFormState> {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const category = formData.get("category") as string;
  const area = formData.get("area") as string;
  const lineAvailable = formData.get("lineAvailable") === "on";
  const popularWithJapanese = formData.get("popularWithJapanese") === "on";
  const address = (formData.get("address") as string)?.trim();
  const businessHours = (formData.get("businessHours") as string)?.trim();
  const reservationInfo = (formData.get("reservationInfo") as string)?.trim();

  if (!name) return { error: "店舗名を入力してください。(매장명을 입력해주세요.)" };
  if (!VALID_CATEGORIES.has(category)) {
    return { error: "カテゴリを選択してください。(카테고리를 선택해주세요.)" };
  }
  if (!VALID_AREAS.has(area)) {
    return { error: "エリアを選択してください。(지역을 선택해주세요.)" };
  }

  const { error } = await supabaseAdmin.from("stores").insert({
    name,
    category,
    area,
    line_available: lineAvailable,
    popular_with_japanese: popularWithJapanese,
    address: address || null,
    business_hours: businessHours || null,
    reservation_info: reservationInfo || null,
  });

  if (error) {
    return { error: "登録に失敗しました。(등록에 실패했습니다.)" };
  }

  revalidatePath("/admin/stores");
  revalidatePath("/admin/coupons");
  return {};
}

export async function updateStore(
  storeId: string,
  _prevState: StoreFormState,
  formData: FormData
): Promise<StoreFormState> {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const category = formData.get("category") as string;
  const area = formData.get("area") as string;
  const lineAvailable = formData.get("lineAvailable") === "on";
  const popularWithJapanese = formData.get("popularWithJapanese") === "on";
  const address = (formData.get("address") as string)?.trim();
  const businessHours = (formData.get("businessHours") as string)?.trim();
  const reservationInfo = (formData.get("reservationInfo") as string)?.trim();

  if (!name) return { error: "店舗名を入力してください。(매장명을 입력해주세요.)" };
  if (!VALID_CATEGORIES.has(category)) {
    return { error: "カテゴリを選択してください。(카테고리를 선택해주세요.)" };
  }
  if (!VALID_AREAS.has(area)) {
    return { error: "エリアを選択してください。(지역을 선택해주세요.)" };
  }

  const { error } = await supabaseAdmin
    .from("stores")
    .update({
      name,
      category,
      area,
      line_available: lineAvailable,
      popular_with_japanese: popularWithJapanese,
      address: address || null,
      business_hours: businessHours || null,
      reservation_info: reservationInfo || null,
    })
    .eq("id", storeId);

  if (error) {
    return { error: "更新に失敗しました。(수정에 실패했습니다.)" };
  }

  revalidatePath("/admin/stores");
  revalidatePath("/admin/coupons");
  redirect("/admin/stores");
}

export async function deleteStore(storeId: string) {
  await requireAdmin();
  await supabaseAdmin.from("stores").delete().eq("id", storeId);
  revalidatePath("/admin/stores");
  revalidatePath("/admin/coupons");
}
