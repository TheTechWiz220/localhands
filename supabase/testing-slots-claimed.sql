-- Fix: non-admins could only see their own assignments, so Slots always showed 0/N
-- Run in Supabase SQL Editor

alter table public.test_campaigns
  add column if not exists slots_claimed integer not null default 0;

-- Backfill from existing claims
update public.test_campaigns c
set slots_claimed = (
  select count(*)::integer
  from public.test_assignments a
  where a.campaign_id = c.id
);

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
      select count(*)::integer from public.test_assignments where campaign_id = new.campaign_id
    )
    where id = new.campaign_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.test_campaigns
    set slots_claimed = (
      select count(*)::integer from public.test_assignments where campaign_id = old.campaign_id
    )
    where id = old.campaign_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_test_campaign_slots on public.test_assignments;
create trigger trg_sync_test_campaign_slots
after insert or delete on public.test_assignments
for each row execute function public.sync_test_campaign_slots();
