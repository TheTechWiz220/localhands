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

  -- Enforce the intended workflow transitions instead of trusting the client UI.
  if new.status is distinct from old.status then
    if new.status = 'countered' then
      if old.status not in ('pending', 'countered') then
        raise exception 'Job can only be countered while pending or countered';
      end if;
      if new.countered_by <> auth.uid() then
        raise exception 'Counter offer must belong to the caller';
      end if;
    elsif new.status = 'accepted' then
      if old.status = 'pending' then
        if auth.uid() <> old.worker_id then
          raise exception 'Only the assigned worker can accept a pending job';
        end if;
      elsif old.status = 'countered' then
        if auth.uid() = old.countered_by then
          raise exception 'The sender cannot accept their own counter offer';
        end if;
      else
        raise exception 'Invalid job acceptance transition';
      end if;
    elsif new.status = 'declined' then
      if old.status <> 'pending' or auth.uid() <> old.worker_id then
        raise exception 'Only the assigned worker can decline a pending job';
      end if;
    elsif new.status = 'cancelled' then
      if old.status not in ('pending', 'open', 'countered')
         or auth.uid() <> old.client_id then
        raise exception 'Only the client can cancel an active job';
      end if;
    elsif new.status = 'in_progress' then
      if old.status <> 'accepted'
         or (auth.uid() <> old.client_id and auth.uid() <> old.worker_id) then
        raise exception 'Only a job participant can start an accepted job';
      end if;
    elsif new.status = 'completed' then
      if old.status not in ('accepted', 'in_progress')
         or (auth.uid() <> old.client_id and auth.uid() <> old.worker_id) then
        raise exception 'Only a job participant can complete an active job';
      end if;
    else
      raise exception 'Invalid job status transition';
    end if;
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
    if old.status = 'paid' then
      if new.status is distinct from old.status
         or new.amount is distinct from old.amount
         or new.method is distinct from old.method
         or new.wave_reference is distinct from old.wave_reference
         or new.paid_at is distinct from old.paid_at
         or new.confirmed_at is distinct from old.confirmed_at then
        raise exception 'Paid payment details are immutable';
      end if;
      return new;
    end if;

    if old.status <> 'pending' or new.status <> 'paid' then
      raise exception 'Client can only mark a pending payment as paid';
    end if;

    if new.amount is distinct from (select budget from public.job_requests where id = old.job_id) then
      raise exception 'Payment amount must match the job budget';
    end if;
    if new.method <> 'wave' or new.wave_reference is null or btrim(new.wave_reference) = '' then
      raise exception 'Paid Wave payments require a Wave reference';
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


-- Ratings: only completed-job participants may create a rating, and only for
-- the other participant.
create or replace function public.protect_rating_security()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.from_user_id is distinct from auth.uid() then
    raise exception 'Rating author must be the authenticated user';
  end if;

  if new.from_user_id = new.to_user_id then
    raise exception 'Users cannot rate themselves';
  end if;

  if not exists (
    select 1
    from public.job_requests j
    where j.id = new.job_id
      and j.status = 'completed'
      and (
        (j.client_id = new.from_user_id and j.worker_id = new.to_user_id)
        or
        (j.worker_id = new.from_user_id and j.client_id = new.to_user_id)
      )
  ) then
    raise exception 'Rating must reference a completed job between the two users';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_rating_security on public.ratings;
create trigger trg_protect_rating_security
before insert on public.ratings
for each row execute function public.protect_rating_security();

drop policy if exists "Users can insert own ratings" on public.ratings;
create policy "Users can insert own ratings"
on public.ratings
for insert to authenticated
with check (
  from_user_id = auth.uid()
  and to_user_id <> auth.uid()
  and exists (
    select 1
    from public.job_requests j
    where j.id = ratings.job_id
      and j.status = 'completed'
      and (
        (j.client_id = auth.uid() and j.worker_id = ratings.to_user_id)
        or
        (j.worker_id = auth.uid() and j.client_id = ratings.to_user_id)
      )
  )
);


-- Job privacy: completed jobs remain visible only to their participants/admins.
drop policy if exists "Completed jobs are publicly readable" on public.job_requests;
drop policy if exists "Job requests viewable by participants" on public.job_requests;
create policy "Job requests viewable by participants"
on public.job_requests
for select to authenticated
using (
  client_id = auth.uid()
  or worker_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Trigger-only SECURITY DEFINER functions must not be directly callable.
revoke execute on function public.protect_job_security_fields() from public;
revoke execute on function public.protect_job_security_fields() from anon;
revoke execute on function public.protect_job_security_fields() from authenticated;
revoke execute on function public.protect_payment_security_fields() from public;
revoke execute on function public.protect_payment_security_fields() from anon;
revoke execute on function public.protect_payment_security_fields() from authenticated;
revoke execute on function public.protect_rating_security() from public;
revoke execute on function public.protect_rating_security() from anon;
revoke execute on function public.protect_rating_security() from authenticated;
