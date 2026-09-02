"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { signIn } from "@/auth";
import { SIGNUPS_ENABLED } from "@/lib/feature-flags";

// LINE/Google은 인가 서버로 리다이렉트했다가 콜백으로 돌아오는 구조라, 그 사이에
// "동의 체크박스를 확인하고 눌렀다"는 사실을 auth.ts의 signIn 콜백까지 전달할 방법이
// 마땅치 않다. 짧게 사는 쿠키에 담아 콜백에서 읽는 방식으로 우회한다.
const CONSENT_COOKIE_MAX_AGE = 60 * 10; // 10분

// 가입 어뷰징 방지: 로그인과 달리 이메일은 매번 바꿔서 시도할 수 있으므로
// IP 기준으로 막는다. 1시간 동안 5번 넘게 시도하면 1시간 잠금.
const MAX_SIGNUP_ATTEMPTS = 5;
const SIGNUP_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_LOCKOUT_MS = 60 * 60 * 1000;

async function getClientIp(): Promise<string> {
  const store = await headers();
  return store.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function isSignupLocked(ip: string): Promise<boolean> {
  const { data: row } = await supabaseAdmin
    .from("signup_attempts")
    .select("locked_until")
    .eq("ip", ip)
    .maybeSingle();

  return !!row?.locked_until && new Date(row.locked_until) > new Date();
}

async function recordSignupAttempt(ip: string): Promise<void> {
  const now = new Date();
  const { data: row } = await supabaseAdmin
    .from("signup_attempts")
    .select("attempt_count, first_attempt_at")
    .eq("ip", ip)
    .maybeSingle();

  const windowExpired =
    !row || now.getTime() - new Date(row.first_attempt_at).getTime() > SIGNUP_ATTEMPT_WINDOW_MS;
  const attemptCount = windowExpired ? 1 : row.attempt_count + 1;

  await supabaseAdmin.from("signup_attempts").upsert({
    ip,
    attempt_count: attemptCount,
    first_attempt_at: windowExpired ? now.toISOString() : row.first_attempt_at,
    locked_until:
      attemptCount >= MAX_SIGNUP_ATTEMPTS ? new Date(now.getTime() + SIGNUP_LOCKOUT_MS).toISOString() : null,
  });
}

const SIGNUP_RATE_LIMIT_ERROR =
  "登録の試行回数が多すぎます。しばらくしてからもう一度お試しください。";

async function recordOAuthConsent(formData: FormData) {
  const agreeTerms = formData.get("agreeTerms") === "on";
  const agreePrivacy = formData.get("agreePrivacy") === "on";
  if (!agreeTerms || !agreePrivacy) return;

  const store = await cookies();
  const cookieOptions = {
    maxAge: CONSENT_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
  };
  store.set("oauth_consent", "1", cookieOptions);
  if (formData.get("agreeMarketing") === "on") {
    store.set("oauth_consent_marketing", "1", cookieOptions);
  }
}

export async function signupWithLine(formData: FormData) {
  const ip = await getClientIp();
  if (await isSignupLocked(ip)) {
    redirect("/signup?error=rate_limited");
  }
  await recordSignupAttempt(ip);
  await recordOAuthConsent(formData);
  await signIn("line", { redirectTo: "/" });
}

export async function signupWithGoogle(formData: FormData) {
  const ip = await getClientIp();
  if (await isSignupLocked(ip)) {
    redirect("/signup?error=rate_limited");
  }
  await recordSignupAttempt(ip);
  await recordOAuthConsent(formData);
  await signIn("google", { redirectTo: "/" });
}

const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("正しいメールアドレスを入力してください。"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください。"),
  nickname: z
    .string()
    .trim()
    .min(1, "ニックネームを入力してください。")
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
    return { error: "現在、会員登録機能を準備しています。" };
  }

  const ip = await getClientIp();
  if (await isSignupLocked(ip)) {
    return { error: SIGNUP_RATE_LIMIT_ERROR };
  }
  await recordSignupAttempt(ip);

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
        "入力内容を確認してください。",
    };
  }

  const { email, password, nickname, acquisitionSource } = parsed.data;

  if (formData.get("agreeTerms") !== "on" || formData.get("agreePrivacy") !== "on") {
    return {
      error: "利用規約とプライバシーポリシーへの同意が必要です。",
    };
  }

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return { error: "既に登録されているメールアドレスです。" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const { error: insertError } = await supabaseAdmin.from("users").insert({
    email,
    password_hash: passwordHash,
    nickname,
    acquisition_source: acquisitionSource,
    terms_agreed_at: now,
    privacy_agreed_at: now,
    marketing_agreed_at: formData.get("agreeMarketing") === "on" ? now : null,
  });

  if (insertError) {
    return {
      error:
        "登録に失敗しました。しばらくしてからもう一度お試しください。",
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
