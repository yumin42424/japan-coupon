-- ============================================================================================
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

-- ② 함수 설치 (db/migrations/20261012_issue_coupon_atomic.sql 와 같은 내용)
-- 선착순 쿠폰 발급을 원자적으로 처리하는 DB 함수 (additive, non-destructive)
-- 2026-10-12 (2026-10-21 보강: search_path에 pg_temp 명시, 사용자 존재/쿠폰 활성/만료 검사 추가)
--
-- HOW TO RUN: Supabase Dashboard > SQL Editor > open a NEW query tab, paste ONLY this file, Run.
-- (Do not append it to an older saved script: the editor runs the whole tab as one transaction.)
-- AFTER RUNNING: run db/verify/post-apply-check.sql in another new tab and confirm every row says ok = true.
--
-- Why: the app used to "count issued coupons, then insert". When many people press GET at the same instant
-- every request sees "still available" and the limit can be exceeded. This function locks the coupon row,
-- counts and inserts inside one transaction, so a coupon with quantity_limit = N is issued to exactly N people.
-- It does not change any table or existing data.
-- Until it is installed the app refuses to issue QUANTITY-LIMITED coupons (it tells the user to try again later and
-- reports the problem to Sentry); coupons without a limit keep working through the previous path.
--
-- Duplicate protection per (user, coupon, reissue cycle) is still guaranteed by the existing partial unique index
-- coupon_events_unique_issue; this function additionally reports it as 'already_issued'.
--
-- Security: SECURITY DEFINER so it can write coupon_events regardless of RLS; therefore EXECUTE is granted ONLY to
-- service_role (the server). anon / authenticated / PUBLIC cannot call it. Every table reference is schema-qualified and
-- search_path is pinned (public, pg_temp), so a caller cannot redirect it to look-alike objects.
-- The user id comes from the server's verified session; the function only trusts it after checking the user exists.
--
-- Result: jsonb {"status": ...} — ok | already_issued | sold_out | not_found | inactive | expired | user_not_found | invalid_request

create or replace function public.issue_coupon(
  p_user_id     uuid,
  p_coupon_id   uuid,
  p_reissue_key text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit    integer;
  v_active   boolean;
  v_valid_to date;
  v_count    integer;
  v_id       uuid;
begin
  if p_user_id is null or p_coupon_id is null or p_reissue_key is null or length(p_reissue_key) > 32 then
    return jsonb_build_object('status', 'invalid_request');
  end if;

  perform 1 from public.users where id = p_user_id;
  if not found then
    return jsonb_build_object('status', 'user_not_found');
  end if;

  -- Serialise everybody who is issuing this coupon at the same moment.
  select quantity_limit, is_active, valid_to into v_limit, v_active, v_valid_to
  from public.coupons where id = p_coupon_id for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- The app checks these too; repeating them here keeps the function safe if it is ever called from another place.
  -- "Today" is the Korean calendar day, the same rule the app uses for valid_to.
  if not coalesce(v_active, false) then
    return jsonb_build_object('status', 'inactive');
  end if;
  if v_valid_to is not null and v_valid_to < (now() at time zone 'Asia/Seoul')::date then
    return jsonb_build_object('status', 'expired');
  end if;

  if exists (
    select 1 from public.coupon_events
    where coupon_id = p_coupon_id and user_id = p_user_id and event_type = 'issue' and reissue_key = p_reissue_key
  ) then
    return jsonb_build_object('status', 'already_issued');
  end if;

  if v_limit is not null then
    select count(*) into v_count from public.coupon_events where coupon_id = p_coupon_id and event_type = 'issue';
    if v_count >= v_limit then
      return jsonb_build_object('status', 'sold_out');
    end if;
  end if;

  insert into public.coupon_events (coupon_id, user_id, event_type, reissue_key)
  values (p_coupon_id, p_user_id, 'issue', p_reissue_key)
  returning id into v_id;

  return jsonb_build_object('status', 'ok', 'id', v_id);
end;
$$;

revoke all on function public.issue_coupon(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.issue_coupon(uuid, uuid, text) to service_role;

-- ③ 결과 확인 — 모든 행의 ok 가 true 여야 합니다 (마지막 행은 존재하지 않는 사용자로 호출해 보는 안전한 시험: 아무것도 기록되지 않음)
select * from (
  select * from (
select * from (

  select 10 as ord, 'issue_coupon(uuid, uuid, text) exists' as check_name,
         to_regprocedure('public.issue_coupon(uuid, uuid, text)') is not null as ok, null::text as detail
  union all
  select 11, 'issue_coupon is SECURITY DEFINER',
         coalesce((select prosecdef from pg_proc where oid = to_regprocedure('public.issue_coupon(uuid, uuid, text)')), false), null
  union all
  select 12, 'issue_coupon search_path is pinned (public, pg_temp)',
         coalesce((select proconfig::text like '%search_path=public, pg_temp%' from pg_proc where oid = to_regprocedure('public.issue_coupon(uuid, uuid, text)')), false),
         (select proconfig::text from pg_proc where oid = to_regprocedure('public.issue_coupon(uuid, uuid, text)'))
  union all
  select 13, 'issue_coupon: service_role CAN execute',
         coalesce(has_function_privilege('service_role', to_regprocedure('public.issue_coupon(uuid, uuid, text)'), 'execute'), false), null
  union all
  select 14, 'issue_coupon: anon CANNOT execute',
         not coalesce(has_function_privilege('anon', to_regprocedure('public.issue_coupon(uuid, uuid, text)'), 'execute'), true), null
  union all
  select 15, 'issue_coupon: authenticated CANNOT execute',
         not coalesce(has_function_privilege('authenticated', to_regprocedure('public.issue_coupon(uuid, uuid, text)'), 'execute'), true), null
  union all
  select 16, 'issue_coupon: PUBLIC CANNOT execute',
         not coalesce(has_function_privilege('public', to_regprocedure('public.issue_coupon(uuid, uuid, text)'), 'execute'), true), null

  union all
  select 20, 'use_points(uuid, integer, text, text, uuid) exists',
         to_regprocedure('public.use_points(uuid, integer, text, text, uuid)') is not null, null
  union all
  select 21, 'use_points is SECURITY DEFINER',
         coalesce((select prosecdef from pg_proc where oid = to_regprocedure('public.use_points(uuid, integer, text, text, uuid)')), false), null
  union all
  select 22, 'use_points search_path is pinned (public, pg_temp)',
         coalesce((select proconfig::text like '%search_path=public, pg_temp%' from pg_proc where oid = to_regprocedure('public.use_points(uuid, integer, text, text, uuid)')), false),
         (select proconfig::text from pg_proc where oid = to_regprocedure('public.use_points(uuid, integer, text, text, uuid)'))
  union all
  select 23, 'use_points: service_role CAN execute',
         coalesce(has_function_privilege('service_role', to_regprocedure('public.use_points(uuid, integer, text, text, uuid)'), 'execute'), false), null
  union all
  select 24, 'use_points: anon CANNOT execute',
         not coalesce(has_function_privilege('anon', to_regprocedure('public.use_points(uuid, integer, text, text, uuid)'), 'execute'), true), null
  union all
  select 25, 'use_points: authenticated CANNOT execute',
         not coalesce(has_function_privilege('authenticated', to_regprocedure('public.use_points(uuid, integer, text, text, uuid)'), 'execute'), true), null
  union all
  select 26, 'use_points: PUBLIC CANNOT execute',
         not coalesce(has_function_privilege('public', to_regprocedure('public.use_points(uuid, integer, text, text, uuid)'), 'execute'), true), null
  union all
  select 27, 'point_events.request_id (uuid) exists',
         exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'point_events' and column_name = 'request_id' and data_type = 'uuid'), null
  union all
  select 28, 'point_events.purpose (text) exists',
         exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'point_events' and column_name = 'purpose' and data_type = 'text'), null
  union all
  select 29, 'point_events: request_id is unique (partial unique index)',
         exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'point_events'
                 and indexdef ilike '%unique%' and indexdef ilike '%request_id%' and indexdef ilike '%where%'),
         (select indexname from pg_indexes where schemaname = 'public' and tablename = 'point_events' and indexdef ilike '%request_id%' limit 1)

  union all
  select 30, 'coupon_events: unique index for ISSUE (one per user/coupon/cycle)',
         exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'coupon_events'
                 and indexdef ilike '%unique%' and indexdef ilike '%''issue''%'),
         (select indexname from pg_indexes where schemaname = 'public' and tablename = 'coupon_events' and indexdef ilike '%unique%' and indexdef ilike '%''issue''%' limit 1)
  union all
  select 31, 'coupon_events: unique index for USE (one per user/coupon/cycle)',
         exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'coupon_events'
                 and indexdef ilike '%unique%' and indexdef ilike '%''use''%'),
         (select indexname from pg_indexes where schemaname = 'public' and tablename = 'coupon_events' and indexdef ilike '%unique%' and indexdef ilike '%''use''%' limit 1)
  union all
  select 32, 'coupon_events.reissue_key column exists',
         exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'coupon_events' and column_name = 'reissue_key'), null
  union all
  select 33, 'RLS is enabled on users, coupons, stores, coupon_events, point_events',
         (select count(*) = 5 and bool_and(c.relrowsecurity)
            from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relname in ('users', 'coupons', 'stores', 'coupon_events', 'point_events')),
         (select string_agg(c.relname || '=' || c.relrowsecurity::text, ', ' order by c.relname)
            from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relname in ('users', 'coupons', 'stores', 'coupon_events', 'point_events'))

) t
order by ord
  ) p
  where p.ord < 20
  union all
  select 17, 'issue_coupon() can be called and refuses an unknown user (nothing is written)',
         (public.issue_coupon('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, '0')->>'status') = 'user_not_found',
         null::text
) result
order by ord;
