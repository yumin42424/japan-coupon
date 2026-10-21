"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";
import { isRateLimited } from "@/lib/rate-limit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://japan-coupon-five.vercel.app";

// 본인 주소로만 가지만, 버튼을 연타해 메일이 쌓이거나 발송 비용이 늘지 않게 회원당 1시간에 5번까지만 허용한다.
const RESEND_LIMIT = { max: 5, windowMs: 60 * 60 * 1000, lockMs: 60 * 60 * 1000 };

export async function resendVerificationEmail() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) redirect("/mypage");

  if (await isRateLimited(`verify-resend:${session.user.id}`, RESEND_LIMIT)) {
    redirect("/mypage?resent=limited");
  }

  const token = await createAuthToken(session.user.id, "email_verify");
  const url = `${SITE_URL}/verify-email?token=${token}`;
  const result = await sendEmail({
    to: session.user.email,
    subject: "【K-Coupon Japan】メールアドレスの確認",
    html: `
      <p>以下のリンクをクリックして、メールアドレスの確認を完了してください（24時間有効）。</p>
      <p><a href="${url}">${url}</a></p>
    `,
  });

  // 실제로 보냈을 때만 "再送しました"를 보여준다 (이전에는 발송이 실패해도 항상 성공처럼 표시했다).
  redirect(result.ok ? "/mypage?resent=1" : "/mypage?resent=error");
}
