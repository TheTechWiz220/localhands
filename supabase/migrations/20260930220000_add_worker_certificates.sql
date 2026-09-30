-- Optional worker certificates used during worker verification.
-- Certificates are public profile evidence, but only the owning worker may
-- create/update/delete their own certificate records.

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

revoke all on table public.worker_certificates from anon, authenticated, service_role;

grant select on table public.worker_certificates to anon, authenticated;
grant insert, update, delete on table public.worker_certificates to authenticated;
grant all on table public.worker_certificates to service_role;

drop policy if exists "workers manage own certificates" on public.worker_certificates;
create policy "workers manage own certificates"
  on public.worker_certificates
  for all
  to authenticated
  using ((select auth.uid()) = worker_id)
  with check ((select auth.uid()) = worker_id);

drop policy if exists "anyone can read certificates" on public.worker_certificates;
create policy "anyone can read certificates"
  on public.worker_certificates
  for select
  to anon, authenticated
  using (true);
