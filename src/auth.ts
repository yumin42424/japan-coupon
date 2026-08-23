import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import LINE from "next-auth/providers/line";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SIGNUPS_ENABLED } from "@/lib/feature-flags";

// 존재하지 않는 이메일이어도 항상 bcrypt 비교를 한 번 수행해서,
// 응답 속도로 "이 이메일이 가입되어 있는지"를 추측하지 못하게 한다.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing-safety", 10);

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
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const { data: user } = await supabaseAdmin
          .from("users")
          .select("id, email, nickname, password_hash")
          .eq("email", email)
          .maybeSingle();

        const isValid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
        if (!user || !user.password_hash || !isValid) return null;

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

          const { data: created, error } = await supabaseAdmin
            .from("users")
            .insert({
              line_user_id: lineUserId,
              nickname: profile?.name || "LINEユーザー",
              // LINEは이메일 권한을 별도 신청해야 내려주므로, 없으면 임시 이메일로 대체
              // (users.email이 NOT NULL이라 스키마 변경 없이 우회)
              email: profile?.email || `line_${lineUserId}@line.local`,
              acquisition_source: "line",
            })
            .select("id")
            .single();

          if (error || !created) return false;
          userId = created.id;
        }
      } else if (account?.provider === "google") {
        const email = profile?.email;
        if (!email) return false;

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

          const { data: created, error } = await supabaseAdmin
            .from("users")
            .insert({
              email,
              nickname: profile?.name || "Googleユーザー",
              acquisition_source: "google",
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
