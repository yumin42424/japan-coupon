// SQL tests for db/apply/apply-content-translations.sql — runs against a throw-away local PostgreSQL (never touches production).
// Run (needs temporary packages, nothing is added to package.json):
//   npm i --no-save embedded-postgres pg
//   node db/tests/content-translations.sql-test.mjs
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { readFileSync, rmSync } from "fs";
import { fileURLToPath } from "url";
import { buildTranslationsApplyScript } from "../../scripts/build-apply-script.mjs";

const APPLY = fileURLToPath(new URL("../apply/apply-content-translations.sql", import.meta.url));
const PORT = 54331;
const DATA_DIR = "./pgdata-" + Date.now();
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

let passed = 0, failed = 0;
function check(name, cond, detail = "") {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}  ${detail}`); }
}
async function refused(client, sql) {
  await client.query("savepoint s");
  try {
    await client.query(sql);
    await client.query("release savepoint s");
    return false;
  } catch {
    await client.query("rollback to savepoint s");
    return true;
  }
}

const server = new EmbeddedPostgres({ databaseDir: DATA_DIR, user: "postgres", password: "pw", port: PORT, persistent: false });
await server.initialise();
await server.start();
await server.createDatabase("kcoupon");
const admin = new pg.Client({ host: "localhost", port: PORT, user: "postgres", password: "pw", database: "kcoupon" });
await admin.connect();

try {
  await admin.query("create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;");
  const script = readFileSync(APPLY, "utf8").replace(/\r\n/g, "\n");
  check("saved apply script matches what the builder generates", script === buildTranslationsApplyScript());

  const first = await admin.query(script);
  const table = Array.isArray(first) ? first[first.length - 1].rows : first.rows;
  check("result table has five rows", table.length === 5, String(table.length));
  check("every result row is ok", table.every((row) => row.ok === true), JSON.stringify(table));
  await admin.query(script);
  check("running the script twice is safe", true);

  await admin.query("begin");
  await admin.query("set local role service_role");
  await admin.query(`insert into public.content_translations (source_hash, locale, translated) values ('${HASH_A}', 'en', 'BBQ'), ('${HASH_A}', 'ko', '고기')`);
  const read = await admin.query(`select translated from public.content_translations where source_hash = '${HASH_A}' and locale = 'en'`);
  check("service role can write and read", read.rows[0]?.translated === "BBQ");
  await admin.query(`insert into public.content_translations (source_hash, locale, translated) values ('${HASH_A}', 'en', 'Grill') on conflict (source_hash, locale) do update set translated = excluded.translated`);
  const updated = await admin.query(`select count(*)::int as n, max(translated) as t from public.content_translations where source_hash = '${HASH_A}' and locale = 'en'`);
  check("saving the same text and language again replaces it", updated.rows[0].n === 1 && updated.rows[0].t === "Grill");
  check("a value that is not a SHA-256 hash is refused", await refused(admin, `insert into public.content_translations (source_hash, locale, translated) values ('note a hash', 'en', 'x')`));
  check("an empty hash is refused", await refused(admin, `insert into public.content_translations (source_hash, locale, translated) values ('', 'en', 'x')`));
  await admin.query(`delete from public.content_translations where source_hash = '${HASH_A}'`);
  const left = await admin.query("select count(*)::int as n from public.content_translations");
  check("deleting by hash removes every language", left.rows[0].n === 0);
  await admin.query("reset role");
  await admin.query(`insert into public.content_translations (source_hash, locale, translated) values ('${HASH_B}', 'en', 'kept')`);

  for (const role of ["anon", "authenticated"]) {
    await admin.query(`set local role ${role}`);
    check(`${role} cannot read`, await refused(admin, "select * from public.content_translations"));
    check(`${role} cannot insert`, await refused(admin, `insert into public.content_translations (source_hash, locale, translated) values ('${HASH_A}', 'en', 'x')`));
    check(`${role} cannot update`, await refused(admin, "update public.content_translations set translated = 'x'"));
    check(`${role} cannot delete`, await refused(admin, "delete from public.content_translations"));
    await admin.query("reset role");
  }
  await admin.query("rollback");
} finally {
  await admin.end();
  await server.stop();
  rmSync(DATA_DIR, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
