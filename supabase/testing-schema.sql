-- LocalHands Testing Phase 1
-- Run in Supabase SQL Editor

create table if not exists public.test_campaigns (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  brief text not null default '',
  checklist text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'open', 'closed')),
  max_slots integer not null default 10 check (max_slots > 0),
  deadline timestamptz,
  campaign_price numeric, -- admin-only (do not expose in tester UI queries)
  tester_reward numeric not null default 0, -- shown only to the claiming tester
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.test_assignments (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid not null references public.test_campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'claimed'
    check (status in ('claimed', 'submitted', 'accepted', 'rejected', 'paid')),
  claimed_at timestamptz default now(),
  submitted_at timestamptz,
  unique (campaign_id, user_id)
);

create table if not exists public.test_reports (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid not null references public.test_assignments(id) on delete cascade unique,
  what_tried text not null,
  expected text,
  actual text,
  severity text not null default 'annoying'
    check (severity in ('blocker', 'annoying', 'typo')),
  device text,
  screenshot_urls text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_test_assignments_campaign on public.test_assignments(campaign_id);
create index if not exists idx_test_assignments_user on public.test_assignments(user_id);
create index if not exists idx_test_campaigns_status on public.test_campaigns(status);

alter table public.test_campaigns enable row level security;
alter table public.test_assignments enable row level security;
alter table public.test_reports enable row level security;

-- Campaigns: authenticated can read open (and own drafts not needed for pilot)
drop policy if exists "test_campaigns_select_open" on public.test_campaigns;
create policy "test_campaigns_select_open" on public.test_campaigns
  for select to authenticated
  using (
    status = 'open'
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "test_campaigns_admin_all" on public.test_campaigns;
create policy "test_campaigns_admin_insert" on public.test_campaigns
  for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "test_campaigns_admin_update" on public.test_campaigns
  for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "test_campaigns_admin_delete" on public.test_campaigns
  for delete to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Assignments: own rows + admin
drop policy if exists "test_assignments_select_own" on public.test_assignments;
create policy "test_assignments_select_own" on public.test_assignments
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "test_assignments_insert_own" on public.test_assignments
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "test_assignments_update_own_or_admin" on public.test_assignments
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Reports: own via assignment + admin
drop policy if exists "test_reports_select" on public.test_reports;
create policy "test_reports_select" on public.test_reports
  for select to authenticated
  using (
    exists (
      select 1 from public.test_assignments a
      where a.id = assignment_id and a.user_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "test_reports_insert_own" on public.test_reports
  for insert to authenticated
  with check (
    exists (
      select 1 from public.test_assignments a
      where a.id = assignment_id and a.user_id = auth.uid()
    )
  );

create policy "test_reports_update_own" on public.test_reports
  for update to authenticated
  using (
    exists (
      select 1 from public.test_assignments a
      where a.id = assignment_id and a.user_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
