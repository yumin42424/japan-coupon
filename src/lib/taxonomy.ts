// stores/coupons/user_interest_* 테이블에서 공통으로 쓰는 카테고리·지역 값.
// value는 DB에 저장되는 값, ja/ko는 화면 표시용.

export const CATEGORIES = [
  { value: "gourmet", ja: "グルメ", ko: "맛집" },
  { value: "beauty", ja: "美容", ko: "뷰티" },
  { value: "medical", ja: "医療", ko: "의료" },
  { value: "shopping", ja: "ショッピング", ko: "쇼핑" },
  { value: "cafe", ja: "カフェ", ko: "카페" },
  { value: "tour", ja: "観光", ko: "관광" },
  { value: "transport", ja: "交通", ko: "교통" },
  { value: "hotel", ja: "ホテル", ko: "호텔" },
] as const;

export const AREAS = [
  { value: "myeongdong", ja: "明洞", ko: "명동" },
  { value: "hongdae", ja: "弘大", ko: "홍대" },
  { value: "gangnam", ja: "江南", ko: "강남" },
  { value: "seongsu", ja: "聖水", ko: "성수" },
  { value: "dongdaemun", ja: "東大門", ko: "동대문" },
  { value: "itaewon", ja: "梨泰院", ko: "이태원" },
  { value: "jamsil", ja: "蚕室", ko: "잠실" },
  { value: "busan", ja: "釜山", ko: "부산" },
  { value: "jeju", ja: "済州", ko: "제주" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];
export type AreaValue = (typeof AREAS)[number]["value"];
