"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";

const VALID_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.value));
const VALID_AREAS = new Set<string>(AREAS.map((a) => a.value));
const SLUG_RE = /^[a-z0-9-]+$/;

export type LandingPageFormState = { error?: string };

export async function createLandingPage(
  _prevState: LandingPageFormState,
  formData: FormData
): Promise<LandingPageFormState> {
  const slug = (formData.get("slug") as string)?.trim().toLowerCase();
  const utmSource = (formData.get("utmSource") as string)?.trim();
  const utmCampaign = (formData.get("utmCampaign") as string)?.trim();
  const targetCategory = formData.get("targetCategory") as string;
  const targetArea = formData.get("targetArea") as string;

  if (!slug || !SLUG_RE.test(slug)) {
    return {
      error: "スラッグは半角英数字とハイフンのみ使用できます。(슬러그는 영문 소문자·숫자·하이픈만 가능합니다.)",
    };
  }
  if (targetCategory && !VALID_CATEGORIES.has(targetCategory)) {
    return { error: "カテゴリが不正です。(카테고리가 올바르지 않습니다.)" };
  }
  if (targetArea && !VALID_AREAS.has(targetArea)) {
    return { error: "エリアが不正です。(지역이 올바르지 않습니다.)" };
  }

  const { data: existing } = await supabaseAdmin
    .from("landing_pages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return { error: "既に使われているスラッグです。(이미 사용 중인 슬러그입니다.)" };
  }

  const { error } = await supabaseAdmin.from("landing_pages").insert({
    slug,
    utm_source: utmSource || null,
    utm_campaign: utmCampaign || null,
    target_category: targetCategory || null,
    target_area: targetArea || null,
  });

  if (error) {
    return { error: "登録に失敗しました。(등록에 실패했습니다.)" };
  }

  revalidatePath("/admin/landing-pages");
  return {};
}

export async function deleteLandingPage(id: string) {
  await supabaseAdmin.from("landing_pages").delete().eq("id", id);
  revalidatePath("/admin/landing-pages");
}
