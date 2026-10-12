// 写真クレジット — Wikimedia Commons から取得した写真の撮影者・ライセンス・出典。
// データは Wikimedia Commons API (extmetadata) の値をそのまま転記している。
// CC BY / CC BY-SA の写真は撮影者名・ライセンス・変更の有無の明記が必要なため、/credits ページで表示する。
export type ImageCredit = {
  slug: string;
  usage: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
};

export const IMAGE_CREDITS: readonly ImageCredit[] = [
  {
    "slug": "gourmet",
    "usage": "グルメ（カテゴリ画像）",
    "title": "Korean barbecue-Samgyeopsal-08",
    "author": "Wikimedia Commons 投稿者（ファイルページに記載）",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Korean_barbecue-Samgyeopsal-08.jpg"
  },
  {
    "slug": "beauty",
    "usage": "美容（カテゴリ画像）",
    "title": "Korean cosmetic products",
    "author": "Jmh65890",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Korean_cosmetic_products.jpg"
  },
  {
    "slug": "medical",
    "usage": "美容医療・クリニック（カテゴリ画像）",
    "title": "Lark Dermatology 4442",
    "author": "Chris Light",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Lark_Dermatology_4442.jpg"
  },
  {
    "slug": "shopping",
    "usage": "ショッピング（カテゴリ画像）",
    "title": "Lotte Young Plaza at Myeongdong",
    "author": "ProjectManhattan",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Lotte_Young_Plaza_at_Myeongdong.jpg"
  },
  {
    "slug": "cafe",
    "usage": "カフェ（カテゴリ画像）",
    "title": "Latte art",
    "author": "Mortefot from Flickr",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Latte_art.jpg"
  },
  {
    "slug": "tour",
    "usage": "観光（カテゴリ画像・トップページ下部）",
    "title": "Gyeongbokgung Palace, Seoul, 1395 (88) (40418692334)",
    "author": "Richard Mortel from Riyadh, Saudi Arabia",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Gyeongbokgung_Palace,_Seoul,_1395_(88)_(40418692334).jpg"
  },
  {
    "slug": "transport",
    "usage": "交通（カテゴリ画像）",
    "title": "Korail KTX-2",
    "author": "G43",
    "license": "CC BY 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Korail_KTX-2.jpg"
  },
  {
    "slug": "hotel",
    "usage": "ホテル（カテゴリ画像）",
    "title": "Hotel Niwa Tokyo standard bedroom 20131027-001",
    "author": "J o",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Hotel_Niwa_Tokyo_standard_bedroom_20131027-001.jpg"
  },
  {
    "slug": "area-myeongdong",
    "usage": "明洞（エリア画像・トップページ背景）",
    "title": "Myeongdong at night",
    "author": "Christian Bolz (크리스티안 볼츠)",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Myeongdong_at_night.jpg"
  },
  {
    "slug": "area-hongdae",
    "usage": "弘大（エリア画像）",
    "title": "Hongdae Street",
    "author": "Minseong Kim",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Hongdae_Street.jpg"
  },
  {
    "slug": "area-gangnam",
    "usage": "江南（エリア画像）",
    "title": "Gangnam from Yeoksam 1",
    "author": "kallerna",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Gangnam_from_Yeoksam_1.jpg"
  },
  {
    "slug": "area-seongsu",
    "usage": "聖水（エリア画像）",
    "title": "Seongsu-dong storefronts",
    "author": "CartoonChess",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Seongsu-dong_storefronts.jpg"
  }
];
