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
