import { SignupForm } from "./signup-form";
import { JaKo } from "@/components/ja-ko";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ utm_source?: string }>;
}) {
  const { utm_source } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <JaKo ja="無料会員登録" ko="무료 회원가입" />
      </h1>
      <p className="mt-2 text-sm text-muted">
        <JaKo
          ja="会員登録すると、会員限定クーポンをGETできます。"
          ko="회원가입하면 회원 전용 쿠폰을 받을 수 있습니다."
        />
      </p>

      <SignupForm acquisitionSource={utm_source ?? "direct"} />
    </main>
  );
}
