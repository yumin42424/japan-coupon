import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import LINE from "next-auth/providers/line";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SIGNUPS_ENABLED } from "@/lib/feature-flags";

// 존재하지 않는 이메일이어도 항상 bcrypt 비교를 한 번 수행해서,
// 응답 속도로 "이 이메일이 가입되어 있는지"를 추측하지 못하게 한다.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing-safety", 10);

// 로그인 무차별 대입 공격 방어. 잠겼을 때도 "비밀번호가 틀렸습니다"와 동일한 메시지만 노출해서,
// 이 계정이 실제로 존재하는지/잠겨있는지를 외부에서 구분할 수 없게 한다.
//
// 이메일만으로 잠그면 아무나 남의 이메일(관리자 포함)로 5번 틀려서 그 사람을 계속 잠가둘 수 있다.
// 그래서 두 겹으로 건다:
//  - (접속 IP + 이메일) 조합: 15분에 5번 틀리면 15분 잠금. 공격자가 본인 IP로 잠그는 건 본인 IP의 그 계정뿐이다.
//  - 이메일 단독: 여러 IP로 분산 공격해도 15분에 30번을 넘으면 5분 잠금 (정상 사용자를 오래 막지 않는 완충 한도).
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
type LoginLimit = { maxAttempts: number; lockoutMs: number };
const PER_IP_EMAIL_LIMIT: LoginLimit = { maxAttempts: 5, lockoutMs: 15 * 60 * 1000 };
const PER_EMAIL_LIMIT: LoginLimit = { maxAttempts: 30, lockoutMs: 5 * 60 * 1000 };

async function isLoginLocked(key: string): Promise<boolean> {
  const { data: row } = await supabaseAdmin
    .from("login_attempts")
    .select("locked_until")
    .eq("email", key)
    .maybeSingle();

  return !!row?.locked_until && new Date(row.locked_until) > new Date();
}

async function recordLoginAttempt(key: string, success: boolean, limit: LoginLimit): Promise<void> {
  if (success) {
    await supabaseAdmin.from("login_attempts").delete().eq("email", key);
    return;
  }

  const now = new Date();
  const { data: row } = await supabaseAdmin
    .from("login_attempts")
    .select("attempt_count, first_attempt_at")
    .eq("email", key)
    .maybeSingle();

  const windowExpired =
    !row || now.getTime() - new Date(row.first_attempt_at).getTime() > ATTEMPT_WINDOW_MS;
  const attemptCount = windowExpired ? 1 : row.attempt_count + 1;

  await supabaseAdmin.from("login_attempts").upsert({
    email: key,
    attempt_count: attemptCount,
    first_attempt_at: windowExpired ? now.toISOString() : row.first_attempt_at,
    locked_until: attemptCount >= limit.maxAttempts ? new Date(now.getTime() + limit.lockoutMs).toISOString() : null,
  });
}

// signup/actions.ts의 signupWithLine/signupWithGoogle이 동의 체크박스가 확인된 경우에만
// 남겨두는 쿠키. LINE/Google 인가 서버를 왕복하고 돌아온 이 콜백 시점에 그 흔적을 읽어서,
// 신규 계정 생성 요청이 실제로 동의 화면을 거쳐왔는지 서버 쪽에서도 확인한다.
async function readOAuthConsent(): Promise<{ agreed: boolean; marketing: boolean }> {
  const store = await cookies();
  return {
    agreed: store.get("oauth_consent")?.value === "1",
    marketing: store.get("oauth_consent_marketing")?.value === "1",
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    // DB 세션 대신 JWT 세션을 씀 -> 별도 세션 테이블 없이 쿠키에 토큰만 저장 (MVP 단계에 적합)
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        // signup/forgot-password는 이메일을 소문자로 정규화해서 저장하므로,
        // 로그인 시에도 똑같이 정규화해야 대소문자 차이로 로그인이 실패하지 않는다.
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // 접속 IP는 Vercel이 x-forwarded-for에 실제 값으로 채워준다.
        const ip = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const ipEmailKey = `${ip}|${email}`;

        if ((await isLoginLocked(ipEmailKey)) || (await isLoginLocked(email))) return null;

        const { data: user } = await supabaseAdmin
          .from("users")
          .select("id, email, nickname, password_hash")
          .eq("email", email)
          .maybeSingle();

        const isValid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
        const success = !!user && !!user.password_hash && isValid;
        await recordLoginAttempt(ipEmailKey, success, PER_IP_EMAIL_LIMIT);
        await recordLoginAttempt(email, success, PER_EMAIL_LIMIT);
        if (!success || !user) return null;

        // last_login_at 갱신 (재방문율 지표에 쓰임)
        await supabaseAdmin
          .from("users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", user.id);

        return { id: user.id, email: user.email, name: user.nickname };
      },
    }),
    // AUTH_LINE_ID / AUTH_LINE_SECRET 환경변수를 자동으로 읽음 (LINE Developers의 LINE Login 채널 값)
    LINE,
    // AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET 환경변수를 자동으로 읽음 (Google Cloud Console의 OAuth 클라이언트 값)
    Google,
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // 우리 DB(users 테이블)를 기준으로 삼는 구조라, OAuth 로그인도
      // Supabase Auth가 아닌 users 테이블에 직접 upsert 해서 맞춰준다.
      let userId: string | undefined;

      if (account?.provider === "line") {
        const lineUserId = profile?.sub;
        if (!lineUserId) return false;

        const { data: existing } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("line_user_id", lineUserId)
          .maybeSingle();

        userId = existing?.id;

        if (!userId) {
          if (!SIGNUPS_ENABLED) return false;

          const consent = await readOAuthConsent();
          if (!consent.agreed) return false;
          const now = new Date().toISOString();

          const { data: created, error } = await supabaseAdmin
            .from("users")
            .insert({
              line_user_id: lineUserId,
              nickname: profile?.name || "LINEユーザー",
              // LINEは이메일 권한을 별도 신청해야 내려주므로, 없으면 임시 이메일로 대체
              // (users.email이 NOT NULL이라 스키마 변경 없이 우회)
              email: profile?.email || `line_${lineUserId}@line.local`,
              acquisition_source: "line",
              terms_agreed_at: now,
              privacy_agreed_at: now,
              marketing_agreed_at: consent.marketing ? now : null,
              // LINEアカウント連携時点で本人確認済みとみなす（メール確認は不要）
              email_verified_at: now,
            })
            .select("id")
            .single();

          if (error || !created) return false;
          userId = created.id;
        }
      } else if (account?.provider === "google") {
        const email = profile?.email;
        if (!email) return false;
        // Google이 검증되지 않은 이메일을 내려주는 예외적인 경우, 그 이메일로
        // 기존 비밀번호 계정에 자동 연결되면 계정 탈취로 이어질 수 있어 명시적으로 막는다.
        if (profile?.email_verified !== true) return false;

        // 구글은 이메일을 항상 검증된 상태로 주기 때문에 email로 매칭한다.
        // 이메일/비밀번호로 이미 가입한 계정이 있으면 그 계정에 그대로 연결된다.
        const { data: existing } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        userId = existing?.id;

        if (!userId) {
          if (!SIGNUPS_ENABLED) return false;

          const consent = await readOAuthConsent();
          if (!consent.agreed) return false;
          const now = new Date().toISOString();

          const { data: created, error } = await supabaseAdmin
            .from("users")
            .insert({
              email,
              nickname: profile?.name || "Googleユーザー",
              acquisition_source: "google",
              terms_agreed_at: now,
              privacy_agreed_at: now,
              marketing_agreed_at: consent.marketing ? now : null,
              // Googleは常に検証済みメールのみ渡すため、確認は不要
              email_verified_at: now,
            })
            .select("id")
            .single();

          if (error || !created) return false;
          userId = created.id;
        }
      } else {
        return true;
      }

      if (!userId) return false;

      await supabaseAdmin
        .from("users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", userId);

      user.id = userId;
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
