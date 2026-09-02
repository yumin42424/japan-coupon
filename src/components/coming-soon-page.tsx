
export function ComingSoonPage({ ja }: { ja: string }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">
        {ja}
      </h1>
      <p className="mt-2 text-sm text-muted">
        準備中です。もうしばらくお待ちください。
      </p>
    </main>
  );
}
