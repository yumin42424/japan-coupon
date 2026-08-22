"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type SettingsState = { error?: string; success?: string };

export async function updateNickname(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインが必要です。(로그인이 필요합니다.)" };

  const nickname = (formData.get("nickname") as string)?.trim();
  if (!nickname) {
    return { error: "ニックネームを入力してください。(닉네임을 입력해주세요.)" };
  }
  if (nickname.length > 30) {
    return { error: "ニックネームは30文字以内で入力してください。(닉네임은 30자 이내로 입력해주세요.)" };
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ nickname })
    .eq("id", session.user.id);

  if (error) {
    return { error: "更新に失敗しました。(수정에 실패했습니다.)" };
  }

  return { success: "ニックネームを変更しました。(닉네임이 변경됐습니다.)" };
}

export async function changePassword(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインが必要です。(로그인이 필요합니다.)" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword) {
    return { error: "すべての項目を入力してください。(모든 항목을 입력해주세요.)" };
  }
  if (newPassword.length < 8) {
    return { error: "新しいパスワードは8文字以上で入力してください。(새 비밀번호는 8자 이상 입력해주세요.)" };
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("password_hash")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!user?.password_hash) {
    return {
      error: "この方法ではパスワードを設定できません。(이 방식으로는 비밀번호를 설정할 수 없습니다.)",
    };
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    return { error: "現在のパスワードが正しくありません。(현재 비밀번호가 올바르지 않습니다.)" };
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  const { error } = await supabaseAdmin
    .from("users")
    .update({ password_hash: newHash })
    .eq("id", session.user.id);

  if (error) {
    return { error: "更新に失敗しました。(수정에 실패했습니다.)" };
  }

  return { success: "パスワードを変更しました。(비밀번호가 변경됐습니다.)" };
}
