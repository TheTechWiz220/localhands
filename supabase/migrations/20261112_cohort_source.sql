-- Institute cohort tag on worker profiles (GTMI / USET / GTHI)
-- Run in Supabase SQL Editor.

alter table public.profiles
  add column if not exists cohort_source text;

comment on column public.profiles.cohort_source is
  'Training partner cohort: gtmi | uset | gthi | null for independent workers';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_cohort_source_check'
  ) then
    alter table public.profiles
      add constraint profiles_cohort_source_check
      check (
        cohort_source is null
        or cohort_source in ('gtmi', 'uset', 'gthi')
      );
  end if;
end $$;

-- Expose cohort on public directory view
drop view if exists public.public_worker_profiles;
create view public.public_worker_profiles as
select p.id,
       p.full_name,
       p.location_area,
       p.bio,
       p.verification_status,
       p.availability,
       p.avatar_url,
       p.created_at,
       p.id_verified,
       p.spoken_languages,
       p.cohort_source
from public.profiles p
where p.role = 'worker'
  and p.verification_status in ('verified', 'suspended');

revoke all on public.public_worker_profiles from anon, authenticated;
grant select on public.public_worker_profiles to anon, authenticated;
