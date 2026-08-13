-- Run in Supabase SQL Editor for payment tracking

-- Participants can read payments for their jobs
drop policy if exists "Participants can view payments" on public.payments;
create policy "Participants can view payments"
on public.payments for select
to authenticated
using (
  exists (
    select 1 from public.job_requests j
    where j.id = job_id
      and (j.client_id = auth.uid() or j.worker_id = auth.uid())
  )
);

-- Client can create/update payment (mark paid with Wave ref)
drop policy if exists "Clients can insert payments" on public.payments;
create policy "Clients can insert payments"
on public.payments for insert
to authenticated
with check (
  exists (
    select 1 from public.job_requests j
    where j.id = job_id and j.client_id = auth.uid()
  )
);

drop policy if exists "Participants can update payments" on public.payments;
create policy "Participants can update payments"
on public.payments for update
to authenticated
using (
  exists (
    select 1 from public.job_requests j
    where j.id = job_id
      and (j.client_id = auth.uid() or j.worker_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.job_requests j
    where j.id = job_id
      and (j.client_id = auth.uid() or j.worker_id = auth.uid())
  )
);
