// SQL tests for db/migrations/20261012_issue_coupon_atomic.sql (+ the post-apply check in db/verify) —
// runs against a throw-away local PostgreSQL (never touches Supabase).
// Run (needs temporary packages, nothing is added to package.json):
//   npm i --no-save embedded-postgres pg
//   node db/tests/issue-coupon.sql-test.mjs
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { readFileSync, rmSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath, pathToFileURL } from "url";

const MIGRATION = fileURLToPath(new URL("../migrations/20261012_issue_coupon_atomic.sql", import.meta.url));
const POINT_MIGRATION = fileURLToPath(new URL("../migrations/20261012_point_use.sql", import.meta.url));
const VERIFY = fileURLToPath(new URL("../verify/post-apply-check.sql", import.meta.url));
const PRE_VERIFY = fileURLToPath(new URL("../verify/pre-apply-check.sql", import.meta.url));
const APPLY_FILE = fileURLToPath(new URL("../apply/apply-issue-coupon.sql", import.meta.url));
const APPLY_BUILDER = fileURLToPath(new URL("../../scripts/build-apply-script.mjs", import.meta.url));
const AUDIT_APPLY_FILE = fileURLToPath(new URL("../apply/apply-redeem-audit.sql", import.meta.url));
const STAFF_APPLY_FILE = fileURLToPath(new URL("../apply/apply-store-staff.sql", import.meta.url));
const PORT = 54330;
const DATA_DIR = "./pgdata-issue-" + Date.now();
let passed = 0, failed = 0;
const results = [];
const check = (name, cond, detail = "") => { if (cond) { passed++; results.push(`  PASS  ${name}`); } else { failed++; results.push(`  FAIL  ${name}  ${detail}`); } };

const server = new EmbeddedPostgres({ databaseDir: DATA_DIR, user: "postgres", password: "pw", port: PORT, persistent: false });
await server.initialise(); await server.start(); await server.createDatabase("kcoupon");
const conn = () => new pg.Client({ host: "localhost", port: PORT, user: "postgres", password: "pw", database: "kcoupon" });
const admin = conn(); await admin.connect();
try {
  await admin.query(`
    create role anon nologin; create role authenticated nologin;
    -- Supabase's service_role has BYPASSRLS (that is how the server reads/writes tables that have RLS on and no policies)
    create role service_role nologin bypassrls;
    create table public.users (id uuid primary key default gen_random_uuid(), email text not null, nickname text not null);
    create table public.stores (id uuid primary key default gen_random_uuid(), name text not null);
    create table public.coupons (
      id uuid primary key default gen_random_uuid(), store_id uuid references public.stores(id), title text,
      quantity_limit integer, is_active boolean not null default true, valid_to date not null default '2999-12-31'
    );
    create table public.coupon_events (
      id uuid primary key default gen_random_uuid(),
      coupon_id uuid references public.coupons(id),
      user_id uuid references public.users(id),
      event_type text not null,
      created_at timestamptz default now(),
      reissue_key text not null default '0'
    );
    create table public.point_events (
      id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id),
      points integer not null, reason text, coupon_id uuid, created_at timestamptz default now()
    );
    -- same partial unique indexes as production
    create unique index coupon_events_unique_issue on public.coupon_events (user_id, coupon_id, reissue_key) where event_type = 'issue';
    create unique index coupon_events_unique_use on public.coupon_events (user_id, coupon_id, reissue_key) where event_type = 'use';
    alter table public.users enable row level security; alter table public.coupons enable row level security;
    alter table public.stores enable row level security; alter table public.coupon_events enable row level security;
    alter table public.point_events enable row level security;
    grant usage on schema public to anon, authenticated, service_role;
    grant all on all tables in schema public to service_role;
  `);

  // 0. the post-apply check must NOT pass before the migrations are applied (otherwise it proves nothing)
  const verifyBefore = (await admin.query(readFileSync(VERIFY, "utf-8"))).rows;
  const falseBefore = verifyBefore.filter((r) => !r.ok).map((r) => r.check_name);
  check("0a. verify query before migrations: function/column checks are false", falseBefore.length >= 14 && falseBefore.some((n) => n.startsWith("issue_coupon")) && falseBefore.some((n) => n.startsWith("use_points")), `false=${falseBefore.length}`);
  check("0b. verify query before migrations: pre-existing safeguards (indexes, RLS) are already true", verifyBefore.filter((r) => r.ord >= 30).every((r) => r.ok), JSON.stringify(verifyBefore.filter((r) => r.ord >= 30 && !r.ok)));

  // 0d. the PRE-apply check passes on a database that has what the migrations expect (and reports the functions as not installed yet)
  const preOk = (await admin.query(readFileSync(PRE_VERIFY, "utf-8"))).rows;
  check("0d. pre-apply check: every real check is ok on a compatible database", preOk.filter((r) => r.ord < 900).length === 9 && preOk.filter((r) => r.ord < 900).every((r) => r.ok === true), JSON.stringify(preOk.filter((r) => !r.ok)));
  check("0e. pre-apply check: INFO rows say the functions are not installed yet", preOk.find((r) => r.ord === 910).detail.startsWith("no") && preOk.find((r) => r.ord === 920).detail.startsWith("no"));

  // 0f-j. ...and it STOPS (false) when a prerequisite is missing — each case on a throw-away copy of the broken condition
  { const failing = async (id, why, ord, breakSql, repairSql) => {
      await admin.query(breakSql);
      const rows = (await admin.query(readFileSync(PRE_VERIFY, "utf-8"))).rows;
      await admin.query(repairSql);
      const row = rows.find((r) => r.ord === ord);
      check(`${id}. pre-apply check turns false when ${why}`, row.ok === false && rows.filter((r) => r.ord < 900 && r.ord !== ord).every((r) => r.ok === true), JSON.stringify(rows.filter((r) => !r.ok)));
    };
    await failing("0f", "the unique ISSUE index is missing", 40, `drop index coupon_events_unique_issue`, `create unique index coupon_events_unique_issue on public.coupon_events (user_id, coupon_id, reissue_key) where event_type = 'issue'`);
    await failing("0g", "the unique USE index is missing", 50, `drop index coupon_events_unique_use`, `create unique index coupon_events_unique_use on public.coupon_events (user_id, coupon_id, reissue_key) where event_type = 'use'`);
    await failing("0h", "RLS is off on coupon_events", 70, `alter table public.coupon_events disable row level security`, `alter table public.coupon_events enable row level security`);
    await failing("0i", "reissue_key is not text", 30, `alter table public.coupon_events alter column reissue_key drop default; alter table public.coupon_events alter column reissue_key type integer using 0`,
      `alter table public.coupon_events alter column reissue_key type text using reissue_key::text; alter table public.coupon_events alter column reissue_key set default '0'`);
    await failing("0j", "valid_to is not a date", 10, `alter table public.coupons alter column valid_to drop default; alter table public.coupons alter column valid_to type text using valid_to::text`, `alter table public.coupons alter column valid_to type date using valid_to::date; alter table public.coupons alter column valid_to set default '2999-12-31'`);
  }

  // 0k-o. the one-paste operator script (db/apply/apply-issue-coupon.sql)
  const { buildApplyScript } = await import(pathToFileURL(APPLY_BUILDER).href);
  const APPLY = buildApplyScript();
  check("0k. the committed apply script is exactly what the builder produces now (no drift from the verified source files)", readFileSync(APPLY_FILE, "utf-8").replace(/\r\n/g, "\n") === APPLY);
  {
    // a prerequisite is missing -> the whole script stops with STOP and NOTHING is installed
    await admin.query(`drop index coupon_events_unique_issue`);
    let err = null; try { await admin.query(APPLY); } catch (e) { err = e.message; }
    const installed = (await admin.query(`select to_regprocedure('public.issue_coupon(uuid, uuid, text)') is not null as yes`)).rows[0].yes;
    check("0l. apply script on a database missing a prerequisite: stops with the STOP message", !!err && err.startsWith("STOP - prerequisites missing, nothing was changed"), String(err));
    check("0m. ...and the function was NOT installed (everything rolled back)", installed === false);
    await admin.query(`create unique index coupon_events_unique_issue on public.coupon_events (user_id, coupon_id, reissue_key) where event_type = 'issue'`);
  }
  {
    // compatible database -> installs and the final table is all ok (runs as one multi-statement query, like the SQL editor)
    const res = await admin.query(APPLY);
    const rows = (Array.isArray(res) ? res[res.length - 1] : res).rows;
    check("0n. apply script on a compatible database: final table has the issue_coupon checks + the call test, all ok", rows.length === 8 && rows.every((r) => r.ok === true), JSON.stringify(rows.filter((r) => !r.ok)));
    const again = await admin.query(APPLY);
    const rows2 = (Array.isArray(again) ? again[again.length - 1] : again).rows;
    check("0o. running the apply script a second time is safe and still all ok", rows2.length === 8 && rows2.every((r) => r.ok === true));
  }

  await admin.query(readFileSync(MIGRATION, "utf-8"));
  await admin.query(readFileSync(MIGRATION, "utf-8"));
  await admin.query(readFileSync(POINT_MIGRATION, "utf-8"));
  await admin.query(readFileSync(POINT_MIGRATION, "utf-8"));
  check("migrations are re-runnable (idempotent)", true);

  const verifyAfter = (await admin.query(readFileSync(VERIFY, "utf-8"))).rows;
  check("0c. verify query after migrations: every row is ok", verifyAfter.length >= 20 && verifyAfter.every((r) => r.ok === true), JSON.stringify(verifyAfter.filter((r) => !r.ok)));

  const store = (await admin.query(`insert into public.stores(name) values('s') returning id`)).rows[0].id;
  const mkCoupon = async (limit, { active = true, validTo = null } = {}) =>
    (await admin.query(`insert into public.coupons(store_id,title,quantity_limit,is_active,valid_to) values($1,'c',$2,$3,coalesce($4::date,'2999-12-31')) returning id`, [store, limit, active, validTo])).rows[0].id;
  const mkUsers = async (n) => { const ids = []; for (let i = 0; i < n; i++) ids.push((await admin.query(`insert into public.users(email,nickname) values($1,'u') returning id`, [`u${i}-${randomUUID()}@x.test`])).rows[0].id); return ids; };
  const call = async (c, u, coupon, key = "0") => (await c.query(`select public.issue_coupon($1::uuid,$2::uuid,$3::text) r`, [u, coupon, key])).rows[0].r;
  const issued = async (coupon) => Number((await admin.query(`select count(*) c from public.coupon_events where coupon_id=$1 and event_type='issue'`, [coupon])).rows[0].c);
  const parallel = async (n, fn) => { const cs = await Promise.all(Array.from({ length: n }, async () => { const c = conn(); await c.connect(); return c; })); const out = await Promise.all(cs.map((c, i) => fn(c, i))); await Promise.all(cs.map((c) => c.end())); return out; };

  // 1. limited coupon, burst of 20 different users, limit 3
  { const c = await mkCoupon(3); const users = await mkUsers(20);
    const out = await parallel(20, (cl, i) => call(cl, users[i], c));
    const ok = out.filter((x) => x.status === "ok").length, sold = out.filter((x) => x.status === "sold_out").length;
    check("1. 20 simultaneous GETs on a coupon limited to 3 -> exactly 3 issued, 17 sold_out", ok === 3 && sold === 17 && (await issued(c)) === 3, `ok=${ok} sold=${sold} rows=${await issued(c)}`); }

  // 1b. limit 10, 40 simultaneous users: the final DB state must be exactly 10 rows, never more
  { const c = await mkCoupon(10); const users = await mkUsers(40);
    const out = await parallel(40, (cl, i) => call(cl, users[i], c));
    const ok = out.filter((x) => x.status === "ok").length, sold = out.filter((x) => x.status === "sold_out").length;
    check("1b. 40 simultaneous GETs on a coupon limited to 10 -> exactly 10 rows in the table", ok === 10 && sold === 30 && (await issued(c)) === 10, `ok=${ok} sold=${sold} rows=${await issued(c)}`); }

  // 2. same user pressing GET 10 times at once
  { const c = await mkCoupon(null); const [u] = await mkUsers(1);
    const out = await parallel(10, (cl) => call(cl, u, c));
    const ok = out.filter((x) => x.status === "ok").length, dup = out.filter((x) => x.status === "already_issued").length;
    check("2. same user, 10 simultaneous requests -> 1 ok + 9 already_issued, one row", ok === 1 && dup === 9 && (await issued(c)) === 1, `ok=${ok} dup=${dup}`); }

  // 3. unlimited coupon, burst of 20 users -> everyone gets one
  { const c = await mkCoupon(null); const users = await mkUsers(20);
    const out = await parallel(20, (cl, i) => call(cl, users[i], c));
    check("3. unlimited coupon, 20 simultaneous users -> all 20 issued", out.every((x) => x.status === "ok") && (await issued(c)) === 20); }

  // 4. already-issued users are told so even when the coupon is now sold out
  { const c = await mkCoupon(1); const [a, b] = await mkUsers(2);
    check("4a. first user gets it", (await call(admin, a, c)).status === "ok");
    check("4b. second user: sold_out", (await call(admin, b, c)).status === "sold_out");
    check("4c. first user asking again: already_issued (not sold_out)", (await call(admin, a, c)).status === "already_issued"); }

  // 5. reusable coupon: a new cycle key is a new issue
  { const c = await mkCoupon(null); const [u] = await mkUsers(1);
    check("5a. cycle 7 ok", (await call(admin, u, c, "7")).status === "ok");
    check("5b. cycle 7 again -> already_issued", (await call(admin, u, c, "7")).status === "already_issued");
    check("5c. cycle 8 ok", (await call(admin, u, c, "8")).status === "ok"); }

  // 6. misc / invalid input
  check("6a. unknown coupon -> not_found", (await call(admin, (await mkUsers(1))[0], randomUUID())).status === "not_found");
  check("6b. null user -> invalid_request", (await admin.query(`select public.issue_coupon(null::uuid, $1::uuid, '0') r`, [await mkCoupon(null)])).rows[0].r.status === "invalid_request");
  { const c = await mkCoupon(null);
    check("6c. unknown user -> user_not_found, nothing written", (await call(admin, randomUUID(), c)).status === "user_not_found" && (await issued(c)) === 0);
    const [u] = await mkUsers(1);
    check("6d. over-long reissue key -> invalid_request, nothing written", (await call(admin, u, c, "9".repeat(40))).status === "invalid_request" && (await issued(c)) === 0);
    check("6e. null coupon id -> invalid_request", (await admin.query(`select public.issue_coupon($1::uuid, null::uuid, '0') r`, [u])).rows[0].r.status === "invalid_request"); }

  // 6f-i. inactive / expired / boundary (the Korean calendar day is the rule)
  { const [u] = await mkUsers(1);
    const today = (await admin.query(`select (now() at time zone 'Asia/Seoul')::date::text d, ((now() at time zone 'Asia/Seoul')::date - 1)::text y`)).rows[0];
    const inactive = await mkCoupon(null, { active: false });
    check("6f. inactive coupon -> inactive, nothing written", (await call(admin, u, inactive)).status === "inactive" && (await issued(inactive)) === 0);
    const expired = await mkCoupon(null, { validTo: today.y });
    check("6g. coupon that ended yesterday (KST) -> expired, nothing written", (await call(admin, u, expired)).status === "expired" && (await issued(expired)) === 0);
    const lastDay = await mkCoupon(null, { validTo: today.d });
    check("6h. coupon whose last day is today (KST) -> ok", (await call(admin, u, lastDay)).status === "ok" && (await issued(lastDay)) === 1);
    const soldOutInactive = await mkCoupon(1, { active: false }); const [v] = await mkUsers(1);
    check("6i. inactive wins over sold_out (no issue rows)", (await call(admin, v, soldOutInactive)).status === "inactive"); }

  // 7. privileges
  for (const role of ["anon", "authenticated"]) {
    const c = conn(); await c.connect(); let code = null;
    try { await c.query(`set role ${role}`); await c.query(`select public.issue_coupon($1::uuid,$2::uuid,'0')`, [randomUUID(), randomUUID()]); } catch (e) { code = e.code; }
    await c.end(); check(`7. role ${role} cannot call issue_coupon (42501)`, code === "42501", String(code));
  }
  { const c = conn(); await c.connect(); let status = null;
    try { await c.query(`set role service_role`); status = (await c.query(`select public.issue_coupon($1::uuid,$2::uuid,'0') r`, [randomUUID(), randomUUID()])).rows[0].r.status; } catch (e) { status = e.code; }
    await c.end(); check("7c. role service_role can call issue_coupon", status === "user_not_found", String(status)); }

  // 8. a database error in the middle of the transaction rolls everything back and releases the lock
  { const c = await mkCoupon(5); const [u1, u2] = await mkUsers(2);
    await admin.query(`
      create function public.boom() returns trigger language plpgsql as $f$ begin raise exception 'simulated failure'; end $f$;
      create trigger boom_insert before insert on public.coupon_events for each row when (new.coupon_id = '${c}') execute function public.boom();`);
    let err = null; try { await call(admin, u1, c); } catch (e) { err = e.message; }
    check("8a. failure inside the insert surfaces as an error (not a fake ok)", err && err.includes("simulated failure"), String(err));
    check("8b. nothing was written", (await issued(c)) === 0);
    await admin.query(`drop trigger boom_insert on public.coupon_events; drop function public.boom();`);
    check("8c. next request succeeds right after the failure (lock released)", (await call(admin, u2, c)).status === "ok" && (await issued(c)) === 1);
    check("8d. the user whose request failed can retry", (await call(admin, u1, c)).status === "ok" && (await issued(c)) === 2); }

  // 9. search_path hijack attempt: a look-alike object in a schema the caller controls must not be used
  { await admin.query(`create schema evil; create table evil.coupon_events (like public.coupon_events including defaults);`);
    const c = await mkCoupon(null); const [u] = await mkUsers(1);
    const cl = conn(); await cl.connect(); await cl.query(`set search_path = evil, public`);
    const r = (await cl.query(`select public.issue_coupon($1::uuid,$2::uuid,'0') r`, [u, c])).rows[0].r; await cl.end();
    const evilRows = Number((await admin.query(`select count(*) c from evil.coupon_events`)).rows[0].c);
    check("9. caller's search_path cannot redirect the function to a look-alike table", r.status === "ok" && evilRows === 0 && (await issued(c)) === 1, `status=${r.status} evil=${evilRows}`); }

  // 10. redeem audit column (db/migrations/20261028_redeem_audit.sql) through its one-paste script
  {
    const { buildAuditApplyScript } = await import(pathToFileURL(APPLY_BUILDER).href);
    const AUDIT = buildAuditApplyScript();
    check("10a. the committed audit apply script is exactly what the builder produces now", readFileSync(AUDIT_APPLY_FILE, "utf-8").replace(/\r\n/g, "\n") === AUDIT);

    // before the migration: writing the column fails with PostgreSQL's 'undefined column' (the app retries without it)
    const [admin1, buyer] = await mkUsers(2); const c = await mkCoupon(null);
    let code = null; try { await admin.query(`insert into public.coupon_events(coupon_id,user_id,event_type,reissue_key,redeemed_by) values($1,$2,'use','0',$3)`, [c, buyer, admin1]); } catch (e) { code = e.code; }
    check("10b. before the migration the column is missing (42703) — the case the app falls back from", code === "42703", String(code));

    // a missing prerequisite stops the script and adds nothing
    await admin.query(`drop index coupon_events_unique_use`);
    let err = null; try { await admin.query(AUDIT); } catch (e) { err = e.message; }
    const hasCol = async () => (await admin.query(`select count(*)::int n from information_schema.columns where table_schema='public' and table_name='coupon_events' and column_name='redeemed_by'`)).rows[0].n === 1;
    check("10c. audit script with a missing prerequisite stops with STOP", !!err && err.startsWith("STOP - prerequisites missing, nothing was changed"), String(err));
    check("10d. ...and the column was NOT added (rolled back)", (await hasCol()) === false);
    await admin.query(`create unique index coupon_events_unique_use on public.coupon_events (user_id, coupon_id, reissue_key) where event_type = 'use'`);

    // compatible database: installs; running it again is safe
    const res = await admin.query(AUDIT);
    const rows = (Array.isArray(res) ? res[res.length - 1] : res).rows;
    check("10e. audit script on a compatible database: result table is all ok", rows.length === 1 && rows[0].ok === true, JSON.stringify(rows));
    const again = await admin.query(AUDIT);
    check("10f. running the audit script a second time is safe", (Array.isArray(again) ? again[again.length - 1] : again).rows.every((r) => r.ok === true));

    // the column records who processed it; duplicates are still blocked; deleting the admin keeps the record
    await admin.query(`insert into public.coupon_events(coupon_id,user_id,event_type,reissue_key,redeemed_by) values($1,$2,'use','0',$3)`, [c, buyer, admin1]);
    const stored = (await admin.query(`select redeemed_by from public.coupon_events where coupon_id=$1 and user_id=$2 and event_type='use'`, [c, buyer])).rows[0];
    check("10g. a redemption stores the processing admin", stored.redeemed_by === admin1);
    let dup = null; try { await admin.query(`insert into public.coupon_events(coupon_id,user_id,event_type,reissue_key,redeemed_by) values($1,$2,'use','0',$3)`, [c, buyer, admin1]); } catch (e) { dup = e.code; }
    check("10h. a second redemption of the same coupon is still rejected by the unique index (23505)", dup === "23505", String(dup));
    await admin.query(`delete from public.users where id=$1`, [admin1]);
    const kept = (await admin.query(`select redeemed_by from public.coupon_events where coupon_id=$1 and user_id=$2 and event_type='use'`, [c, buyer])).rows;
    check("10i. deleting the admin account keeps the redemption record and only clears the processor", kept.length === 1 && kept[0].redeemed_by === null);
    const rowsBefore = Number((await admin.query(`select count(*) c from public.coupon_events where redeemed_by is null`)).rows[0].c);
    check("10j. older rows keep a NULL processor (nothing was rewritten)", rowsBefore > 5);
  }
  // 11. store_staff (db/migrations/20261028_store_staff.sql) through its one-paste script
  {
    const { buildStaffApplyScript } = await import(pathToFileURL(APPLY_BUILDER).href);
    const STAFF = buildStaffApplyScript();
    check("11a. the committed staff apply script is exactly what the builder produces now", readFileSync(STAFF_APPLY_FILE, "utf-8").replace(/\r\n/g, "\n") === STAFF);
    const tableExists = async () => (await admin.query(`select to_regclass('public.store_staff') is not null as yes`)).rows[0].yes;

    // a missing prerequisite stops the script and creates nothing
    await admin.query(`drop index coupon_events_unique_use`);
    let err = null; try { await admin.query(STAFF); } catch (e) { err = e.message; }
    check("11b. staff script with a missing prerequisite stops with STOP", !!err && err.startsWith("STOP - prerequisites missing, nothing was changed"), String(err));
    check("11c. ...and the table was NOT created (rolled back)", (await tableExists()) === false);
    await admin.query(`create unique index coupon_events_unique_use on public.coupon_events (user_id, coupon_id, reissue_key) where event_type = 'use'`);

    // compatible database: installs; running it again is safe
    const res = await admin.query(STAFF);
    const rows = (Array.isArray(res) ? res[res.length - 1] : res).rows;
    check("11d. staff script on a compatible database: result table (5 rows) is all ok", rows.length === 5 && rows.every((r) => r.ok === true), JSON.stringify(rows.filter((r) => !r.ok)));
    const again = await admin.query(STAFF);
    check("11e. running the staff script a second time is safe", (Array.isArray(again) ? again[again.length - 1] : again).rows.every((r) => r.ok === true));

    // privileges: only the server role can touch it
    for (const role of ["anon", "authenticated"]) {
      const c = conn(); await c.connect(); const codes = {};
      for (const [op, sql] of [["select", `select * from public.store_staff`], ["insert", `insert into public.store_staff(user_id, store_id) values (gen_random_uuid(), gen_random_uuid())`], ["delete", `delete from public.store_staff`]]) {
        try { await c.query(`set role ${role}`); await c.query(sql); codes[op] = "allowed"; } catch (e) { codes[op] = e.code; } finally { await c.query(`reset role`).catch(() => {}); }
      }
      await c.end();
      check(`11f. role ${role} cannot select, insert or delete store_staff (42501)`, Object.values(codes).every((x) => x === "42501"), JSON.stringify(codes));
    }
    const [staffUser, other, creator] = await mkUsers(3);
    const [storeA, storeB] = [store, (await admin.query(`insert into public.stores(name) values('s2') returning id`)).rows[0].id];
    { const c = conn(); await c.connect(); let out = null;
      try {
        await c.query(`set role service_role`);
        await c.query(`insert into public.store_staff(user_id, store_id, created_by) values ($1,$2,$3)`, [staffUser, storeA, creator]);
        out = (await c.query(`select store_id from public.store_staff where user_id=$1`, [staffUser])).rows.map((r) => r.store_id);
      } catch (e) { out = e.code + " " + e.message; }
      await c.end();
      check("11g. role service_role can insert and read store_staff", Array.isArray(out) && out.length === 1 && out[0] === storeA, JSON.stringify(out)); }

    // the same member + store cannot be linked twice; the same member can have several stores
    let dup = null; try { await admin.query(`insert into public.store_staff(user_id, store_id) values ($1,$2)`, [staffUser, storeA]); } catch (e) { dup = e.code; }
    check("11h. linking the same member to the same store twice is rejected (23505)", dup === "23505", String(dup));
    await admin.query(`insert into public.store_staff(user_id, store_id) values ($1,$2)`, [staffUser, storeB]);
    check("11i. one member can be linked to several stores", Number((await admin.query(`select count(*) c from public.store_staff where user_id=$1`, [staffUser])).rows[0].c) === 2);

    // foreign keys: unknown member / store are rejected
    let fk1 = null; try { await admin.query(`insert into public.store_staff(user_id, store_id) values ($1,$2)`, [randomUUID(), storeA]); } catch (e) { fk1 = e.code; }
    let fk2 = null; try { await admin.query(`insert into public.store_staff(user_id, store_id) values ($1,$2)`, [other, randomUUID()]); } catch (e) { fk2 = e.code; }
    check("11j. an unknown member or an unknown store cannot be linked (23503)", fk1 === "23503" && fk2 === "23503", `${fk1}/${fk2}`);

    // deleting the creator keeps the link (created_by cleared); deleting the member or the store removes the link
    await admin.query(`delete from public.users where id=$1`, [creator]);
    const kept = (await admin.query(`select created_by from public.store_staff where user_id=$1 and store_id=$2`, [staffUser, storeA])).rows;
    check("11k. deleting the admin who created a link keeps the link and clears created_by", kept.length === 1 && kept[0].created_by === null);
    await admin.query(`insert into public.store_staff(user_id, store_id) values ($1,$2)`, [other, storeB]);
    await admin.query(`delete from public.users where id=$1`, [other]);
    check("11l. deleting a member removes their staff links", Number((await admin.query(`select count(*) c from public.store_staff where user_id=$1`, [other])).rows[0].c) === 0);
    const storeC = (await admin.query(`insert into public.stores(name) values('s3') returning id`)).rows[0].id;
    await admin.query(`insert into public.store_staff(user_id, store_id) values ($1,$2)`, [staffUser, storeC]);
    await admin.query(`delete from public.stores where id=$1`, [storeC]);
    check("11m. deleting a store removes its staff links", Number((await admin.query(`select count(*) c from public.store_staff where store_id=$1`, [storeC])).rows[0].c) === 0);
    check("11n. the other links of that member are untouched", Number((await admin.query(`select count(*) c from public.store_staff where user_id=$1`, [staffUser])).rows[0].c) === 2);
  }
} finally {
  await admin.end().catch(() => {}); await server.stop().catch(() => {}); rmSync(DATA_DIR, { recursive: true, force: true });
}
check("10. throw-away database directory was removed (no test data left behind)", !existsSync(DATA_DIR));
console.log(results.join("\n")); console.log(`\n${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
