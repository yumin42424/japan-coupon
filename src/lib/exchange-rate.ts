import "server-only";

// 키 없이 쓸 수 있는 공개 환율 API. 1시간 캐시해서 요청마다 외부 호출이 나가지
// 않게 하고, 실패해도(네트워크 문제 등) null을 반환해서 페이지 자체는 그대로 뜨게 한다.
export async function getKrwToJpyRate(): Promise<number | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/KRW", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result !== "success" || !data.rates?.JPY) return null;
    return data.rates.JPY;
  } catch {
    return null;
  }
}

export function formatJpy(krwAmount: number, rate: number): string {
  const jpy = Math.round(krwAmount * rate);
  return `¥${jpy.toLocaleString()}`;
}
