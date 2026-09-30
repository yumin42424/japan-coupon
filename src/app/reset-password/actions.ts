"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { consumeAuthToken } from "@/lib/auth-tokens";

export type ResetPasswordState = { error?: string };

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  if (!token) {
    return { error: "リンクが無効です。もう一度お試しください。" };
  }
  if (!password || password.length < 8) {
    return { error: "パスワードは8文字以上で入力してください。" };
  }

  const userId = await consumeAuthToken(token, "password_reset");
  if (!userId) {
    return { error: "リンクの有効期限が切れているか、すでに使用されています。" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await supabaseAdmin.from("users").update({ password_hash: passwordHash }).eq("id", userId);

  redirect("/login?reset=1");
}
