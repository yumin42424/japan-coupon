// カテゴリ/エリア/ヒーロー用の代表画像。Wikimedia Commons の CC ライセンス写真を、リサイズ・トリミングしてこのサイト内
// (public/images/stock) に置いている。外部サーバーを直接読み込まないので、相手側の障害・アクセス制限・レート制限の影響を受けない。
// 撮影者・ライセンスは src/lib/image-credits.ts と /credits ページに掲載している（CC BY / BY-SA は表記が必須）。
// 実際の店舗写真ではなくカテゴリやエリアを象徴するイメージで、店舗ごとの写真アップロード機能ができたら差し替える。
export const CATEGORY_IMAGES: Record<string, string> = {
  gourmet: "/images/stock/gourmet.jpg",
  beauty: "/images/stock/beauty.jpg",
  medical: "/images/stock/medical.jpg",
  shopping: "/images/stock/shopping.jpg",
  cafe: "/images/stock/cafe.jpg",
  tour: "/images/stock/tour.jpg",
  transport: "/images/stock/transport.jpg",
  hotel: "/images/stock/hotel.jpg",
};

// ホームページのヒーロー用 (景福宮)
export const HERO_IMAGE = "/images/stock/tour.jpg";

// 人気エリアカード用の代表画像
export const AREA_IMAGES: Partial<Record<string, string>> = {
  myeongdong: "/images/stock/area-myeongdong.jpg",
  hongdae: "/images/stock/area-hongdae.jpg",
  gangnam: "/images/stock/area-gangnam.jpg",
  seongsu: "/images/stock/area-seongsu.jpg",
};
