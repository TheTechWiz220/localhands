-- Public worker directory + job contact scope (security hardening)
-- Applied live 2026-10-12 on localhands project.

drop view if exists public.public_worker_profiles;
create view public.public_worker_profiles
with (security_invoker = false) as
select
  p.id,
  p.full_name,
  p.location_area,
  p.bio,
  p.verification_status,
  p.availability,
  p.avatar_url,
  p.created_at,
  p.id_verified,
  p.spoken_languages
from public.profiles p
where p.role = 'worker'
  and p.verification_status in ('verified', 'suspended');

comment on view public.public_worker_profiles is
  'Public worker directory. SECURITY DEFINER by design: exposes only non-sensitive columns so Find works without a broad profiles SELECT policy that would leak whatsapp_phone.';

revoke all on public.public_worker_profiles from anon, authenticated;
grant select on public.public_worker_profiles to anon, authenticated;

drop view if exists public.job_participant_profiles;
create view public.job_participant_profiles
with (security_invoker = true) as
select
  p.id,
  p.full_name,
  p.whatsapp_phone,
  p.created_at
from public.profiles p
where exists (
  select 1
  from public.job_requests j
  where j.status in ('accepted', 'in_progress', 'completed')
    and (
      (j.client_id = auth.uid() and j.worker_id = p.id)
      or (j.worker_id = auth.uid() and j.client_id = p.id)
    )
);

revoke all on public.job_participant_profiles from anon, authenticated;
grant select on public.job_participant_profiles to authenticated;
