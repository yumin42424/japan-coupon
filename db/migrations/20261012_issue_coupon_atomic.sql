-- 선착순 쿠폰 발급을 원자적으로 처리하는 DB 함수 (additive, non-destructive)
-- 2026-10-12
--
-- HOW TO RUN: Supabase Dashboard > SQL Editor > open a NEW query tab, paste ONLY this file, Run.
-- (Do not append it to an older saved script: the editor runs the whole tab as one transaction.)
--
-- Why: the app used to "count issued coupons, then insert". When many people press GET at the same instant
-- every request sees "still available" and the limit can be exceeded. This function locks the coupon row,
-- counts and inserts inside one transaction, so a coupon with quantity_limit = N is issued to exactly N people.
-- It does not change any table or existing data. Until it is installed the app keeps its previous behaviour
-- (the app detects the missing function and falls back automatically).
--
-- Duplicate protection per (user, coupon, reissue cycle) is still guaranteed by the existing partial unique index
-- coupon_events_unique_issue; this function additionally reports it as 'already_issued'.

create or replace function public.issue_coupon(
  p_user_id     uuid,
  p_coupon_id   uuid,
  p_reissue_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
  v_id    uuid;
begin
  if p_user_id is null or p_coupon_id is null or p_reissue_key is null then
    return jsonb_build_object('status', 'invalid_request');
  end if;

  -- Serialise everybody who is issuing this coupon at the same moment.
  select quantity_limit into v_limit from public.coupons where id = p_coupon_id for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
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
