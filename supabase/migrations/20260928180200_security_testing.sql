-- 4. Testing assignments: prevent testers from transferring assignments or
-- inventing paid/accepted states. Admins remain unrestricted.

-- Legacy testing row ownership hardening.
create or replace function public.protect_legacy_testing_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $
begin
  if exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    return new;
  end if;

  if TG_TABLE_NAME = 'test_assignments' then
    if new.user_id is distinct from old.user_id
       or new.campaign_id is distinct from old.campaign_id then
      raise exception 'Assignment ownership cannot be changed';
    end if;
    if old.status <> 'claimed' or new.status <> 'submitted' then
      raise exception 'Invalid tester assignment transition';
    end if;
  elsif TG_TABLE_NAME = 'test_reports' then
    if new.assignment_id is distinct from old.assignment_id then
      raise exception 'Report assignment cannot be changed';
    end if;
  end if;

  return new;
end;
$;

drop trigger if exists trg_protect_legacy_test_assignment on public.test_assignments;
create trigger trg_protect_legacy_test_assignment
before update on public.test_assignments
for each row execute function public.protect_legacy_testing_ownership();

drop trigger if exists trg_protect_legacy_test_report on public.test_reports;
create trigger trg_protect_legacy_test_report
before update on public.test_reports
for each row execute function public.protect_legacy_testing_ownership();

drop policy if exists "test_assignments_update_own_or_admin" on public.test_assignments;
create policy "test_assignments_update_own_or_admin"
on public.test_assignments
for update to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "test_reports_update_own" on public.test_reports;
create policy "test_reports_update_own"
on public.test_reports
for update to authenticated
using (
  exists (
    select 1 from public.test_assignments a
    where a.id = test_reports.assignment_id and a.user_id = auth.uid()
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (
    select 1 from public.test_assignments a
    where a.id = test_reports.assignment_id and a.user_id = auth.uid()
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Prevent worker-skill ownership reassignment through the legacy ALL policy.
drop policy if exists "Workers can manage own skills" on public.worker_skills;
create policy "Workers can manage own skills"
on public.worker_skills
for all to authenticated
using (auth.uid() = worker_id)
with check (auth.uid() = worker_id);

-- ---------------------------------------------------------------------------

create or replace function public.protect_test_assignment_security()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  caller_is_admin := exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );

  if caller_is_admin then
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.campaign_id is distinct from old.campaign_id then
    raise exception 'Test assignment ownership cannot be changed';
  end if;

  if new.status not in ('claimed', 'submitted') then
    raise exception 'Tester cannot set this assignment status';
  end if;

  if old.status <> 'claimed' or new.status <> 'submitted' then
    raise exception 'Tester can only submit a claimed assignment';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_test_assignment_security on public.test_assignments;
create trigger trg_protect_test_assignment_security
before update on public.test_assignments
for each row execute function public.protect_test_assignment_security();


-- ---------------------------------------------------------------------------
-- 5. Testing assignments/reports: enforce campaign ownership, claim state,
-- slot limits, and report ownership at the database boundary.
-- ---------------------------------------------------------------------------

create or replace function public.protect_testing_assignment_security()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
  campaign_open boolean;
  slots integer;
  max_slots integer;
begin
  caller_is_admin := exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );

  if caller_is_admin then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id
       or new.campaign_id is distinct from old.campaign_id then
      raise exception 'Test assignment ownership cannot be changed';
    end if;
    if old.status <> 'claimed' or new.status <> 'submitted' then
      raise exception 'Tester can only submit a claimed assignment';
    end if;
    return new;
  end if;

  if new.user_id <> auth.uid() then
    raise exception 'Assignment must belong to the caller';
  end if;

  if new.status <> 'claimed' then
    raise exception 'New tester assignments must start as claimed';
  end if;

  select c.status = 'open', c.max_slots
    into campaign_open, max_slots
  from public.test_campaigns c
  where c.id = new.campaign_id
  for update;

  if not coalesce(campaign_open, false) then
    raise exception 'Campaign is not open';
  end if;

  select count(*)::integer into slots
  from public.test_assignments a
  where a.campaign_id = new.campaign_id;

  if slots >= max_slots then
    raise exception 'Campaign is full';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_testing_assignment_security on public.test_assignments;
create trigger trg_protect_testing_assignment_security
before insert or update on public.test_assignments
for each row execute function public.protect_testing_assignment_security();

drop policy if exists "test_assignments_insert_own" on public.test_assignments;
create policy "test_assignments_insert_own"
on public.test_assignments
for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'claimed'
);

create or replace function public.protect_test_report_security()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  caller_is_admin := exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );

  if caller_is_admin then
    return new;
  end if;

  if new.assignment_id is distinct from old.assignment_id then
    raise exception 'Report assignment cannot be changed';
  end if;

  if not exists (
    select 1 from public.test_assignments a
    where a.id = new.assignment_id
      and a.user_id = auth.uid()
  ) then
    raise exception 'Report must belong to your assignment';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_test_report_security on public.test_reports;
create trigger trg_protect_test_report_security
before update on public.test_reports
for each row execute function public.protect_test_report_security();


-- ---------------------------------------------------------------------------
-- 6. Newer testing subsystem: restrict tester-owned records and fix
-- tautological campaign/application correlation checks.
-- ---------------------------------------------------------------------------

drop policy if exists "accepted testers submit findings" on public.testing_findings;
create policy "accepted testers submit findings"
on public.testing_findings
for insert to authenticated
with check (
  tester_id = auth.uid()
  and exists (
    select 1
    from public.testing_applications a
    where a.campaign_id = testing_findings.campaign_id
      and a.tester_id = auth.uid()
      and a.status = 'accepted'
  )
  and exists (
    select 1
    from public.testing_campaigns c
    where c.id = testing_findings.campaign_id
      and c.status = 'published'
  )
  and (
    task_id is null
    or exists (
      select 1
      from public.testing_tasks t
      where t.id = testing_findings.task_id
        and t.campaign_id = testing_findings.campaign_id
        and t.active = true
    )
  )
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and coalesce(reward_amount, 0) = 0
);

drop policy if exists "campaign tasks visible to participants" on public.testing_tasks;
create policy "campaign tasks visible to participants"
on public.testing_tasks
for select to authenticated
using (
  exists (
    select 1
    from public.testing_campaigns c
    where c.id = testing_tasks.campaign_id
      and c.status = 'published'
  )
  or exists (
    select 1
    from public.testing_applications a
    where a.campaign_id = testing_tasks.campaign_id
      and a.tester_id = auth.uid()
      and a.status = 'accepted'
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "testers apply" on public.testing_applications;
create policy "testers apply"
on public.testing_applications
for insert to authenticated
with check (
  tester_id = auth.uid()
  and exists (
    select 1 from public.testing_testers t
    where t.profile_id = auth.uid()
      and t.status = 'active'
  )
  and exists (
    select 1 from public.testing_campaigns c
    where c.id = testing_applications.campaign_id
      and c.status = 'published'
  )
);

drop policy if exists "users view own applications" on public.testing_applications;
create policy "users view own applications"
on public.testing_applications
for select to authenticated
using (
  tester_id = auth.uid()
  or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "admins review applications" on public.testing_applications;
create policy "admins review applications"
on public.testing_applications
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create or replace function public.protect_testing_tester_security()
returns trigger
language plpgsql
security definer
set search_path = public
as $
declare
  caller_is_admin boolean;
begin
  caller_is_admin := exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );

  if caller_is_admin then
    return new;
  end if;

  if new.profile_id is distinct from old.profile_id then
    raise exception 'Tester profile owner cannot be changed';
  end if;

  if new.status is distinct from old.status then
    raise exception 'Tester status can only be changed by an admin';
  end if;

  return new;
end;
$;

drop trigger if exists trg_protect_testing_tester_security on public.testing_testers;
create trigger trg_protect_testing_tester_security
before update on public.testing_testers
for each row execute function public.protect_testing_tester_security();

drop policy if exists "testers manage own tester profile" on public.testing_testers;
create policy "testers manage own tester profile"
on public.testing_testers
for all to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  profile_id = auth.uid()
  or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "testers view own rewards" on public.testing_rewards;
create policy "testers view own rewards"
on public.testing_rewards
for select to authenticated
using (
  tester_id = auth.uid()
  or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "admins manage rewards" on public.testing_rewards;
create policy "admins manage rewards"
on public.testing_rewards
for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ---------------------------------------------------------------------------

-- Trigger-only SECURITY DEFINER functions must not be directly callable.
revoke execute on function public.protect_legacy_testing_ownership() from public;
revoke execute on function public.protect_legacy_testing_ownership() from anon;
revoke execute on function public.protect_legacy_testing_ownership() from authenticated;
revoke execute on function public.protect_test_assignment_security() from public;
revoke execute on function public.protect_test_assignment_security() from anon;
revoke execute on function public.protect_test_assignment_security() from authenticated;
revoke execute on function public.protect_testing_assignment_security() from public;
revoke execute on function public.protect_testing_assignment_security() from anon;
revoke execute on function public.protect_testing_assignment_security() from authenticated;
revoke execute on function public.protect_test_report_security() from public;
revoke execute on function public.protect_test_report_security() from anon;
revoke execute on function public.protect_test_report_security() from authenticated;
revoke execute on function public.protect_testing_tester_security() from public;
revoke execute on function public.protect_testing_tester_security() from anon;
revoke execute on function public.protect_testing_tester_security() from authenticated;
