import { SignupForm } from "./signup-form";
import { JaKo } from "@/components/ja-ko";
import { SIGNUPS_ENABLED } from "@/lib/feature-flags";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ utm_source?: string }>;
}) {
  const { utm_source } = await searchParams;

  if (!SIGNUPS_ENABLED) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col justify-center px-6 py-12">
        <h1 className="text-2xl font-extrabold tracking-tight">
          <JaKo ja="準備中です" ko="준비 중입니다" />
        </h1>
        <p className="mt-2 text-sm text-muted">
          <JaKo
            ja="現在、会員登録機能を準備しています。もうしばらくお待ちください。"
            ko="현재 회원가입 기능을 준비하고 있습니다. 조금만 기다려주세요."
          />
        </p>
      </main>
    );
  }

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
