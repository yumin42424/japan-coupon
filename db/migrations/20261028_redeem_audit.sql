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
