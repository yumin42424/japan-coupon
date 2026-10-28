// 매장의 지도 링크. 좌표가 한국 범위 안이면 좌표로, 없으면 주소 검색으로 Google 지도를 연다 (일본인 여행자에게 가장 익숙한 지도).
// 둘 다 없으면 null — 링크를 아예 보여주지 않는다. 관리자가 입력한 값만 쓰고 만들어 내지 않는다.
const KOREA_LAT = { min: 33, max: 39 };
const KOREA_LNG = { min: 124, max: 132 };

export function storeMapUrl(store: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}): string | null {
  const { latitude: lat, longitude: lng } = store;
  if (
    typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= KOREA_LAT.min && lat <= KOREA_LAT.max && lng >= KOREA_LNG.min && lng <= KOREA_LNG.max
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const address = store.address?.trim();
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}
