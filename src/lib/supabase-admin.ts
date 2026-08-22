import "server-only";
import { createClient } from "@supabase/supabase-js";

// service role key는 RLS(Row Level Security)를 무시하고 전체 DB에 접근할 수 있는 키.
// 반드시 서버 코드(API route, Server Action)에서만 사용하고, 클라이언트로 절대 넘기지 말 것.
// "server-only" import는 이 파일을 클라이언트 컴포넌트에서 실수로 import하면 빌드 에러를 내준다.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Supabase 환경변수가 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 설정하세요."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});
