-- 마이그레이션 적용 "전" 확인 쿼리 (읽기 전용 — 아무것도 바꾸지 않습니다)
-- 사용법: Supabase Dashboard > SQL Editor > 새 쿼리 탭에 이 파일 내용만 붙여넣고 Run.
--
-- 판정:
--   · 1~9번 행(ord 10~99)이 모두 ok = true  → 마이그레이션을 적용해도 됩니다.
--   · 하나라도 false → **적용하지 말고 멈추세요.** 그 행의 check_name 과 detail 을 개발자에게 알려 주세요.
--     (마이그레이션이 기대하는 컬럼 타입/유니크 인덱스/RLS 가 운영 DB에 없다는 뜻입니다.)
--   · ord 900번대 행은 현재 상태를 알려 주는 정보(INFO)이고 항상 ok = true 입니다.
--
-- 이 쿼리는 2026-10-21에 PostgREST(API)로 읽어 본 운영 DB의 컬럼 타입과 일치하도록 만들었습니다.
-- 유니크 인덱스·RLS·함수 권한은 API로는 볼 수 없어서, 이 쿼리로만 확인할 수 있습니다.

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

  -- INFO (항상 ok = true): 지금 어디까지 적용돼 있는지
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
order by ord;
