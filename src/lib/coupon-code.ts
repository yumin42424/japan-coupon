// 손님 마이페이지의 QR에는 쿠폰 코드(발급 ID, UUID)가 들어 있다. 직원이 스캔하거나 입력한 값에서
// 그 코드만 꺼낸다. 앞뒤 공백, 대문자, 나중에 QR을 링크(…?code=…)로 바꾸는 경우까지 같은 결과가 나오게 한다.
const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function extractCouponCode(value: string): string {
  const match = value.match(UUID_IN_TEXT);
  return match ? match[0].toLowerCase() : value.trim();
}
