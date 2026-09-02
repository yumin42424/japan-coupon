import { SignupForm } from "./signup-form";
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
          準備中です
        </h1>
        <p className="mt-2 text-sm text-muted">
          現在、会員登録機能を準備しています。もうしばらくお待ちください。
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-extrabold tracking-tight">
        無料会員登録
      </h1>
      <p className="mt-2 text-sm text-muted">
        会員登録すると、会員限定クーポンをGETできます。
      </p>

      <SignupForm acquisitionSource={utm_source ?? "direct"} />
    </main>
  );
}
