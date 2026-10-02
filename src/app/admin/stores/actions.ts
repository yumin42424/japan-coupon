"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { requireAdmin } from "@/lib/admin";
import { sendLinePush, textMessage } from "@/lib/line-push";

const VALID_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.value));
const VALID_AREAS = new Set<string>(AREAS.map((a) => a.value));
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://japan-coupon-five.vercel.app";

// 관심지역으로 그 エリア를 등록해둔 회원 중 LINE 연동된 사람에게만 신규 매장 소식을 보낸다.
async function notifyInterestedUsersOfNewStore(area: string, storeName: string) {
  const areaInfo = AREAS.find((a) => a.value === area);
  const { data: interested } = await supabaseAdmin
    .from("user_interest_areas")
    .select("users!inner(line_user_id)")
    .eq("area", area)
    .not("users.line_user_id", "is", null);

  const message = textMessage(
    `🆕${areaInfo?.ja ?? area}に新しいお店が登録されました！\n\n${storeName}\n\n${SITE_URL}/areas/${area}`
  );

  for (const row of (interested ?? []) as unknown as { users: { line_user_id: string | null } | null }[]) {
    const lineUserId = row.users?.line_user_id;
    if (lineUserId) await sendLinePush(lineUserId, [message]);
  }
}

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
  const latitudeRaw = formData.get("latitude") as string;
  const longitudeRaw = formData.get("longitude") as string;
  const latitude = latitudeRaw ? Number(latitudeRaw) : null;
  const longitude = longitudeRaw ? Number(longitudeRaw) : null;

  if (!name) return { error: "店舗名を入力してください。" };
  if (!VALID_CATEGORIES.has(category)) {
    return { error: "カテゴリを選択してください。" };
  }
  if (!VALID_AREAS.has(area)) {
    return { error: "エリアを選択してください。" };
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
    latitude,
    longitude,
  });

  if (error) {
    return { error: "登録に失敗しました。" };
  }

  await notifyInterestedUsersOfNewStore(area, name);

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
  const isActive = formData.get("isActive") === "on";
  const address = (formData.get("address") as string)?.trim();
  const businessHours = (formData.get("businessHours") as string)?.trim();
  const reservationInfo = (formData.get("reservationInfo") as string)?.trim();
  const latitudeRaw = formData.get("latitude") as string;
  const longitudeRaw = formData.get("longitude") as string;
  const latitude = latitudeRaw ? Number(latitudeRaw) : null;
  const longitude = longitudeRaw ? Number(longitudeRaw) : null;

  if (!name) return { error: "店舗名を入力してください。" };
  if (!VALID_CATEGORIES.has(category)) {
    return { error: "カテゴリを選択してください。" };
  }
  if (!VALID_AREAS.has(area)) {
    return { error: "エリアを選択してください。" };
  }

  const { error } = await supabaseAdmin
    .from("stores")
    .update({
      name,
      category,
      area,
      line_available: lineAvailable,
      popular_with_japanese: popularWithJapanese,
      is_active: isActive,
      address: address || null,
      business_hours: businessHours || null,
      reservation_info: reservationInfo || null,
      latitude,
      longitude,
    })
    .eq("id", storeId);

  if (error) {
    return { error: "更新に失敗しました。" };
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
