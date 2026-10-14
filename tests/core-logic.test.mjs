import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const date = require("../.test-build/date.js");
const { safeRedirectPath } = require("../.test-build/safe-redirect.js");
const { isOpenNow } = require("../.test-build/business-hours.js");
const { computeReissueKey } = require("../.test-build/reissue.js");

test("KST date helpers: the Korean calendar day, not the UTC day", () => {
  // 2026-10-13 16:00 UTC is already 2026-10-14 01:00 in Korea
  const realNow = Date.now;
  Date.now = () => Date.UTC(2026, 9, 13, 16, 0, 0);
  try {
    assert.equal(date.todayKST(), "2026-10-14");
    assert.equal(date.addDaysKST(3), "2026-10-17");
  } finally { Date.now = realNow; }
  assert.equal(date.formatDateTimeKST("2026-10-13T16:05:00Z"), "2026/10/14 01:05");
});

test("safeRedirectPath blocks open redirects", () => {
  assert.equal(safeRedirectPath("/mypage"), "/mypage");
  assert.equal(safeRedirectPath("/coupons?x=1"), "/coupons?x=1");
  for (const bad of ["https://evil.example", "//evil.example", ("/" + String.fromCharCode(92) + "evil.example"), "javascript:alert(1)", "mypage", "", null, undefined, "/a://b"]) {
    assert.equal(safeRedirectPath(bad), "/", String(bad));
  }
  assert.equal(safeRedirectPath("//x", "/home"), "/home");
});

test("isOpenNow: ranges, overnight spans and unparseable text", () => {
  const at = (h, m) => new Date(2026, 0, 1, h, m);
  assert.equal(isOpenNow("11:00〜22:00", at(14, 0)), true);
  assert.equal(isOpenNow("11:00〜22:00", at(22, 0)), false);
  assert.equal(isOpenNow("22:00〜02:00", at(23, 30)), true);
  assert.equal(isOpenNow("22:00〜02:00", at(1, 0)), true);
  assert.equal(isOpenNow("22:00〜02:00", at(12, 0)), false);
  assert.equal(isOpenNow("10:00-14:00 / 17:00-21:00", at(15, 0)), false);
  assert.equal(isOpenNow("10:00-14:00 / 17:00-21:00", at(18, 0)), true);
  assert.equal(isOpenNow("年中無休", at(12, 0)), null);
  assert.equal(isOpenNow(null, at(12, 0)), null);
});

test("computeReissueKey: constant for one-time coupons, buckets for reusable ones", () => {
  const d = (iso) => new Date(iso);
  for (const v of [null, undefined, 0, -3]) assert.equal(computeReissueKey(v, d("2026-10-14T00:00:00Z")), "0");
  const a = computeReissueKey(30, d("2026-10-14T00:00:00Z"));
  assert.equal(computeReissueKey(30, d("2026-10-15T00:00:00Z")), a === computeReissueKey(30, d("2026-10-15T00:00:00Z")) ? a : a);
  assert.notEqual(computeReissueKey(1, d("2026-10-14T00:00:00Z")), computeReissueKey(1, d("2026-10-15T00:00:00Z")));
  assert.equal(computeReissueKey(7, d("2026-10-14T00:00:00Z")), computeReissueKey(7, d("2026-10-14T23:59:00Z")));
});
