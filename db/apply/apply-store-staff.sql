-- ============================================================================================
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
select * from (

  select 10 as ord, 'coupons: quantity_limit integer, is_active boolean, valid_to date' as check_name,
         (select count(*) = 3 from information_schema.columns
           where table_schema = 'public' and table_name = 'coupons'
             and ((column_name = 'quantity_limit' and data_type = 'integer')
               or (column_name = 'is_active' and data_type = 'boolean')
               or (column_name = 'valid_to' and data_type = 'date'))) as ok,
         null::text as detail
  union all
  select 20, 'users: id uuid',
         exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'id' and data_type = 'uuid'), null
  union all
  select 30, 'coupon_events: coupon_id uuid, user_id uuid, event_type text, reissue_key text',
         (select count(*) = 4 from information_schema.columns
           where table_schema = 'public' and table_name = 'coupon_events'
             and ((column_name in ('coupon_id', 'user_id') and data_type = 'uuid')
               or (column_name in ('event_type', 'reissue_key') and data_type = 'text'))),
         (select string_agg(column_name || ':' || data_type, ', ' order by column_name) from information_schema.columns
           where table_schema = 'public' and table_name = 'coupon_events' and column_name in ('coupon_id', 'user_id', 'event_type', 'reissue_key'))
  union all
  select 40, 'coupon_events: UNIQUE index that allows one ISSUE per user/coupon/cycle',
         exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'coupon_events' and indexdef ilike '%unique%' and indexdef ilike '%''issue''%'),
         (select indexdef from pg_indexes where schemaname = 'public' and tablename = 'coupon_events' and indexdef ilike '%unique%' and indexdef ilike '%''issue''%' limit 1)
  union all
  select 50, 'coupon_events: UNIQUE index that allows one USE per user/coupon/cycle',
         exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'coupon_events' and indexdef ilike '%unique%' and indexdef ilike '%''use''%'),
         (select indexdef from pg_indexes where schemaname = 'public' and tablename = 'coupon_events' and indexdef ilike '%unique%' and indexdef ilike '%''use''%' limit 1)
  union all
  select 60, 'point_events: user_id uuid, points integer, reason text',
         (select count(*) = 3 from information_schema.columns
           where table_schema = 'public' and table_name = 'point_events'
             and ((column_name = 'user_id' and data_type = 'uuid')
               or (column_name = 'points' and data_type = 'integer')
               or (column_name = 'reason' and data_type = 'text'))), null
  union all
  select 70, 'RLS is enabled on users, coupons, stores, coupon_events, point_events',
         (select count(*) = 5 and bool_and(c.relrowsecurity)
            from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relname in ('users', 'coupons', 'stores', 'coupon_events', 'point_events')),
         (select string_agg(c.relname || '=' || c.relrowsecurity::text, ', ' order by c.relname)
            from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relname in ('users', 'coupons', 'stores', 'coupon_events', 'point_events'))
  union all
  select 80, 'no duplicate ISSUE rows exist for the same user/coupon/cycle',
         not exists (select 1 from public.coupon_events where event_type = 'issue' and user_id is not null
                     group by user_id, coupon_id, reissue_key having count(*) > 1), null
  union all
  select 90, 'no duplicate USE rows exist for the same user/coupon/cycle',
         not exists (select 1 from public.coupon_events where event_type = 'use' and user_id is not null
                     group by user_id, coupon_id, reissue_key having count(*) > 1), null

  union all
  select 910, 'INFO issue_coupon() is installed', true,
         case when to_regprocedure('public.issue_coupon(uuid, uuid, text)') is not null then 'yes — already installed (re-running the migration is safe)' else 'no — expected before applying' end
  union all
  select 920, 'INFO use_points() is installed', true,
         case when to_regprocedure('public.use_points(uuid, integer, text, text, uuid)') is not null then 'yes — already installed (re-running the migration is safe)' else 'no — expected before applying' end
  union all
  select 930, 'INFO point_events.request_id / purpose columns', true,
         (select coalesce(string_agg(column_name, ', '), 'neither exists yet — expected before applying') from information_schema.columns
           where table_schema = 'public' and table_name = 'point_events' and column_name in ('request_id', 'purpose'))
  union all
  select 940, 'INFO row counts (shows how small the tables are, so the index/column step is instant)', true,
         'coupon_events=' || (select count(*) from public.coupon_events) || ', point_events=' || (select count(*) from public.point_events) || ', users=' || (select count(*) from public.users)

) t
order by ord
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
-- 매장 직원 연결 테이블 (additive, non-destructive)
-- 2026-10-28
--
-- HOW TO RUN: Supabase Dashboard > SQL Editor > New query (새 탭) > db/apply/apply-store-staff.sql 전체를 붙여넣고 Run 한 번.
--             (그 파일이 전제 조건을 먼저 검사하고, 이 파일의 내용을 실행하고, 결과 표를 보여 줍니다.)
--
-- What: store_staff(user_id, store_id) — "이 회원은 이 매장의 직원"이라는 연결 한 줄씩. 새 테이블 하나만 만듭니다.
--   · 기존 테이블·데이터는 건드리지 않습니다.
--   · 회원이나 매장이 삭제되면 그 연결도 같이 사라집니다 (ON DELETE CASCADE). 연결을 만든 관리자 계정이 삭제돼도 연결은 남고
--     created_by 만 비워집니다.
--   · RLS 를 켜고 정책을 만들지 않으며, anon/authenticated 의 모든 권한을 회수합니다. 서버(service_role)만 읽고 씁니다.
--     (직원 여부는 서버가 로그인한 회원의 ID 로 이 테이블을 조회해서 판단합니다. 브라우저가 직접 읽거나 쓸 수 없습니다.)
--   · 여러 번 실행해도 안전합니다 (if not exists).
--
-- 앱 호환성: 이 테이블이 없는 동안(지금 운영 DB) 앱은 모든 회원을 "직원 아님"으로 취급하고 기존 방식(관리자 대리 처리)만 쓰게 됩니다.
--           적용 후에도 /admin/staff 에서 관리자가 직원을 연결하기 전까지는 아무에게도 새 권한이 생기지 않습니다.

create table if not exists public.store_staff (
  user_id    uuid not null references public.users(id)  on delete cascade,
  store_id   uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  primary key (user_id, store_id)
);

create index if not exists store_staff_store_id_idx on public.store_staff (store_id);

alter table public.store_staff enable row level security;

revoke all on table public.store_staff from public, anon, authenticated;
grant select, insert, update, delete on table public.store_staff to service_role;

comment on table public.store_staff is
  'Which member may redeem coupons of which store (server-side check only; no client access).';

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
