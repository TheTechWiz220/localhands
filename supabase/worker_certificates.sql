-- Optional worker certificates (title + photo). Run in Supabase SQL editor.
-- Safe to re-run.

create table if not exists public.worker_certificates (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  issuer text,
  year text,
  media_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists worker_certificates_worker_id_idx
  on public.worker_certificates (worker_id);

alter table public.worker_certificates enable row level security;

-- Workers: manage own certificates
drop policy if exists "workers manage own certificates" on public.worker_certificates;
create policy "workers manage own certificates"
  on public.worker_certificates
  for all
  using (auth.uid() = worker_id)
  with check (auth.uid() = worker_id);

-- Public / clients: read certificates (directory + admin)
drop policy if exists "anyone can read certificates" on public.worker_certificates;
create policy "anyone can read certificates"
  on public.worker_certificates
  for select
  using (true);

-- Storage: reuse proof-media bucket paths like {userId}/cert-*.jpg
-- (existing proof-media policies already allow authenticated upload under own folder)
