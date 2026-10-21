import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { decideIssuePath, MISSING_FUNCTION_CODE } = require("../.test-build/issue-policy.js");

const missing = { code: "PGRST202", message: "Could not find the function public.issue_coupon" };

test("issue policy: the 'function is missing' code is the one PostgREST really returns (checked against production)", () => {
  assert.equal(MISSING_FUNCTION_CODE, "PGRST202");
});

test("issue policy: a successful function call is done", () => {
  assert.equal(decideIssuePath(null, 5), "done");
  assert.equal(decideIssuePath(undefined, null), "done");
});

test("issue policy: function missing + quantity-limited coupon -> BLOCKED, never the racy fallback", () => {
  assert.equal(decideIssuePath(missing, 1), "blocked_missing_function");
  assert.equal(decideIssuePath(missing, 500), "blocked_missing_function");
  // a limit of 0 is still a limit (nobody may get it) — must not be treated as "no limit"
  assert.equal(decideIssuePath(missing, 0), "blocked_missing_function");
});

test("issue policy: function missing + no limit -> the previous path (duplicates are stopped by the unique index)", () => {
  assert.equal(decideIssuePath(missing, null), "legacy_path");
  assert.equal(decideIssuePath(missing, undefined), "legacy_path");
});

test("issue policy: any other database error never falls back to issuing", () => {
  for (const code of ["42501", "23503", "40001", "57014", "PGRST301", "", null, undefined]) {
    for (const limit of [null, 3]) {
      assert.equal(decideIssuePath({ code }, limit), "failed", `${code}/${limit}`);
    }
  }
});
