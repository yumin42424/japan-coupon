-- ============================================================================================
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

  if bad is not null then
    raise exception 'STOP - prerequisites missing, nothing was changed: %', bad;
  end if;
end
$guard$;

-- ② 컬럼 추가 (db/migrations/20261028_redeem_audit.sql 와 같은 내용)
-- 쿠폰 사용 처리자 기록 (additive, non-destructive)
-- 2026-10-28
--
-- HOW TO RUN: Supabase Dashboard > SQL Editor > New query (새 탭) > db/apply/apply-redeem-audit.sql 전체를 붙여넣고 Run 한 번.
--             (그 파일이 전제 조건을 먼저 검사하고, 이 파일의 내용을 실행하고, 결과 표를 보여 줍니다.)
--
-- What it does: coupon_events 에 redeemed_by 컬럼(처리한 관리자의 회원 ID, NULL 허용)을 하나 추가합니다.
--   · 기존 행은 건드리지 않습니다 (새 컬럼은 NULL).
--   · users 를 참조하되 ON DELETE SET NULL — 관리자 계정이 삭제되어도 사용 기록은 남고, 처리자만 비워집니다.
--   · 여러 번 실행해도 안전합니다 (add column if not exists).
--
-- Why: 지금은 "누가 이 쿠폰을 사용 처리했는지"가 남지 않습니다. 매장 분쟁이나 오처리가 생겼을 때 추적할 수 있어야 합니다.
-- 앱 호환성: 이 컬럼이 없는 동안에도 앱은 정상 동작합니다 (컬럼 없음 오류일 때만 컬럼 없이 기록하고, Sentry 에 경고를 한 번 남깁니다).
--           적용 후에는 사용 처리마다 처리한 관리자가 자동으로 기록됩니다. 개인정보는 회원 ID(내부 식별자)만 저장합니다.

alter table public.coupon_events
  add column if not exists redeemed_by uuid references public.users(id) on delete set null;

comment on column public.coupon_events.redeemed_by is
  'users.id of the admin who processed this redemption (event_type = use). NULL for older rows or when the admin account was deleted.';

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
