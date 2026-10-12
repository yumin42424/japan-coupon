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

// 관심지역으로 그 エリア를 등록해둔 회원 중 LINE 연동 + 마케팅 수신에 동의한 사람에게만 신규 매장 소식을 보낸다
// (신규 매장 안내는 판촉 성격의 메시지라 동의 없이 보내면 안 된다).
async function notifyInterestedUsersOfNewStore(area: string, storeName: string) {
  const areaInfo = AREAS.find((a) => a.value === area);
  const { data: interested } = await supabaseAdmin
    .from("user_interest_areas")
    .select("users!inner(line_user_id, marketing_agreed_at)")
    .eq("area", area)
    .not("users.line_user_id", "is", null)
    .not("users.marketing_agreed_at", "is", null);

  const message = textMessage(
    `🆕${areaInfo?.ja ?? area}に新しいお店が登録されました！\n\n${storeName}\n\n${SITE_URL}/areas/${area}`
  );

  for (const row of (interested ?? []) as unknown as { users: { line_user_id: string | null } | null }[]) {
    const lineUserId = row.users?.line_user_id;
    if (lineUserId) await sendLinePush(lineUserId, [message]);
  }
}

export type StoreFormState = { error?: string };

// 한국 안에 있는 매장만 등록하므로 좌표도 한국 범위로 검증한다 (위도/경도를 뒤바꿔 넣는 실수 방지).
const KOREA_LAT = { min: 33, max: 39 };
const KOREA_LNG = { min: 124, max: 132 };

function parseStoreCoordinates(
  latitudeRaw: string,
  longitudeRaw: string
): { latitude: number | null; longitude: number | null; error?: string } {
  const hasLat = !!latitudeRaw?.trim();
  const hasLng = !!longitudeRaw?.trim();
  if (!hasLat && !hasLng) return { latitude: null, longitude: null };
  if (hasLat !== hasLng) {
    return { latitude: null, longitude: null, error: "緯度と経度は両方入力してください。" };
  }
  const latitude = Number(latitudeRaw);
  const longitude = Number(longitudeRaw);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < KOREA_LAT.min ||
    latitude > KOREA_LAT.max ||
    longitude < KOREA_LNG.min ||
    longitude > KOREA_LNG.max
  ) {
    return {
      latitude: null,
      longitude: null,
      error: "緯度・経度は韓国国内の値で入力してください（緯度33〜39、経度124〜132）。",
    };
  }
  return { latitude, longitude };
}

const MAX_TEXT = { name: 100, address: 200, businessHours: 200, reservationInfo: 300 };
function checkStoreTextLengths(v: {
  name: string;
  address?: string;
  businessHours?: string;
  reservationInfo?: string;
}): string | null {
  if (v.name.length > MAX_TEXT.name) return "店舗名は100文字以内で入力してください。";
  if ((v.address?.length ?? 0) > MAX_TEXT.address) return "住所は200文字以内で入力してください。";
  if ((v.businessHours?.length ?? 0) > MAX_TEXT.businessHours) return "営業時間は200文字以内で入力してください。";
  if ((v.reservationInfo?.length ?? 0) > MAX_TEXT.reservationInfo) return "予約方法は300文字以内で入力してください。";
  return null;
}

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
  const { latitude, longitude, error: coordError } = parseStoreCoordinates(
    formData.get("latitude") as string,
    formData.get("longitude") as string
  );

  if (!name) return { error: "店舗名を入力してください。" };
  const lengthError = checkStoreTextLengths({ name, address, businessHours, reservationInfo });
  if (lengthError) return { error: lengthError };
  if (coordError) return { error: coordError };
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
  const { latitude, longitude, error: coordError } = parseStoreCoordinates(
    formData.get("latitude") as string,
    formData.get("longitude") as string
  );

  if (!name) return { error: "店舗名を入力してください。" };
  const lengthError = checkStoreTextLengths({ name, address, businessHours, reservationInfo });
  if (lengthError) return { error: lengthError };
  if (coordError) return { error: coordError };
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
