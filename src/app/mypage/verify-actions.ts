"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://japan-coupon-five.vercel.app";

export async function resendVerificationEmail() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) redirect("/mypage");

  const token = await createAuthToken(session.user.id, "email_verify");
  const url = `${SITE_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: session.user.email,
    subject: "【K-Coupon Japan】メールアドレスの確認",
    html: `
      <p>以下のリンクをクリックして、メールアドレスの確認を完了してください（24時間有効）。</p>
      <p><a href="${url}">${url}</a></p>
    `,
  });

  redirect("/mypage?resent=1");
}
