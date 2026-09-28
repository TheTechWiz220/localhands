-- LocalHands public profile privacy boundary
-- Creates a security-invoker view exposing only fields intended for public
-- worker discovery. Existing authenticated/private profile queries remain on
-- public.profiles until application queries are migrated.

begin;

drop view if exists public.public_worker_profiles;

create view public.public_worker_profiles
with (security_invoker = true)
as
select
  p.id,
  p.full_name,
  p.location_area,
  p.bio,
  p.verification_status,
  p.availability,
  p.avatar_url,
  p.created_at,
  p.id_verified
from public.profiles p
where p.role = 'worker'
  and p.verification_status in ('verified', 'suspended');

revoke all on public.public_worker_profiles from anon, authenticated;
grant select on public.public_worker_profiles to anon, authenticated;

commit;
