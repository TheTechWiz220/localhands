-- 1. Profiles: prevent self-promotion and self-verification.
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
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

  if new.role is distinct from old.role then
    raise exception 'Role can only be changed by an admin';
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

drop trigger if exists trg_protect_profile_security_fields on public.profiles;
create trigger trg_protect_profile_security_fields
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
for select to authenticated using (auth.uid() = id);
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles
for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
