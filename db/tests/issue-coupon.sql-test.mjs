// SQL tests for db/migrations/20261012_issue_coupon_atomic.sql — runs against a throw-away local PostgreSQL (never touches Supabase).
// Run (needs temporary packages, nothing is added to package.json):
//   npm i --no-save embedded-postgres pg
//   node db/tests/issue-coupon.sql-test.mjs
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { readFileSync, rmSync } from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const MIGRATION = fileURLToPath(new URL("../migrations/20261012_issue_coupon_atomic.sql", import.meta.url));
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
    create table public.coupons (id uuid primary key default gen_random_uuid(), store_id uuid references public.stores(id), title text, quantity_limit integer);
    create table public.coupon_events (
      id uuid primary key default gen_random_uuid(),
      coupon_id uuid references public.coupons(id),
      user_id uuid references public.users(id),
      event_type text not null,
      created_at timestamptz default now(),
      reissue_key text not null default '0'
    );
    -- same partial unique indexes as production
    create unique index coupon_events_unique_issue on public.coupon_events (user_id, coupon_id, reissue_key) where event_type = 'issue';
    grant usage on schema public to anon, authenticated, service_role;
    grant all on all tables in schema public to service_role;
  `);
  await admin.query(readFileSync(MIGRATION, "utf-8"));
  await admin.query(readFileSync(MIGRATION, "utf-8"));
  check("migration is re-runnable (idempotent)", true);

  const store = (await admin.query(`insert into public.stores(name) values('s') returning id`)).rows[0].id;
  const mkCoupon = async (limit) => (await admin.query(`insert into public.coupons(store_id,title,quantity_limit) values($1,'c',$2) returning id`, [store, limit])).rows[0].id;
  const mkUsers = async (n) => { const ids = []; for (let i = 0; i < n; i++) ids.push((await admin.query(`insert into public.users(email,nickname) values($1,'u') returning id`, [`u${i}-${randomUUID()}@x.test`])).rows[0].id); return ids; };
  const call = async (c, u, coupon, key = "0") => (await c.query(`select public.issue_coupon($1::uuid,$2::uuid,$3::text) r`, [u, coupon, key])).rows[0].r;
  const issued = async (coupon) => Number((await admin.query(`select count(*) c from public.coupon_events where coupon_id=$1 and event_type='issue'`, [coupon])).rows[0].c);
  const parallel = async (n, fn) => { const cs = await Promise.all(Array.from({ length: n }, async () => { const c = conn(); await c.connect(); return c; })); const out = await Promise.all(cs.map((c, i) => fn(c, i))); await Promise.all(cs.map((c) => c.end())); return out; };

  // 1. limited coupon, burst of 20 different users, limit 3
  { const c = await mkCoupon(3); const users = await mkUsers(20);
    const out = await parallel(20, (cl, i) => call(cl, users[i], c));
    const ok = out.filter((x) => x.status === "ok").length, sold = out.filter((x) => x.status === "sold_out").length;
    check("1. 20 simultaneous GETs on a coupon limited to 3 -> exactly 3 issued, 17 sold_out", ok === 3 && sold === 17 && (await issued(c)) === 3, `ok=${ok} sold=${sold} rows=${await issued(c)}`); }

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

  // 6. misc
  check("6a. unknown coupon -> not_found", (await call(admin, (await mkUsers(1))[0], randomUUID())).status === "not_found");
  check("6b. null user -> invalid_request", (await admin.query(`select public.issue_coupon(null::uuid, $1::uuid, '0') r`, [await mkCoupon(null)])).rows[0].r.status === "invalid_request");

  // 7. privileges
  for (const role of ["anon", "authenticated"]) {
    const c = conn(); await c.connect(); let code = null;
    try { await c.query(`set role ${role}`); await c.query(`select public.issue_coupon($1::uuid,$2::uuid,'0')`, [randomUUID(), randomUUID()]); } catch (e) { code = e.code; }
    await c.end(); check(`7. role ${role} cannot call issue_coupon (42501)`, code === "42501", String(code));
  }
} finally {
  await admin.end().catch(() => {}); await server.stop().catch(() => {}); rmSync(DATA_DIR, { recursive: true, force: true });
}
console.log(results.join("\n")); console.log(`\n${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
