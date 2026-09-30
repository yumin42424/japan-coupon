"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://japan-coupon-five.vercel.app";

export type ForgotPasswordState = { submitted?: boolean; error?: string };

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) {
    return { error: "メールアドレスを入力してください。" };
  }

  // 이메일 존재 여부를 응답으로 구분할 수 없도록, 항상 같은 성공 메시지를 반환한다
  // (auth.ts의 로그인 타이밍 사이드채널 방지와 같은 원칙).
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (user?.password_hash) {
    const token = await createAuthToken(user.id, "password_reset");
    const url = `${SITE_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: "【K-Coupon Japan】パスワード再設定",
      html: `
        <p>パスワード再設定のリクエストを受け付けました。</p>
        <p>以下のリンクから新しいパスワードを設定してください（30分間有効）。</p>
        <p><a href="${url}">${url}</a></p>
        <p>心当たりがない場合は、このメールは無視してください。</p>
      `,
    });
  }

  return { submitted: true };
}
