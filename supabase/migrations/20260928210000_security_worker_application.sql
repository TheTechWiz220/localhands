-- Allow the legitimate client -> pending worker application transition
-- without allowing self-promotion to an approved/privileged worker state.

create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
  is_worker_application boolean;
begin
  caller_is_admin := exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );

  if caller_is_admin then
    return new;
  end if;

  if new.id <> old.id then
    raise exception 'Profile id cannot be changed';
  end if;

  is_worker_application :=
    old.role = 'client'
    and new.role = 'worker'
    and new.verification_status = 'pending'
    and coalesce(new.is_verified, false) = false
    and coalesce(new.id_verified, false) = false;

  if new.role is distinct from old.role and not is_worker_application then
    raise exception 'Role can only be changed by an admin or by submitting a pending worker application';
  end if;

  if new.verification_status is distinct from old.verification_status
     and new.verification_status not in ('pending') then
    raise exception 'Verification status can only be changed by an admin';
  end if;

  if coalesce(new.is_verified, false) is distinct from coalesce(old.is_verified, false)
     and coalesce(new.is_verified, false) = true then
    raise exception 'Verification can only be granted by an admin';
  end if;

  if coalesce(new.id_verified, false) is distinct from coalesce(old.id_verified, false)
     and coalesce(new.id_verified, false) = true then
    raise exception 'ID verification can only be granted by an admin';
  end if;

  if new.verification_notes is distinct from old.verification_notes then
    raise exception 'Verification notes can only be changed by an admin';
  end if;

  if new.admin_notes is distinct from old.admin_notes then
    raise exception 'Admin notes can only be changed by an admin';
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_profile_security_fields() from public;
revoke execute on function public.protect_profile_security_fields() from anon;
revoke execute on function public.protect_profile_security_fields() from authenticated;
