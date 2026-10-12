// SQL tests for db/migrations/20261012_point_use.sql — runs against a throw-away local PostgreSQL (never touches Supabase).
// It rebuilds the relevant tables from the real column definitions, applies the migration exactly as written,
// and checks balance rules, idempotency, privileges, rollback behaviour and REAL parallel connections.
//
// Run (needs temporary packages, nothing is added to package.json):
//   npm i --no-save embedded-postgres pg
//   node db/tests/point-use.sql-test.mjs
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { readFileSync, rmSync } from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const MIGRATION = fileURLToPath(new URL("../migrations/20261012_point_use.sql", import.meta.url));
const PORT = 54329;
const DATA_DIR = "./pgdata-" + Date.now();

let passed = 0, failed = 0;
const results = [];
function check(name, cond, detail = "") {
  if (cond) { passed++; results.push(`  PASS  ${name}`); }
  else { failed++; results.push(`  FAIL  ${name}  ${detail}`); }
}

const server = new EmbeddedPostgres({ databaseDir: DATA_DIR, user: "postgres", password: "pw", port: PORT, persistent: false });
await server.initialise();
await server.start();
await server.createDatabase("kcoupon");

const conn = (extra = {}) => new pg.Client({ host: "localhost", port: PORT, user: "postgres", password: "pw", database: "kcoupon", ...extra });
const admin = conn();
await admin.connect();

try {
  // --- replica of the REAL schema (types/nullability taken from the PostgREST schema document) ---
  await admin.query(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create table public.users (id uuid primary key default gen_random_uuid(), email text not null, nickname text not null);
    create table public.coupons (id uuid primary key default gen_random_uuid(), title text);
    create table public.point_events (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references public.users(id),
      points integer not null,
      reason text,
      coupon_id uuid references public.coupons(id),
      created_at timestamptz not null default now()
    );
    grant usage on schema public to anon, authenticated, service_role;
    grant all on all tables in schema public to service_role;
  `);

  const userA = (await admin.query(`insert into public.users(email,nickname) values('a@example.com','A') returning id`)).rows[0].id;
  const userB = (await admin.query(`insert into public.users(email,nickname) values('b@example.com','B') returning id`)).rows[0].id;
  // userA has 100 points from 10 earn rows (like real coupon redemptions); userB has 5
  for (let i = 0; i < 10; i++) await admin.query(`insert into public.point_events(user_id, points, reason) values($1, 10, 'クーポン利用')`, [userA]);
  await admin.query(`insert into public.point_events(user_id, points, reason) values($1, 5, 'クーポン利用')`, [userB]);

  // --- apply the real migration file exactly as the user would ---
  await admin.query(readFileSync(MIGRATION, "utf-8"));
  results.push("  (migration applied: columns + unique index + use_points + grants)");
  // idempotent re-run must not fail
  await admin.query(readFileSync(MIGRATION, "utf-8"));
  check("migration is re-runnable (idempotent)", true);

  const bal = async (u) => Number((await admin.query(`select coalesce(sum(points),0) b from public.point_events where user_id=$1`, [u])).rows[0].b);
  const rows = async (u) => Number((await admin.query(`select count(*) c from public.point_events where user_id=$1`, [u])).rows[0].c);
  const call = async (c, u, amount, purpose = "test_option", label = "テスト利用", req = randomUUID()) =>
    (await c.query(`select public.use_points($1::uuid,$2::integer,$3::text,$4::text,$5::uuid) as r`, [u, amount, purpose, label, req])).rows[0].r;

  // existing data untouched
  check("existing rows keep NULL request_id/purpose", Number((await admin.query(`select count(*) c from public.point_events where request_id is null and purpose is null`)).rows[0].c) === 11);

  // 1. normal use
  const req1 = randomUUID();
  let r = await call(admin, userA, 30, "test_option", "テスト利用", req1);
  check("1. normal use -> ok, used 30, balance 70", r.status === "ok" && r.used === 30 && r.balance === 70, JSON.stringify(r));
  check("1b. exactly one negative row written; balance == sum(rows)", (await bal(userA)) === 70 && (await rows(userA)) === 11);
  const row = (await admin.query(`select points, reason, purpose, request_id from public.point_events where request_id=$1`, [req1])).rows[0];
  check("1c. history row: -30, label, purpose, request_id recorded", row.points === -30 && row.reason === "テスト利用" && row.purpose === "test_option" && row.request_id === req1);

  // 2/4. insufficient
  r = await call(admin, userA, 71);
  check("2. amount above balance -> insufficient, nothing written", r.status === "insufficient" && r.balance === 70 && (await bal(userA)) === 70 && (await rows(userA)) === 11, JSON.stringify(r));
  r = await call(admin, userB, 6);
  check("2b. other user, balance 5 asks 6 -> insufficient", r.status === "insufficient" && (await bal(userB)) === 5);

  // 3. zero / negative / null / huge
  for (const [label, amt] of [["0", 0], ["-5", -5], ["null", null], ["10000001", 10000001]]) {
    r = await call(admin, userA, amt);
    check(`3. amount ${label} -> invalid_amount, nothing written`, r.status === "invalid_amount" && (await bal(userA)) === 70, JSON.stringify(r));
  }
  r = await call(admin, userA, 10, "", "x");
  check("3b. empty purpose -> invalid_request", r.status === "invalid_request");
  r = await admin.query(`select public.use_points($1::uuid,10,'p','l',null::uuid) r`, [userA]).then((x) => x.rows[0].r);
  check("3c. null request_id -> invalid_request", r.status === "invalid_request");

  // 5/6. same request replayed (double click / re-submit / retry after network error)
  r = await call(admin, userA, 30, "test_option", "テスト利用", req1);
  check("5. replay of the same request_id -> already_processed, no second charge", r.status === "already_processed" && r.used === 30 && r.balance === 70 && (await bal(userA)) === 70 && (await rows(userA)) === 11, JSON.stringify(r));

  // 6. someone else's request id
  r = await call(admin, userB, 5, "test_option", "x", req1);
  check("6. another user re-using a request_id -> request_conflict, B untouched", r.status === "request_conflict" && (await bal(userB)) === 5, JSON.stringify(r));

  // 11. unknown user
  r = await call(admin, randomUUID(), 10);
  check("11. unknown user -> user_not_found", r.status === "user_not_found");

  // 12. DB-level uniqueness of request_id (defence in depth)
  let dup = null;
  try { await admin.query(`insert into public.point_events(user_id, points, request_id) values($1,-1,$2)`, [userA, req1]); } catch (e) { dup = e.code; }
  check("12. direct duplicate request_id insert is rejected by the unique index (23505)", dup === "23505", String(dup));

  // 7. real concurrency: 20 simultaneous connections, each wants 10pt, balance 70 -> exactly 7 may succeed
  {
    const N = 20;
    const clients = await Promise.all(Array.from({ length: N }, async () => { const c = conn(); await c.connect(); return c; }));
    const out = await Promise.all(clients.map((c) => call(c, userA, 10)));
    await Promise.all(clients.map((c) => c.end()));
    const ok = out.filter((x) => x.status === "ok").length;
    const insuff = out.filter((x) => x.status === "insufficient").length;
    check("7. 20 parallel requests x10pt with balance 70 -> exactly 7 ok, 13 insufficient", ok === 7 && insuff === 13, `ok=${ok} insufficient=${insuff} other=${N - ok - insuff}`);
    check("7b. final balance is exactly 0 (never negative)", (await bal(userA)) === 0, String(await bal(userA)));
  }

  // 8. same request_id from 10 parallel connections (multiple tabs / double submit) -> charged once
  {
    // top up userB to 50 first
    for (let i = 0; i < 9; i++) await admin.query(`insert into public.point_events(user_id, points, reason) values($1, 5, '補充')`, [userB]); // 5 + 45 = 50
    const sameReq = randomUUID();
    const clients = await Promise.all(Array.from({ length: 10 }, async () => { const c = conn(); await c.connect(); return c; }));
    const out = await Promise.all(clients.map((c) => call(c, userB, 20, "test_option", "テスト利用", sameReq)));
    await Promise.all(clients.map((c) => c.end()));
    const ok = out.filter((x) => x.status === "ok").length;
    const already = out.filter((x) => x.status === "already_processed").length;
    const charged = Number((await admin.query(`select count(*) c from public.point_events where request_id=$1`, [sameReq])).rows[0].c);
    check("8. 10 parallel identical requests -> 1 ok + 9 already_processed, exactly one row", ok === 1 && already === 9 && charged === 1, `ok=${ok} already=${already} rows=${charged}`);
    check("8b. userB charged once: 50 - 20 = 30", (await bal(userB)) === 30, String(await bal(userB)));
  }

  // 9. failure while writing: trigger raises -> whole call rolls back, balance unchanged
  {
    await admin.query(`
      create function public.boom() returns trigger language plpgsql as $$ begin if new.purpose = 'boom' then raise exception 'simulated failure'; end if; return new; end $$;
      create trigger point_events_boom before insert on public.point_events for each row execute function public.boom();`);
    const before = await bal(userB), rowsBefore = await rows(userB);
    let err = null;
    try { await call(admin, userB, 10, "boom", "x"); } catch (e) { err = e.message; }
    check("9. DB error during the write -> error surfaces, no row, balance unchanged (all-or-nothing)", !!err && (await bal(userB)) === before && (await rows(userB)) === rowsBefore, String(err));
    // and the function still works afterwards (no stuck lock)
    r = await call(admin, userB, 10, "test_option", "after-failure");
    check("9b. next request after the failure succeeds (lock released)", r.status === "ok" && (await bal(userB)) === before - 10, JSON.stringify(r));
  }

  // 10. privileges: only service_role may execute
  for (const role of ["anon", "authenticated"]) {
    const c = conn(); await c.connect();
    let code = null;
    try { await c.query(`set role ${role}`); await c.query(`select public.use_points($1::uuid,1,'p','l',$2::uuid)`, [userA, randomUUID()]); } catch (e) { code = e.code; }
    await c.end();
    check(`10. role ${role} cannot call use_points (42501 permission denied)`, code === "42501", String(code));
  }
  {
    const c = conn(); await c.connect();
    await c.query(`set role service_role`);
    const x = await c.query(`select public.use_points($1::uuid,1,'p','l',$2::uuid) r`, [userB, randomUUID()]);
    await c.end();
    check("10b. role service_role can call use_points", x.rows[0].r.status === "ok");
  }

  // 13. invariant over everything we did
  const neg = Number((await admin.query(`select count(*) c from (select user_id, sum(points) s from public.point_events group by user_id having sum(points) < 0) t`)).rows[0].c);
  check("13. no user ever ends with a negative balance", neg === 0);
} finally {
  await admin.end().catch(() => {});
  await server.stop().catch(() => {});
  rmSync(DATA_DIR, { recursive: true, force: true });
}

console.log(results.join("\n"));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
