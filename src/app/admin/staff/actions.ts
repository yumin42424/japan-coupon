"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, requireAdminUser } from "@/lib/admin";

export type StaffFormState = { error?: string; ok?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MISSING_TABLE_MESSAGE =
  "スタッフ機能のDB設定がまだ適用されていません。db/apply/apply-store-staff.sql を実行してください。";

function isMissingTable(code: string | undefined) {
  return code === "PGRST205" || code === "42P01";
}

// 회원을 매장 직원으로 연결한다. 이메일(@ 포함) 또는 닉네임 정확히 일치로 회원을 찾는다.
export async function addStaff(_prevState: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const adminId = await requireAdminUser();

  const who = String(formData.get("who") ?? "").trim();
  const storeId = String(formData.get("storeId") ?? "");
  if (!who) return { error: "メールアドレスまたはニックネームを入力してください。" };
  if (who.length > 100) return { error: "入力が長すぎます。" };
  if (!UUID_RE.test(storeId)) return { error: "店舗を選択してください。" };

  const { data: store } = await supabaseAdmin.from("stores").select("id, name").eq("id", storeId).maybeSingle();
  if (!store) return { error: "店舗が見つかりません。" };

  let userId: string | null = null;
  let nickname = "";
  if (who.includes("@")) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id, nickname")
      .eq("email", who.toLowerCase())
      .maybeSingle();
    if (data) ({ id: userId, nickname } = data);
  } else {
    const { data } = await supabaseAdmin.from("users").select("id, nickname").eq("nickname", who).limit(2);
    if ((data?.length ?? 0) > 1) {
      return { error: "同じニックネームの会員が複数います。メールアドレスで指定してください。" };
    }
    if (data?.[0]) ({ id: userId, nickname } = data[0]);
  }
  if (!userId) return { error: "該当する会員が見つかりません。先に会員登録をしてもらってください。" };

  const { error } = await supabaseAdmin
    .from("store_staff")
    .insert({ user_id: userId, store_id: store.id, created_by: adminId });
  if (error) {
    if (error.code === "23505") return { error: "この会員は既にこの店舗のスタッフとして登録されています。" };
    if (isMissingTable(error.code)) return { error: MISSING_TABLE_MESSAGE };
    Sentry.captureException(new Error(`staff add failed (${error.code ?? "no-code"})`));
    return { error: "登録に失敗しました。" };
  }

  revalidatePath("/admin/staff");
  return { ok: `${nickname} さんを「${store.name}」のスタッフに登録しました。` };
}

export async function removeStaff(userId: string, storeId: string) {
  await requireAdmin();
  if (!UUID_RE.test(userId) || !UUID_RE.test(storeId)) return;
  const { error } = await supabaseAdmin.from("store_staff").delete().eq("user_id", userId).eq("store_id", storeId);
  if (error && !isMissingTable(error.code)) {
    Sentry.captureException(new Error(`staff remove failed (${error.code ?? "no-code"})`));
  }
  revalidatePath("/admin/staff");
}
