import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { shouldAnnounceStore } = require("../.test-build/store-publish.js");

const base = { wasPublic: false, isPublic: true, isDemo: false, hasCustomerActivity: false };

test("등록과 동시에 공개한 새 매장은 알린다", () => {
  assert.equal(shouldAnnounceStore(base), true);
});

test("비공개로 등록하면 알리지 않는다", () => {
  assert.equal(shouldAnnounceStore({ ...base, isPublic: false }), false);
});

test("비공개로 등록했던 매장을 처음 공개하면 알린다", () => {
  assert.equal(shouldAnnounceStore({ ...base, wasPublic: false, isPublic: true }), true);
});

test("이미 공개된 매장을 수정 저장해도 다시 알리지 않는다", () => {
  assert.equal(shouldAnnounceStore({ ...base, wasPublic: true }), false);
});

test("잠시 내렸다가 다시 공개할 때 손님 이용 기록이 있으면 알리지 않는다", () => {
  assert.equal(shouldAnnounceStore({ ...base, hasCustomerActivity: true }), false);
});

test("DEMO 매장은 공개 상태여도 알리지 않는다", () => {
  assert.equal(shouldAnnounceStore({ ...base, isDemo: true }), false);
});
