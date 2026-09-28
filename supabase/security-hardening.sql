-- LocalHands security hardening
-- Apply after reviewing on a staging/preview database.
-- This migration closes privilege-escalation and ownership-tampering paths
-- without changing the intended MVP flows.

begin;

-- ---------------------------------------------------------------------------
-- 1. Profiles: prevent self-promotion and self-verification.
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  caller_is_admin := exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );

  if caller_is_admin then
    return new;
  end if;

  if new.id <> old.id then
    raise exception 'Profile id cannot be changed';
  end if;

  if new.role is distinct from old.role then
    raise exception 'Role can only be changed by an admin';
  end if;

  if new.verification_status is distinct from old.verification_status
     and new.verification_status not in ('pending') then
    raise exception 'Verification status can only be changed by an admin';
  end if;

  if coalesce(new.is_verified, false) is distinct from coalesce(old.is_verified, false)
     and coalesce(new.is_verified, false) = true then
    raise exception 'Verification can only be granted by an admin';
  end if;

  if coalesce(new.id_verified, false) is distinct from coalesce(old.id_verified, false)
     and coalesce(new.id_verified, false) = true then
    raise exception 'ID verification can only be granted by an admin';
  end if;

  if new.verification_notes is distinct from old.verification_notes then
    raise exception 'Verification notes can only be changed by an admin';
  end if;

  if new.admin_notes is distinct from old.admin_notes then
    raise exception 'Admin notes can only be changed by an admin';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_security_fields on public.profiles;
create trigger trg_protect_profile_security_fields
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
for select to authenticated using (auth.uid() = id);
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles
for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. Jobs: participants may update workflow fields, but cannot transfer
-- ownership or arbitrarily rewrite financial terms.
-- ---------------------------------------------------------------------------

create or replace function public.protect_job_security_fields()
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

  if new.client_id is distinct from old.client_id then
    raise exception 'Job client cannot be changed';
  end if;

  -- A worker may claim an unassigned open/pending job for themselves.
  if old.worker_id is null then
    if new.worker_id is not null
       and not (
         new.worker_id = auth.uid()
         and old.status in ('open', 'pending')
         and new.status = 'accepted'
       ) then
      raise exception 'Invalid worker assignment';
    end if;
  elsif new.worker_id is distinct from old.worker_id then
    raise exception 'Job worker cannot be changed';
  end if;

  -- Budget changes are only valid when accepting the other party's counter.
  if new.budget is distinct from old.budget then
    if not (
      old.status = 'countered'
      and new.status = 'accepted'
      and old.counter_amount is not null
      and new.budget = old.counter_amount
      and old.countered_by is not null
      and old.countered_by <> auth.uid()
    ) then
      raise exception 'Job budget can only change when accepting a counter-offer';
    end if;
  end if;

  -- Counter attribution must belong to the caller.
  if new.countered_by is distinct from old.countered_by
     and new.countered_by is not null
     and new.countered_by <> auth.uid() then
    raise exception 'Counter offer must belong to the caller';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_job_security_fields on public.job_requests;
create trigger trg_protect_job_security_fields
before update on public.job_requests
for each row execute function public.protect_job_security_fields();

drop policy if exists "Participants can update job requests" on public.job_requests;
drop policy if exists "workers_claim_open_jobs" on public.job_requests;

create policy "Participants can update job requests"
on public.job_requests
for update to authenticated
using (
  auth.uid() = client_id or auth.uid() = worker_id
)
with check (
  auth.uid() = client_id or auth.uid() = worker_id
);

create policy "workers_claim_open_jobs"
on public.job_requests
for update to authenticated
using (
  worker_id is null
  and status in ('open', 'pending')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'worker'
      and p.verification_status = 'verified'
  )
)
with check (
  worker_id = auth.uid()
  and status = 'accepted'
);

-- ---------------------------------------------------------------------------
-- 3. Payments: only the client can mark a payment paid; only the assigned
-- worker can confirm it. Payment amount/job identity cannot be rewritten.
-- ---------------------------------------------------------------------------

create or replace function public.protect_payment_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
  job_client uuid;
  job_worker uuid;
begin
  caller_is_admin := exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );

  if caller_is_admin then
    return new;
  end if;

  if new.job_id is distinct from old.job_id then
    raise exception 'Payment job cannot be changed';
  end if;

  select j.client_id, j.worker_id
    into job_client, job_worker
  from public.job_requests j
  where j.id = old.job_id;

  if auth.uid() = job_client then
    if old.status not in ('pending', 'paid')
       or new.status not in ('paid') then
      raise exception 'Client can only mark a pending payment as paid';
    end if;

    if new.status = 'paid' and old.status = 'pending' then
      if new.amount is distinct from (select budget from public.job_requests where id = old.job_id) then
        raise exception 'Payment amount must match the job budget';
      end if;
      if new.method <> 'wave' or new.wave_reference is null or btrim(new.wave_reference) = '' then
        raise exception 'Paid Wave payments require a Wave reference';
      end if;
    end if;

    if new.confirmed_at is distinct from old.confirmed_at then
      raise exception 'Only the worker can confirm payment';
    end if;

    return new;
  end if;

  if auth.uid() = job_worker then
    if old.status <> 'paid' or new.status <> 'confirmed' then
      raise exception 'Worker can only confirm a paid payment';
    end if;

    if new.amount is distinct from old.amount
       or new.method is distinct from old.method
       or new.wave_reference is distinct from old.wave_reference
       or new.paid_at is distinct from old.paid_at then
      raise exception 'Worker cannot alter payment details';
    end if;

    return new;
  end if;

  raise exception 'Not authorized to update this payment';
end;
$$;

drop trigger if exists trg_protect_payment_security_fields on public.payments;
create trigger trg_protect_payment_security_fields
before update on public.payments
for each row execute function public.protect_payment_security_fields();

drop policy if exists "Participants can update payments" on public.payments;
create policy "Participants can update payments"
on public.payments
for update to authenticated
using (
  exists (
    select 1 from public.job_requests j
    where j.id = payments.job_id
      and (j.client_id = auth.uid() or j.worker_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.job_requests j
    where j.id = payments.job_id
      and (j.client_id = auth.uid() or j.worker_id = auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- 4. Testing assignments: prevent testers from transferring assignments or
-- inventing paid/accepted states. Admins remain unrestricted.
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

drop policy if exists "test_assignments_update_own_or_admin" on public.test_assignments;
create policy "test_assignments_update_own_or_admin"
on public.test_assignments
for update to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ---------------------------------------------------------------------------
-- 5. Testing findings/tasks: fix tautological campaign relationship checks.
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

-- ---------------------------------------------------------------------------
-- 6. Lock privileged SECURITY DEFINER functions to authenticated users only
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

commit;
