// (테스트가 tsc로 이 파일만 컴파일하므로 "@/" 별칭 대신 상대 경로를 쓴다)
import { CATEGORIES, AREAS, type CategoryValue, type AreaValue } from "./taxonomy";

// 쿠폰 목록(/coupons)의 주소 파라미터 해석·페이지 계산·주소 만들기. 순수 함수라서 단위 테스트한다.
// 규칙: 잘못된 값(없는 카테고리·지역, 이상한 페이지 번호)은 오류가 아니라 "그 조건 없음"으로 취급한다.

export const COUPON_PAGE_SIZE = 24;
const MAX_PAGE = 500;

export type CouponSort = "new" | "ending";
export const COUPON_SORTS: { value: CouponSort; ja: string }[] = [
  { value: "new", ja: "新着順" },
  { value: "ending", ja: "期限が近い順" },
];

export type RawCouponListParams = { category?: string; area?: string; q?: string; sort?: string; page?: string };

export type CouponListParams = {
  category?: CategoryValue;
  area?: AreaValue;
  q?: string;
  sort: CouponSort;
  page: number;
};

export function parseCouponListParams(raw: RawCouponListParams): CouponListParams {
  const category = CATEGORIES.find((c) => c.value === raw.category)?.value;
  // "all"는 "전체 지역"을 뜻하는 기존 링크(/coupons?area=all)용 값이다
  const area = AREAS.find((a) => a.value === raw.area)?.value;
  const q = raw.q?.trim().slice(0, 50) || undefined;
  const sort: CouponSort = raw.sort === "ending" ? "ending" : "new";
  const n = Number(raw.page);
  const page = Number.isInteger(n) && n >= 1 ? Math.min(n, MAX_PAGE) : 1;
  return { category, area, q, sort, page };
}

// PostgREST의 or() 필터에서는 쉼표·괄호·따옴표·백슬래시가 문법 기호라서, 검색어를 그대로 넣으면
// 조건이 깨지거나(에러 → 빈 결과) 다른 조건을 끼워 넣을 수 있다. ilike 와일드카드(%, _)도 함께 뺀다.
export function sanitizeKeyword(keyword: string | undefined | null): string {
  return (keyword ?? "").replace(/[,()"'\\%*_:;]/g, " ").replace(/\s+/g, " ").trim();
}

export function totalPages(total: number, size: number = COUPON_PAGE_SIZE): number {
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.max(1, Math.ceil(total / size));
}

// Supabase의 range(from, to)는 양 끝을 포함한다.
export function pageRange(page: number, size: number = COUPON_PAGE_SIZE): { from: number; to: number } {
  const from = (Math.max(1, page) - 1) * size;
  return { from, to: from + size - 1 };
}

// 기본값(최신순, 1페이지)은 주소에서 생략한다. 조건이 하나도 없을 때는 "전체 목록"임을 알리려고 area=all을 붙인다
// (조건이 없으면 /coupons는 카테고리·지역 선택 화면을 보여주기 때문).
export function couponListHref(p: { category?: string; area?: string; q?: string; sort?: CouponSort; page?: number }): string {
  const params = new URLSearchParams();
  if (p.category) params.set("category", p.category);
  if (p.area) params.set("area", p.area);
  if (p.q) params.set("q", p.q);
  if (p.sort && p.sort !== "new") params.set("sort", p.sort);
  if (p.page && p.page > 1) params.set("page", String(p.page));
  if (!p.category && !p.area && !p.q) params.set("area", "all");
  const qs = params.toString();
  return `/coupons?${qs}`;
}
