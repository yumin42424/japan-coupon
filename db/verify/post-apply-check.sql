-- 마이그레이션 적용 후 확인 쿼리 (읽기 전용 — 아무것도 바꾸지 않습니다)
-- 사용법: Supabase Dashboard > SQL Editor > 새 쿼리 탭에 이 파일 내용만 붙여넣고 Run.
-- 기대 결과: 아래 모든 행의 ok 가 true. false 인 행이 있으면 그 행의 check_name 이 아직 적용되지 않았거나 설정이 다른 것입니다.
-- 적용 전에 실행하면 함수/컬럼 관련 행이 false 로 나오는 것이 정상입니다 (현재 운영 DB의 "적용 전" 상태 확인용으로도 쓸 수 있음).

select * from (

  -- 1. issue_coupon (20261012_issue_coupon_atomic.sql)
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

  -- 2. use_points (20261012_point_use.sql)
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

  -- 3. 이미 있어야 하는 DB 방어선 (마이그레이션이 만드는 것이 아니라, 함수/앱이 기대하는 것)
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
order by ord;
