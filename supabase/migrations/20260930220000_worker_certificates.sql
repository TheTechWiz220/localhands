-- Optional worker certificates for worker verification.
-- Certificates are public images stored in proof-media and referenced here.

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

drop policy if exists "Workers manage own certificates" on public.worker_certificates;
create policy "Workers manage own certificates"
  on public.worker_certificates
  for all
  to authenticated
  using ((select auth.uid()) = worker_id)
  with check ((select auth.uid()) = worker_id);

drop policy if exists "Anyone can read certificates" on public.worker_certificates;
create policy "Anyone can read certificates"
  on public.worker_certificates
  for select
  to public
  using (true);

grant select on public.worker_certificates to anon, authenticated;
grant insert, update, delete on public.worker_certificates to authenticated;
