-- Run in Supabase SQL Editor so workers/clients can update job status

drop policy if exists "Participants can update job requests" on public.job_requests;

create policy "Participants can update job requests"
on public.job_requests for update
to authenticated
using (
  auth.uid() = client_id or auth.uid() = worker_id
)
with check (
  auth.uid() = client_id or auth.uid() = worker_id
);
