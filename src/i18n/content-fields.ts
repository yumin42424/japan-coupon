// 자동 번역할 칸. 화면에 글로 보이는 값만 적는다(값으로 비교하거나 지도 검색에 쓰는 칸은 넣지 않는다).
export const COUPON_TEXT = ["title", "discount_info", "usage_condition", "stores.name"] as const;
export const COUPON_DETAIL_TEXT = [...COUPON_TEXT, "stores.address", "stores.business_hours", "stores.reservation_info"] as const;
export const COUPON_EVENT_TEXT = COUPON_TEXT.map((path) => `coupons.${path}`);
export const NOTICE_TEXT = ["title", "body"] as const;
export const POST_TEXT = ["title", "body"] as const;
export const REVIEW_TEXT = ["body"] as const;
