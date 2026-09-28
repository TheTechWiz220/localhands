-- 7. Lock privileged SECURITY DEFINER functions to authenticated users only
-- and make the search path explicit.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.phone);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

create or replace function public.sync_test_campaign_slots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.test_campaigns
    set slots_claimed = (
      select count(*)::integer
      from public.test_assignments
      where campaign_id = new.campaign_id
    )
    where id = new.campaign_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.test_campaigns
    set slots_claimed = (
      select count(*)::integer
      from public.test_assignments
      where campaign_id = old.campaign_id
    )
    where id = old.campaign_id;
    return old;
  end if;
  return null;
end;
$$;

revoke execute on function public.sync_test_campaign_slots() from public;
revoke execute on function public.sync_test_campaign_slots() from anon;
revoke execute on function public.sync_test_campaign_slots() from authenticated;
