-- ポイント利用 (points spend) — additive, non-destructive migration
-- 2026-10-12
--
-- HOW TO RUN: Supabase Dashboard > SQL Editor > open a NEW query tab, paste ONLY this file, Run.
-- (Do not append it to an older saved script: the editor runs the whole tab as one transaction.)
--
-- What it does
--   1. point_events gets two nullable columns: request_id (idempotency key) and purpose (what the points were used for).
--      Existing rows are untouched (both stay NULL), no data is deleted or rewritten.
--   2. A partial unique index makes the same request_id impossible to record twice.
--   3. use_points(): one atomic function that checks the balance and writes the spend row in a single transaction.
--      It locks the user's row first, so two simultaneous requests for the same user are processed one after another.
--      Only the service role (the server) may execute it; anon / authenticated users cannot.
--
-- The app keeps the feature OFF until POINT_USE_ENABLED is set in src/lib/point-policy.ts,
-- so applying this migration changes nothing for users by itself.

alter table public.point_events add column if not exists request_id uuid;
alter table public.point_events add column if not exists purpose text;

create unique index if not exists point_events_request_id_key
  on public.point_events (request_id)
  where request_id is not null;

create or replace function public.use_points(
  p_user_id    uuid,
  p_amount     integer,
  p_purpose    text,
  p_label      text,
  p_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance  integer;
  v_existing public.point_events%rowtype;
begin
  if p_user_id is null or p_request_id is null or p_purpose is null or length(trim(p_purpose)) = 0 then
    return jsonb_build_object('status', 'invalid_request');
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 10000000 then
    return jsonb_build_object('status', 'invalid_amount');
  end if;

  -- Serialise concurrent requests of the same user: the row lock is held until this transaction ends.
  perform 1 from public.users where id = p_user_id for update;
  if not found then
    return jsonb_build_object('status', 'user_not_found');
  end if;

  -- Idempotency: the same request_id returns the original result instead of charging again.
  select * into v_existing from public.point_events where request_id = p_request_id;
  if found then
    if v_existing.user_id is distinct from p_user_id then
      return jsonb_build_object('status', 'request_conflict');
    end if;
    select coalesce(sum(points), 0) into v_balance from public.point_events where user_id = p_user_id;
    return jsonb_build_object('status', 'already_processed', 'used', -v_existing.points, 'balance', v_balance);
  end if;

  select coalesce(sum(points), 0) into v_balance from public.point_events where user_id = p_user_id;
  if v_balance < p_amount then
    return jsonb_build_object('status', 'insufficient', 'balance', v_balance);
  end if;

  insert into public.point_events (user_id, points, reason, purpose, request_id)
  values (p_user_id, -p_amount, p_label, p_purpose, p_request_id);

  return jsonb_build_object('status', 'ok', 'used', p_amount, 'balance', v_balance - p_amount);
end;
$$;

revoke all on function public.use_points(uuid, integer, text, text, uuid) from public, anon, authenticated;
grant execute on function public.use_points(uuid, integer, text, text, uuid) to service_role;
