import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isMissingColumnError } = require("../.test-build/audit.js");

test("missing-column detection: the two real 'column does not exist' errors for that column", () => {
  assert.equal(isMissingColumnError({ code: "PGRST204", message: "Could not find the 'redeemed_by' column of 'coupon_events' in the schema cache" }, "redeemed_by"), true);
  assert.equal(isMissingColumnError({ code: "42703", message: "column coupon_events.redeemed_by does not exist" }, "redeemed_by"), true);
});

test("missing-column detection: other columns, other errors and 'no error' are never treated as missing", () => {
  // a different column is missing: not ours
  assert.equal(isMissingColumnError({ code: "PGRST204", message: "Could not find the 'foo' column of 'coupon_events'" }, "redeemed_by"), false);
  // real failures must NOT trigger the silent retry
  for (const code of ["23505", "23503", "42501", "PGRST301", "08006", "", null, undefined]) {
    assert.equal(isMissingColumnError({ code, message: "redeemed_by" }, "redeemed_by"), false, String(code));
  }
  assert.equal(isMissingColumnError(null, "redeemed_by"), false);
  assert.equal(isMissingColumnError(undefined, "redeemed_by"), false);
  assert.equal(isMissingColumnError({ code: "PGRST204" }, "redeemed_by"), false);
});
