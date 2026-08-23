"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { signIn } from "@/auth";
import { SIGNUPS_ENABLED } from "@/lib/feature-flags";

const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("正しいメールアドレスを入力してください。(올바른 이메일 주소를 입력해주세요.)"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください。(비밀번호는 8자 이상 입력해주세요.)"),
  nickname: z
    .string()
    .trim()
    .min(1, "ニックネームを入力してください。(닉네임을 입력해주세요.)")
    .max(30),
  acquisitionSource: z.string().trim().default("direct"),
});

export type SignupState = {
  error?: string;
};

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  if (!SIGNUPS_ENABLED) {
    return { error: "現在、会員登録機能を準備しています。(현재 회원가입 기능을 준비하고 있습니다.)" };
  }

  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    nickname: formData.get("nickname"),
    acquisitionSource: formData.get("acquisitionSource") || "direct",
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "入力内容を確認してください。(입력 내용을 확인해주세요.)",
    };
  }

  const { email, password, nickname, acquisitionSource } = parsed.data;

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return { error: "既に登録されているメールアドレスです。(이미 가입된 이메일 주소입니다.)" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { error: insertError } = await supabaseAdmin.from("users").insert({
    email,
    password_hash: passwordHash,
    nickname,
    acquisition_source: acquisitionSource,
  });

  if (insertError) {
    return {
      error:
        "登録に失敗しました。しばらくしてからもう一度お試しください。(가입에 실패했습니다. 잠시 후 다시 시도해주세요.)",
    };
  }

  // 가입 직후 자동 로그인
  await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  redirect("/onboarding");
}
