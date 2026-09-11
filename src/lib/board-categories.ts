export const BOARD_CATEGORIES = [
  { value: "first_time", ja: "初めての韓国" },
  { value: "gourmet", ja: "グルメ" },
  { value: "beauty", ja: "美容" },
  { value: "shopping", ja: "ショッピング" },
  { value: "cafe", ja: "カフェ" },
  { value: "hotel", ja: "ホテル" },
  { value: "transit", ja: "交通" },
  { value: "other", ja: "その他" },
] as const;

export type BoardCategory = (typeof BOARD_CATEGORIES)[number]["value"];

export const DEFAULT_BOARD_CATEGORY: BoardCategory = "other";

export function isBoardCategory(value: unknown): value is BoardCategory {
  return BOARD_CATEGORIES.some((c) => c.value === value);
}
