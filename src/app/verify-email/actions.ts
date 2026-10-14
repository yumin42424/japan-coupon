"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { consumeAuthToken } from "@/lib/auth-tokens";

// 메일 링크를 "열기만 해도" 인증되면, 메일 보안 프로그램/미리보기가 링크를 먼저 열어 토큰을 소모해 버려
// 정작 본인이 눌렀을 때 "이미 사용됨"이 뜬다. 그래서 링크는 확인 화면만 보여 주고, 버튼(POST)을 눌러야 인증된다.
export async function confirmEmail(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const userId = token ? await consumeAuthToken(token, "email_verify") : null;

  if (!userId) redirect("/verify-email?status=invalid");

  await supabaseAdmin
    .from("users")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", userId);

  redirect("/verify-email?status=done");
}
