"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export type LoginState = {
  error?: string;
};

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          "メールアドレスまたはパスワードが正しくありません。",
      };
    }
    // NextAuth의 redirectTo는 내부적으로 redirect 예외를 던져서 이동을 처리함 -> 그대로 다시 던져야 함
    throw error;
  }
}
