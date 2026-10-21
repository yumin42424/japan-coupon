import { z } from "zod";

// 이메일 가입 입력 검증. 서버 액션 파일 밖으로 분리해 단위 테스트한다 (동작은 그대로).
export const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("正しいメールアドレスを入力してください。"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください。")
    .max(128, "パスワードは128文字以内で入力してください。"),
  nickname: z
    .string()
    .trim()
    .min(1, "ニックネームを入力してください。")
    .max(30),
  // hidden 필드라서 외부에서 임의 문자열이 들어올 수 있다 — 유입경로 통계가 오염되지 않게 안전한 토큰 형태만 허용.
  acquisitionSource: z
    .string()
    .trim()
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/)
    .catch("direct"),
});
