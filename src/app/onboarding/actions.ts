"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";

const VALID_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.value));
const VALID_AREAS = new Set<string>(AREAS.map((a) => a.value));
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export async function saveOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const rawTravelDate = formData.get("travelDate") as string | null;
  const travelDate = rawTravelDate && DATE_ONLY.test(rawTravelDate) ? rawTravelDate : null;

  // 체크박스 값이지만 폼을 직접 조작해 임의 문자열을 보낼 수 있으므로,
  // 정해진 카테고리/지역 목록에 있는 값만 통과시킨다 (관리자 통계 오염 방지).
  const categories = (formData.getAll("categories") as string[]).filter((c) =>
    VALID_CATEGORIES.has(c)
  );
  const areas = (formData.getAll("areas") as string[]).filter((a) => VALID_AREAS.has(a));

  await supabaseAdmin
    .from("users")
    .update({ travel_date: travelDate || null })
    .eq("id", userId);

  // 재방문 시에도 항상 최신 선택값으로 덮어쓰기 위해 삭제 후 재삽입
  await supabaseAdmin.from("user_interest_categories").delete().eq("user_id", userId);
  if (categories.length > 0) {
    await supabaseAdmin
      .from("user_interest_categories")
      .insert(categories.map((category) => ({ user_id: userId, category })));
  }

  await supabaseAdmin.from("user_interest_areas").delete().eq("user_id", userId);
  if (areas.length > 0) {
    await supabaseAdmin
      .from("user_interest_areas")
      .insert(areas.map((area) => ({ user_id: userId, area })));
  }

  redirect("/");
}
