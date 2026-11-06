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
