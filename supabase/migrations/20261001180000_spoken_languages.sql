-- Spoken languages for workers (clients see on profile)
alter table public.profiles
  add column if not exists spoken_languages text[] default '{}'::text[];

comment on column public.profiles.spoken_languages is
  'Languages the worker speaks (e.g. English, Mandinka, Wolof). Optional multi-select on apply.';

-- Expose on public worker profiles for clients
drop view if exists public.public_worker_profiles;
create view public.public_worker_profiles as
select p.id,p.full_name,p.location_area,p.bio,p.verification_status,
       p.availability,p.avatar_url,p.created_at,p.id_verified,
       p.spoken_languages
from public.profiles p
where p.role='worker'
  and p.verification_status in ('verified','suspended');
revoke all on public.public_worker_profiles from anon, authenticated;
grant select on public.public_worker_profiles to anon, authenticated;
