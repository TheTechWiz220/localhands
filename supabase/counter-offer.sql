-- Run in Supabase SQL Editor once

-- Allow countered status
alter table public.job_requests drop constraint if exists job_requests_status_check;
alter table public.job_requests
  add constraint job_requests_status_check
  check (status in (
    'pending',
    'countered',
    'accepted',
    'declined',
    'in_progress',
    'completed',
    'cancelled'
  ));

-- Counter offer fields
alter table public.job_requests
  add column if not exists counter_amount numeric,
  add column if not exists counter_note text,
  add column if not exists countered_by uuid references public.profiles(id);
