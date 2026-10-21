// SQL tests for db/migrations/20261012_issue_coupon_atomic.sql (+ the post-apply check in db/verify) —
// runs against a throw-away local PostgreSQL (never touches Supabase).
// Run (needs temporary packages, nothing is added to package.json):
//   npm i --no-save embedded-postgres pg
//   node db/tests/issue-coupon.sql-test.mjs
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { readFileSync, rmSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const MIGRATION = fileURLToPath(new URL("../migrations/20261012_issue_coupon_atomic.sql", import.meta.url));
const POINT_MIGRATION = fileURLToPath(new URL("../migrations/20261012_point_use.sql", import.meta.url));
const VERIFY = fileURLToPath(new URL("../verify/post-apply-check.sql", import.meta.url));
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
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
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
} finally {
  await admin.end().catch(() => {}); await server.stop().catch(() => {}); rmSync(DATA_DIR, { recursive: true, force: true });
}
check("10. throw-away database directory was removed (no test data left behind)", !existsSync(DATA_DIR));
console.log(results.join("\n")); console.log(`\n${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
