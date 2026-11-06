-- ============================================================================================
-- K-Coupon Japan — 내용 자동 번역 테이블 만들기 (한 번에 실행)         [자동 생성 파일 — 직접 고치지 마세요]
-- 사용법: Supabase Dashboard > SQL Editor > New query(새 탭) > 이 파일 전체를 붙여넣고 Run 한 번.
--
-- 결과: 맨 아래에 표가 나오고 모든 행의 ok 가 true  → 설치 완료.
-- 한 번의 트랜잭션이라 중간에 실패하면 전부 취소되고, 여러 번 실행해도 안전합니다. 새 테이블 하나만 만들고 기존 데이터는 건드리지 않습니다.
-- 만드는 방법: node scripts/build-apply-script.mjs
-- ============================================================================================

-- ① 테이블 만들기 (db/migrations/20261106_content_translations.sql 와 같은 내용)
-- 내용 자동 번역 저장 테이블 (additive, non-destructive)
-- 2026-11-06
--
-- HOW TO RUN: Supabase Dashboard > SQL Editor > New query (새 탭) > db/apply/apply-content-translations.sql 전체를 붙여넣고 Run
--
-- What: content_translations(source_hash, locale, translated) — "이 문장의 이 언어 번역" 한 줄씩.
--   · 원문은 저장하지 않고 SHA-256 해시로만 찾습니다.
--   · 기존 테이블·데이터는 건드리지 않습니다.
--   · RLS 를 켜고 정책을 만들지 않으며, anon/authenticated 의 모든 권한을 회수합니다. (서버만 읽고 씁니다)
--   · 여러 번 실행해도 안전합니다 (if not exists).
--
-- 앱 호환성: 이 테이블이 없는 동안 앱은 내용을 일본어 그대로 보여 줍니다(오류 화면이 나오지 않습니다).

create table if not exists public.content_translations (
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  locale      text not null,
  translated  text not null,
  created_at  timestamptz not null default now(),
  primary key (source_hash, locale)
);

alter table public.content_translations enable row level security;

revoke all on table public.content_translations from public, anon, authenticated;
grant select, insert, update, delete on table public.content_translations to service_role;

comment on table public.content_translations is
  'Machine translations of stored content, keyed by SHA-256 of the source text (server-side access only).';

-- ② 결과 확인 — 모든 행의 ok 가 true 여야 합니다
select * from (
  select 1 as ord, 'table public.content_translations exists with primary key (source_hash, locale)' as check_name,
         exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid
                  where c.contype = 'p' and t.relname = 'content_translations' and t.relnamespace = 'public'::regnamespace and array_length(c.conkey, 1) = 2) as ok
  union all
  select 2, 'RLS is enabled on content_translations', coalesce((select relrowsecurity from pg_class where oid = 'public.content_translations'::regclass), false)
  union all
  select 3, 'anon CANNOT read or write content_translations',
         not (has_table_privilege('anon', 'public.content_translations', 'select') or has_table_privilege('anon', 'public.content_translations', 'insert')
              or has_table_privilege('anon', 'public.content_translations', 'update') or has_table_privilege('anon', 'public.content_translations', 'delete'))
  union all
  select 4, 'authenticated CANNOT read or write content_translations',
         not (has_table_privilege('authenticated', 'public.content_translations', 'select') or has_table_privilege('authenticated', 'public.content_translations', 'insert')
              or has_table_privilege('authenticated', 'public.content_translations', 'update') or has_table_privilege('authenticated', 'public.content_translations', 'delete'))
  union all
  select 5, 'service_role CAN read and write content_translations',
         has_table_privilege('service_role', 'public.content_translations', 'select') and has_table_privilege('service_role', 'public.content_translations', 'insert')
         and has_table_privilege('service_role', 'public.content_translations', 'delete')
) result
order by ord;
