// 영업시간은 관리자가 자유 텍스트로 입력하기 때문에 구조화된 데이터가 아니다.
// "10:00〜20:00", "11:00-14:00, 17:00-21:00" 같은 흔한 패턴만 최대한 안전하게
// 해석하고, 조금이라도 애매하면(요일별 표기 등) null을 반환해서 배지 자체를 숨긴다 —
// 틀린 "영업중/영업종료" 표시를 보여주는 것보다 아예 안 보여주는 게 낫다.
const RANGE_RE = /(\d{1,2}):(\d{2})\s*[〜~\-ー−]\s*(\d{1,2}):(\d{2})/g;

export function isOpenNow(businessHours: string | null | undefined, now: Date = new Date()): boolean | null {
  if (!businessHours) return null;

  const ranges: Array<{ startMin: number; endMin: number }> = [];
  let match: RegExpExecArray | null;
  RANGE_RE.lastIndex = 0;
  while ((match = RANGE_RE.exec(businessHours))) {
    const startH = Number(match[1]);
    const startM = Number(match[2]);
    const endH = Number(match[3]);
    const endM = Number(match[4]);
    if (startH > 23 || endH > 23 || startM > 59 || endM > 59) continue;
    ranges.push({ startMin: startH * 60 + startM, endMin: endH * 60 + endM });
  }
  if (ranges.length === 0) return null;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  return ranges.some(({ startMin, endMin }) => {
    if (startMin === endMin) return false;
    if (startMin < endMin) {
      // 당일 안에서 끝나는 일반적인 영업시간
      return nowMin >= startMin && nowMin < endMin;
    }
    // 자정을 넘기는 영업시간 (예: 18:00〜02:00)
    return nowMin >= startMin || nowMin < endMin;
  });
}
