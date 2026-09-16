-- LocalHands Testing Phase B: campaign payment ledger (Wave-ready)
-- Run in Supabase SQL Editor

create table if not exists public.test_payments (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid not null references public.test_assignments(id) on delete cascade unique,
  amount numeric not null check (amount >= 0),
  method text not null default 'wave'
    check (method in ('wave', 'cash', 'other')),
  wave_ref text,
  notes text,
  paid_at timestamptz not null default now(),
  paid_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create index if not exists idx_test_payments_paid_at on public.test_payments(paid_at desc);

alter table public.test_payments enable row level security;

drop policy if exists "test_payments_admin_all" on public.test_payments;
create policy "test_payments_admin_select" on public.test_payments
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or exists (
      select 1 from public.test_assignments a
      where a.id = assignment_id and a.user_id = auth.uid()
    )
  );

create policy "test_payments_admin_insert" on public.test_payments
  for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "test_payments_admin_update" on public.test_payments
  for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
