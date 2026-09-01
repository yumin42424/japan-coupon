// valid_to까지 남은 일수. "오늘" 기준 0 이상만 넘어온다는 전제(만료된 쿠폰은 쿼리에서 이미 제외됨).
export function daysUntil(validTo: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((new Date(validTo).getTime() - new Date(today).getTime()) / msPerDay);
}

// 마감 임박 배지를 보여줄지 여부 (오늘 포함 3일 이내)
export const URGENT_DAYS_THRESHOLD = 3;

export function isUrgentDeadline(validTo: string): boolean {
  const days = daysUntil(validTo);
  return days >= 0 && days <= URGENT_DAYS_THRESHOLD;
}
