// 운영자가 Supabase SQL Editor에 "한 번만 붙여넣고 Run" 하면 끝나도록, 검증된 세 파일을 하나의 안전한 스크립트로 묶는다.
//   node scripts/build-apply-script.mjs      →  db/apply/apply-issue-coupon.sql 을 (다시) 만든다
// 내용 = ① 전제 조건 검사(하나라도 틀리면 예외로 전체 중단 — 아무것도 바뀌지 않음)
//        ② db/migrations/20261012_issue_coupon_atomic.sql 그대로
//        ③ 적용 결과 표(모든 행 ok = true 여야 함) + 안전한 호출 시험
// 원본 SQL을 복사해 두지 않고 매번 파일에서 읽어 조립하므로, 원본이 바뀌면 이 파일도 다시 만들어야 한다
// (DB 테스트가 "저장된 파일 = 새로 만든 결과"를 확인해서 어긋나면 실패한다).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");

// "select * from ( ... ) t order by ord;" 형태의 검사 파일에서 맨 끝 세미콜론과 앞쪽 주석을 떼어 하위 쿼리로 쓴다
const asSubquery = (sql) => sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").trim().replace(/;\s*$/, "");

export function buildApplyScript() {
  const pre = asSubquery(read("db/verify/pre-apply-check.sql"));
  const post = asSubquery(read("db/verify/post-apply-check.sql"));
  const migration = read("db/migrations/20261012_issue_coupon_atomic.sql").trimEnd();

  return `-- ============================================================================================
-- K-Coupon Japan — 쿠폰 발급 안전 함수 설치 (한 번에 실행)           [자동 생성 파일 — 직접 고치지 마세요]
-- 사용법: Supabase Dashboard > SQL Editor > New query(새 탭) > 이 파일 전체를 붙여넣고 Run 한 번.
--
-- 결과 1) 맨 아래에 표가 나오고 모든 행의 ok 가 true  → 설치 완료.
-- 결과 2) 빨간 오류 "STOP - prerequisites missing, nothing was changed: ..."  → 아무것도 바뀌지 않았습니다.
--         그 문구 전체를 개발자에게 보여 주세요. (운영 DB에 이 함수가 기대하는 전제가 없다는 뜻)
-- 이 스크립트는 한 번의 트랜잭션으로 실행되어, 중간에 실패하면 전부 취소됩니다. 여러 번 실행해도 안전합니다.
-- 만드는 방법: node scripts/build-apply-script.mjs  (db/verify/*.sql 과 db/migrations/20261012_issue_coupon_atomic.sql 을 읽어 조립)
-- ============================================================================================

-- ① 전제 조건 검사 — 하나라도 틀리면 여기서 예외가 나서 아래 ②는 실행되지 않습니다
do $guard$
declare
  bad text;
begin
  select string_agg(q.check_name || coalesce(' [' || q.detail || ']', ''), '; ' order by q.ord) into bad
  from (
${pre}
  ) q
  where q.ord < 900 and not q.ok;

  if bad is not null then
    raise exception 'STOP - prerequisites missing, nothing was changed: %', bad;
  end if;
end
$guard$;

-- ② 함수 설치 (db/migrations/20261012_issue_coupon_atomic.sql 와 같은 내용)
${migration}

-- ③ 결과 확인 — 모든 행의 ok 가 true 여야 합니다 (마지막 행은 존재하지 않는 사용자로 호출해 보는 안전한 시험: 아무것도 기록되지 않음)
select * from (
  select * from (
${post}
  ) p
  where p.ord < 20
  union all
  select 17, 'issue_coupon() can be called and refuses an unknown user (nothing is written)',
         (public.issue_coupon('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, '0')->>'status') = 'user_not_found',
         null::text
) result
order by ord;
`;
}

// 사용 처리자 기록(redeemed_by) 컬럼 추가용 한 번짜리 스크립트 — 같은 구조: 전제 검사(틀리면 전체 중단) → 마이그레이션 → 결과 표
export function buildAuditApplyScript() {
  const pre = asSubquery(read("db/verify/pre-apply-check.sql"));
  const migration = read("db/migrations/20261028_redeem_audit.sql").trimEnd();

  return `-- ============================================================================================
-- K-Coupon Japan — 쿠폰 사용 처리자 기록 컬럼 추가 (한 번에 실행)      [자동 생성 파일 — 직접 고치지 마세요]
-- 사용법: Supabase Dashboard > SQL Editor > New query(새 탭) > 이 파일 전체를 붙여넣고 Run 한 번.
--
-- 결과 1) 맨 아래에 표가 나오고 ok 가 true  → 설치 완료. 이후 사용 처리마다 처리한 관리자가 기록됩니다.
-- 결과 2) 빨간 오류 "STOP - prerequisites missing, nothing was changed: ..."  → 아무것도 바뀌지 않았습니다.
--         그 문구 전체를 개발자에게 보여 주세요.
-- 한 번의 트랜잭션이라 중간에 실패하면 전부 취소되고, 여러 번 실행해도 안전합니다. 기존 행은 바뀌지 않습니다.
-- 이 컬럼이 없어도 앱은 정상 동작합니다 (처리자만 기록되지 않음). 만드는 방법: node scripts/build-apply-script.mjs
-- ============================================================================================

-- ① 전제 조건 검사 — 하나라도 틀리면 여기서 예외가 나서 아래 ②는 실행되지 않습니다
do $guard$
declare
  bad text;
begin
  select string_agg(q.check_name || coalesce(' [' || q.detail || ']', ''), '; ' order by q.ord) into bad
  from (
${pre}
  ) q
  where q.ord < 900 and not q.ok;

  if bad is not null then
    raise exception 'STOP - prerequisites missing, nothing was changed: %', bad;
  end if;
end
$guard$;

-- ② 컬럼 추가 (db/migrations/20261028_redeem_audit.sql 와 같은 내용)
${migration}

-- ③ 결과 확인 — ok 가 true 여야 합니다
select 1 as ord,
       'coupon_events.redeemed_by exists (uuid), references users, and is set to NULL if that user is deleted' as check_name,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'coupon_events' and column_name = 'redeemed_by' and data_type = 'uuid')
       and exists (select 1 from pg_constraint c
                     join pg_class t on t.oid = c.conrelid
                     join pg_attribute a on a.attrelid = t.oid and a.attnum = any (c.conkey)
                    where c.contype = 'f' and t.relname = 'coupon_events' and a.attname = 'redeemed_by' and c.confdeltype = 'n') as ok,
       null::text as detail;
`;
}

// 매장 직원 연결 테이블(store_staff) 생성용 한 번짜리 스크립트 — 같은 구조: 전제 검사 → 마이그레이션 → 결과 표
export function buildStaffApplyScript() {
  const pre = asSubquery(read("db/verify/pre-apply-check.sql"));
  const migration = read("db/migrations/20261028_store_staff.sql").trimEnd();

  return `-- ============================================================================================
-- K-Coupon Japan — 매장 직원 연결 테이블 만들기 (한 번에 실행)         [자동 생성 파일 — 직접 고치지 마세요]
-- 사용법: Supabase Dashboard > SQL Editor > New query(새 탭) > 이 파일 전체를 붙여넣고 Run 한 번.
--
-- 결과 1) 맨 아래에 표가 나오고 모든 행의 ok 가 true  → 설치 완료.
-- 결과 2) 빨간 오류 "STOP - prerequisites missing, nothing was changed: ..."  → 아무것도 바뀌지 않았습니다.
--         그 문구 전체를 개발자에게 보여 주세요.
-- 한 번의 트랜잭션이라 중간에 실패하면 전부 취소되고, 여러 번 실행해도 안전합니다. 새 테이블 하나만 만들고 기존 데이터는 건드리지 않습니다.
-- 설치만으로는 아무에게도 새 권한이 생기지 않습니다 (관리자 화면 /admin/staff 에서 직원을 연결해야 함).
-- 만드는 방법: node scripts/build-apply-script.mjs
-- ============================================================================================

-- ① 전제 조건 검사 — 하나라도 틀리면 여기서 예외가 나서 아래 ②는 실행되지 않습니다
do $guard$
declare
  bad text;
begin
  select string_agg(q.check_name || coalesce(' [' || q.detail || ']', ''), '; ' order by q.ord) into bad
  from (
${pre}
  ) q
  where q.ord < 900 and not q.ok;

  -- 이 테이블이 참조하는 users(id), stores(id) 도 uuid 여야 합니다
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'stores' and column_name = 'id' and data_type = 'uuid') then
    bad := coalesce(bad || '; ', '') || 'stores.id is not uuid';
  end if;

  if bad is not null then
    raise exception 'STOP - prerequisites missing, nothing was changed: %', bad;
  end if;
end
$guard$;

-- ② 테이블 만들기 (db/migrations/20261028_store_staff.sql 와 같은 내용)
${migration}

-- ③ 결과 확인 — 모든 행의 ok 가 true 여야 합니다
select * from (
  select 1 as ord, 'table public.store_staff exists with primary key (user_id, store_id)' as check_name,
         exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid
                  where c.contype = 'p' and t.relname = 'store_staff' and t.relnamespace = 'public'::regnamespace and array_length(c.conkey, 1) = 2) as ok
  union all
  select 2, 'RLS is enabled on store_staff', coalesce((select relrowsecurity from pg_class where oid = 'public.store_staff'::regclass), false)
  union all
  select 3, 'anon CANNOT read or write store_staff',
         not (has_table_privilege('anon', 'public.store_staff', 'select') or has_table_privilege('anon', 'public.store_staff', 'insert')
              or has_table_privilege('anon', 'public.store_staff', 'update') or has_table_privilege('anon', 'public.store_staff', 'delete'))
  union all
  select 4, 'authenticated CANNOT read or write store_staff',
         not (has_table_privilege('authenticated', 'public.store_staff', 'select') or has_table_privilege('authenticated', 'public.store_staff', 'insert')
              or has_table_privilege('authenticated', 'public.store_staff', 'update') or has_table_privilege('authenticated', 'public.store_staff', 'delete'))
  union all
  select 5, 'service_role CAN read and write store_staff',
         has_table_privilege('service_role', 'public.store_staff', 'select') and has_table_privilege('service_role', 'public.store_staff', 'insert')
         and has_table_privilege('service_role', 'public.store_staff', 'delete')
) result
order by ord;
`;
}

// 직접 실행하면 파일을 만든다 (import 해서 쓸 때는 아무것도 쓰지 않는다)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(join(root, "db/apply"), { recursive: true });
  writeFileSync(join(root, "db/apply/apply-issue-coupon.sql"), buildApplyScript());
  writeFileSync(join(root, "db/apply/apply-redeem-audit.sql"), buildAuditApplyScript());
  writeFileSync(join(root, "db/apply/apply-store-staff.sql"), buildStaffApplyScript());
  console.log("wrote db/apply/apply-issue-coupon.sql, apply-redeem-audit.sql and apply-store-staff.sql");
}
