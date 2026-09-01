import { JaKo } from "@/components/ja-ko";

export function ComingSoonPage({ ja, ko }: { ja: string; ko: string }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <JaKo ja={ja} ko={ko} />
      </h1>
      <p className="mt-2 text-sm text-muted">
        <JaKo ja="準備中です。もうしばらくお待ちください。" ko="준비 중입니다. 조금만 기다려주세요." />
      </p>
    </main>
  );
}
