import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const L = require("../.test-build/coupon-list.js");
const { storeMapUrl } = require("../.test-build/map-link.js");

test("list params: valid values pass through, defaults are newest-first on page 1", () => {
  assert.deepEqual(L.parseCouponListParams({ category: "gourmet", area: "myeongdong", q: "  カフェ ", sort: "ending", page: "3" }),
    { category: "gourmet", area: "myeongdong", q: "カフェ", sort: "ending", page: 3 });
  assert.deepEqual(L.parseCouponListParams({}), { category: undefined, area: undefined, q: undefined, sort: "new", page: 1 });
});

test("list params: unknown category/area and area=all mean 'no such filter', never an error", () => {
  const p = L.parseCouponListParams({ category: "weapons", area: "atlantis" });
  assert.equal(p.category, undefined);
  assert.equal(p.area, undefined);
  assert.equal(L.parseCouponListParams({ area: "all" }).area, undefined);
  // injection-looking values are simply not in the allowed list
  assert.equal(L.parseCouponListParams({ category: "gourmet,id.eq.1" }).category, undefined);
});

test("list params: sort falls back to newest; page numbers are clamped to 1..500", () => {
  assert.equal(L.parseCouponListParams({ sort: "price_desc" }).sort, "new");
  assert.equal(L.parseCouponListParams({ sort: "ending" }).sort, "ending");
  for (const bad of ["abc", "0", "-3", "1.5", "", "NaN", undefined]) assert.equal(L.parseCouponListParams({ page: bad }).page, 1, String(bad));
  assert.equal(L.parseCouponListParams({ page: "2" }).page, 2);
  assert.equal(L.parseCouponListParams({ page: "999999" }).page, 500);
});

test("list params: the keyword is trimmed and cut to 50 characters; blank means none", () => {
  assert.equal(L.parseCouponListParams({ q: "   " }).q, undefined);
  assert.equal(L.parseCouponListParams({ q: "あ".repeat(80) }).q.length, 50);
});

test("sanitizeKeyword removes every PostgREST filter metacharacter", () => {
  assert.equal(L.sanitizeKeyword("a,b(c)\"d'e\\f%g*h_i:j;k"), "a b c d e f g h i j k");
  assert.equal(L.sanitizeKeyword("  cafe    seongsu "), "cafe seongsu");
  assert.equal(L.sanitizeKeyword(",,,()"), "");
  assert.equal(L.sanitizeKeyword(undefined), "");
  // an attempt to smuggle an extra OR condition loses its syntax
  assert.ok(!/[,()]/.test(L.sanitizeKeyword("x,id.eq.1,title.ilike.%")));
});

test("paging math: pages and inclusive ranges", () => {
  assert.equal(L.COUPON_PAGE_SIZE, 24);
  assert.equal(L.totalPages(0), 1);
  assert.equal(L.totalPages(1), 1);
  assert.equal(L.totalPages(24), 1);
  assert.equal(L.totalPages(25), 2);
  assert.equal(L.totalPages(48), 2);
  assert.equal(L.totalPages(49), 3);
  assert.equal(L.totalPages(NaN), 1);
  assert.deepEqual(L.pageRange(1), { from: 0, to: 23 });
  assert.deepEqual(L.pageRange(2), { from: 24, to: 47 });
  assert.deepEqual(L.pageRange(3), { from: 48, to: 71 });
  assert.deepEqual(L.pageRange(0), { from: 0, to: 23 });
});

test("couponListHref: defaults are omitted, filters survive, an unfiltered list keeps area=all", () => {
  assert.equal(L.couponListHref({}), "/coupons?area=all");
  assert.equal(L.couponListHref({ sort: "new", page: 1 }), "/coupons?area=all");
  assert.equal(L.couponListHref({ category: "cafe" }), "/coupons?category=cafe");
  assert.equal(L.couponListHref({ category: "cafe", area: "seongsu", sort: "ending", page: 2 }), "/coupons?category=cafe&area=seongsu&sort=ending&page=2");
  assert.equal(L.couponListHref({ sort: "ending" }), "/coupons?sort=ending&area=all");
  assert.equal(L.couponListHref({ q: "カフェ & バー" }), "/coupons?q=%E3%82%AB%E3%83%95%E3%82%A7+%26+%E3%83%90%E3%83%BC");
});

test("a link built from parsed parameters parses back to the same parameters", () => {
  const p = L.parseCouponListParams({ category: "beauty", area: "gangnam", q: "ネイル", sort: "ending", page: "4" });
  const href = L.couponListHref(p);
  const back = L.parseCouponListParams(Object.fromEntries(new URL("https://x.example" + href).searchParams));
  assert.deepEqual(back, p);
});

test("storeMapUrl: coordinates inside Korea win, then the address, otherwise no link at all", () => {
  assert.equal(storeMapUrl({ latitude: 37.5636, longitude: 126.9827, address: "x" }), "https://www.google.com/maps/search/?api=1&query=37.5636,126.9827");
  assert.equal(storeMapUrl({ latitude: null, longitude: null, address: "서울 중구 명동길 14" }), "https://www.google.com/maps/search/?api=1&query=%EC%84%9C%EC%9A%B8%20%EC%A4%91%EA%B5%AC%20%EB%AA%85%EB%8F%99%EA%B8%B8%2014");
  // swapped / foreign coordinates are not trusted
  assert.ok(storeMapUrl({ latitude: 126.98, longitude: 37.56, address: "addr" }).includes("query=addr"));
  assert.ok(storeMapUrl({ latitude: 35.68, longitude: 139.76, address: "addr" }).includes("query=addr"));
  assert.equal(storeMapUrl({ latitude: NaN, longitude: 127, address: "  " }), null);
  assert.equal(storeMapUrl({}), null);
});
