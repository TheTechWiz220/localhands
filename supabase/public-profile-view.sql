-- LocalHands profile privacy projections
begin;

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

drop view if exists public.job_participant_profiles;
create view public.job_participant_profiles as
select p.id,p.full_name,p.whatsapp_phone,p.created_at
from public.profiles p
where exists (
  select 1 from public.job_requests j
  where (j.client_id=auth.uid() and j.worker_id=p.id)
     or (j.worker_id=auth.uid() and j.client_id=p.id)
);
revoke all on public.job_participant_profiles from anon;
grant select on public.job_participant_profiles to authenticated;

commit;
