// 쿠폰의 valid_from / valid_to 는 한국에서 쓰는 "날짜"이므로 한국 시간(KST, UTC+9) 기준으로 비교한다.
// new Date().toISOString().slice(0, 10)은 UTC 날짜라서, 한국 시간 0~9시 사이에는
// 이미 만료된 쿠폰이 최대 9시간 더 유효한 것처럼 보이는 문제가 있었다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstDateString(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function todayKST(): string {
  return kstDateString(new Date());
}

export function addDaysKST(days: number): string {
  return kstDateString(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

// 화면 표시용 "YYYY/MM/DD HH:mm" (한국·일본 모두 UTC+9라서 일본 이용자에게도 그대로 맞는다).
export function formatDateTimeKST(iso: string): string {
  const d = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
