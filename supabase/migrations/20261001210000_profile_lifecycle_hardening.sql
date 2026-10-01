-- Profile lifecycle hardening:
-- 1) Enforce the six-photo proof-of-work invariant at the database layer.
-- 2) Keep the invariant race-safe by locking the worker profile row.
-- The admin reset itself is performed server-side in /api/admin/reset-worker.

create or replace function public.enforce_proof_media_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  proof_count integer;
begin
  -- Serialize proof inserts for this worker so concurrent uploads cannot
  -- both observe a count below the limit.
  perform 1
  from public.profiles
  where id = new.worker_id
  for update;

  select count(*) into proof_count
  from public.proof_media
  where worker_id = new.worker_id;

  if proof_count >= 6 then
    raise exception 'Maximum 6 proof-of-work photos allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_proof_media_limit on public.proof_media;

create trigger enforce_proof_media_limit
before insert on public.proof_media
for each row
execute function public.enforce_proof_media_limit();

revoke execute on function public.enforce_proof_media_limit() from public, anon, authenticated;
