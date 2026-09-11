-- LocalHands Crowdtesting MVP
-- Apply this script to the LocalHands Supabase project.
-- The live database migration was applied separately; this file keeps the schema reproducible in Git.

create table if not exists public.testing_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text not null,
  status text not null default 'draft' check (status in ('draft','published','closed','archived')),
  tester_limit integer not null default 10 check (tester_limit > 0),
  reward_amount numeric(12,2) not null default 0 check (reward_amount >= 0),
  currency text not null default 'GMD',
  requirements text,
  instructions text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.testing_testers (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  experience_level text not null default 'beginner' check (experience_level in ('beginner','intermediate','experienced')),
  devices text,
  browsers text,
  bio text,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testing_applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.testing_campaigns(id) on delete cascade,
  tester_id uuid not null references public.testing_testers(profile_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  message text,
  applied_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  unique (campaign_id, tester_id)
);

create table if not exists public.testing_tasks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.testing_campaigns(id) on delete cascade,
  title text not null,
  description text not null,
  expected_behavior text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.testing_findings (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.testing_campaigns(id) on delete cascade,
  tester_id uuid not null references public.testing_testers(profile_id) on delete restrict,
  task_id uuid references public.testing_tasks(id) on delete set null,
  title text not null,
  finding_type text not null default 'bug' check (finding_type in ('bug','usability','ux','performance','compatibility','other')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  reproduction_steps text not null,
  expected_behavior text,
  actual_behavior text not null,
  device text,
  operating_system text,
  browser text,
  evidence_url text,
  status text not null default 'pending' check (status in ('pending','valid','invalid','duplicate','needs_info')),
  reviewer_notes text,
  reward_amount numeric(12,2) not null default 0 check (reward_amount >= 0),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testing_rewards (
  id uuid primary key default gen_random_uuid(),
  tester_id uuid not null references public.testing_testers(profile_id) on delete restrict,
  finding_id uuid not null unique references public.testing_findings(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'GMD',
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  payment_method text,
  payment_reference text,
  notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists testing_campaigns_status_idx on public.testing_campaigns(status);
create index if not exists testing_applications_campaign_idx on public.testing_applications(campaign_id);
create index if not exists testing_applications_tester_idx on public.testing_applications(tester_id);
create index if not exists testing_tasks_campaign_idx on public.testing_tasks(campaign_id, sort_order);
create index if not exists testing_findings_campaign_idx on public.testing_findings(campaign_id);
create index if not exists testing_findings_tester_idx on public.testing_findings(tester_id);
create index if not exists testing_findings_status_idx on public.testing_findings(status);
create index if not exists testing_rewards_tester_idx on public.testing_rewards(tester_id);

alter table public.testing_campaigns enable row level security;
alter table public.testing_testers enable row level security;
alter table public.testing_applications enable row level security;
alter table public.testing_tasks enable row level security;
alter table public.testing_findings enable row level security;
alter table public.testing_rewards enable row level security;

create policy "published campaigns are public" on public.testing_campaigns for select using (status = 'published' or created_by = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admins create campaigns" on public.testing_campaigns for insert with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admins update campaigns" on public.testing_campaigns for update using (created_by = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (created_by = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "testers manage own tester profile" on public.testing_testers for all using (profile_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (profile_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "users view own applications" on public.testing_applications for select using (tester_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "testers apply" on public.testing_applications for insert with check (tester_id = auth.uid() and exists (select 1 from public.testing_testers t where t.profile_id = auth.uid()));
create policy "admins review applications" on public.testing_applications for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "campaign tasks visible to participants" on public.testing_tasks for select using (exists (select 1 from public.testing_campaigns c where c.id = campaign_id and c.status = 'published') or exists (select 1 from public.testing_applications a where a.campaign_id = campaign_id and a.tester_id = auth.uid() and a.status = 'accepted') or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admins manage tasks" on public.testing_tasks for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "testers view own findings" on public.testing_findings for select using (tester_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "accepted testers submit findings" on public.testing_findings for insert with check (tester_id = auth.uid() and exists (select 1 from public.testing_applications a where a.campaign_id = campaign_id and a.tester_id = auth.uid() and a.status = 'accepted'));
create policy "admins review findings" on public.testing_findings for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "testers view own rewards" on public.testing_rewards for select using (tester_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admins manage rewards" on public.testing_rewards for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
