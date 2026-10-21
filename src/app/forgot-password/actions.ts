"use server";

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createAuthToken } from "@/lib/auth-tokens";
import { getMailReadiness, reportMailNotReady, sendEmail } from "@/lib/email";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://japan-coupon-five.vercel.app";

export type ForgotPasswordState = { submitted?: boolean; error?: string };

const HOUR = 60 * 60 * 1000;
// IP당 1시간에 5번, 같은 이메일 주소당 1시간에 3번까지만 메일을 보낸다 (타인 주소로 메일을 쏟아붓는 악용 방지).
const PER_IP = { max: 5, windowMs: HOUR, lockMs: HOUR };
const PER_EMAIL = { max: 3, windowMs: HOUR, lockMs: HOUR };

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || email.length > 254) {
    return { error: "メールアドレスを入力してください。" };
  }

  // 메일 발송 설정이 갖춰지지 않은 상태에서는 "送信しました"라고 말하지 않는다.
  // 이 검사는 입력한 주소와 무관하게 모든 요청에 똑같이 적용되므로 계정 존재 여부를 알려주지 않는다.
  const readiness = getMailReadiness();
  if (!readiness.ready) {
    reportMailNotReady(readiness);
    return { error: "現在、メールを送信できません。しばらくしてからもう一度お試しください。" };
  }

  const ip = await getClientIp();
  if (await isRateLimited(`reset:ip:${ip}`, PER_IP)) {
    return { error: "リクエストが多すぎます。しばらくしてからもう一度お試しください。" };
  }
  // 같은 주소로 한도를 넘긴 경우에는 "보냈다/안 보냈다"를 응답으로 구분할 수 없게 같은 성공 메시지를 돌려준다.
  const emailBlocked = await isRateLimited(`reset:email:${email}`, PER_EMAIL);

  // 이메일 존재 여부를 응답으로 구분할 수 없도록, 항상 같은 성공 메시지를 반환한다
  // (auth.ts의 로그인 타이밍 사이드채널 방지와 같은 원칙).
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (user?.password_hash && !emailBlocked) {
    const userId = user.id;
    // 토큰 생성·메일 발송은 응답을 돌려준 뒤에 처리한다 — 가입된 주소인지에 따라 응답 시간이 달라지지 않게.
    after(async () => {
      try {
        const token = await createAuthToken(userId, "password_reset");
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
      } catch (err) {
        console.error("[forgot-password] failed to send reset email", err);
      }
    });
  }

  return { submitted: true };
}
