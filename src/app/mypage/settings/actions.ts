"use server";

import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type SettingsState = { error?: string; success?: string };

export async function updateNickname(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインが必要です。" };

  const nickname = (formData.get("nickname") as string)?.trim();
  if (!nickname) {
    return { error: "ニックネームを入力してください。" };
  }
  if (nickname.length > 30) {
    return { error: "ニックネームは30文字以内で入力してください。" };
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ nickname })
    .eq("id", session.user.id);

  if (error) {
    return { error: "更新に失敗しました。" };
  }

  return { success: "ニックネームを変更しました。" };
}

export async function changePassword(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインが必要です。" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword) {
    return { error: "すべての項目を入力してください。" };
  }
  if (newPassword.length < 8) {
    return { error: "新しいパスワードは8文字以上で入力してください。" };
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("password_hash")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!user?.password_hash) {
    return {
      error: "この方法ではパスワードを設定できません。",
    };
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    return { error: "現在のパスワードが正しくありません。" };
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  const { error } = await supabaseAdmin
    .from("users")
    .update({ password_hash: newHash })
    .eq("id", session.user.id);

  if (error) {
    return { error: "更新に失敗しました。" };
  }

  return { success: "パスワードを変更しました。" };
}

export async function deleteAccount(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- useActionState always passes prevState
  _prevState: SettingsState
): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインが必要です。" };
  const userId = session.user.id;

  // 개인정보처리방침 제3조: 탈퇴 시 지체 없이 파기. FK 제약 때문에
  // 사용자를 참조하는 행들을 먼저 지우고 마지막에 users 행을 지운다.
  await supabaseAdmin.from("coupon_events").delete().eq("user_id", userId);
  await supabaseAdmin.from("point_events").delete().eq("user_id", userId);
  await supabaseAdmin.from("user_interest_categories").delete().eq("user_id", userId);
  await supabaseAdmin.from("user_interest_areas").delete().eq("user_id", userId);
  await supabaseAdmin.from("posts").delete().eq("user_id", userId);
  const { error } = await supabaseAdmin.from("users").delete().eq("id", userId);

  if (error) {
    return {
      error: "退会処理に失敗しました。しばらくしてからもう一度お試しください。",
    };
  }

  await signOut({ redirectTo: "/" });
  return {};
}
