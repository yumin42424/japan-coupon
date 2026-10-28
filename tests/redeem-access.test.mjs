import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { canRedeemForStore } = require("../.test-build/redeem-access.js");

const STORE_A = "aaaaaaaa-1111-4111-8111-bbbbbbbbbbbb";
const STORE_B = "cccccccc-2222-4222-8222-dddddddddddd";

test("redeem access: an admin may redeem for any store", () => {
  assert.equal(canRedeemForStore({ isAdmin: true, staffStoreIds: [] }, STORE_A), true);
  assert.equal(canRedeemForStore({ isAdmin: true, staffStoreIds: [STORE_B] }, STORE_A), true);
  // even if the coupon's store could not be read, an admin keeps the existing behaviour
  assert.equal(canRedeemForStore({ isAdmin: true, staffStoreIds: [] }, null), true);
});

test("redeem access: store staff may redeem only for the stores they are linked to", () => {
  const staff = { isAdmin: false, staffStoreIds: [STORE_A] };
  assert.equal(canRedeemForStore(staff, STORE_A), true);
  assert.equal(canRedeemForStore(staff, STORE_B), false);
  assert.equal(canRedeemForStore({ isAdmin: false, staffStoreIds: [STORE_A, STORE_B] }, STORE_B), true);
});

test("redeem access: everything unclear is refused (no link, empty list, unknown store, odd ids)", () => {
  assert.equal(canRedeemForStore({ isAdmin: false, staffStoreIds: [] }, STORE_A), false);
  for (const unknown of [null, undefined, ""]) {
    assert.equal(canRedeemForStore({ isAdmin: false, staffStoreIds: [STORE_A] }, unknown), false, String(unknown));
  }
  // ids must match exactly: no prefix, case or whitespace tricks
  const staff = { isAdmin: false, staffStoreIds: [STORE_A] };
  assert.equal(canRedeemForStore(staff, STORE_A.toUpperCase()), false);
  assert.equal(canRedeemForStore(staff, STORE_A + " "), false);
  assert.equal(canRedeemForStore(staff, STORE_A.slice(0, 8)), false);
});

test("redeem access: staff cannot redeem a coupon that was issued to themselves; admins can (test accounts)", () => {
  const { isOwnCoupon } = require("../.test-build/redeem-access.js");
  const me = "eeeeeeee-3333-4333-8333-ffffffffffff";
  const staff = { isAdmin: false, staffStoreIds: [STORE_A] };
  assert.equal(isOwnCoupon(staff, me, me), true);
  assert.equal(isOwnCoupon(staff, me, "99999999-9999-4999-8999-999999999999"), false);
  assert.equal(isOwnCoupon(staff, me, null), false);
  assert.equal(isOwnCoupon({ isAdmin: true, staffStoreIds: [] }, me, me), false);
});
