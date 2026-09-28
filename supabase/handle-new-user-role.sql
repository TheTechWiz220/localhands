-- Run once in Supabase SQL editor.
-- Sets role from signup metadata so Create as Client/Worker is respected.
-- Also avoids hard-fail if profile row already exists (double-fire safety).

create or replace function public.handle_new_user()
returns trigger as $$
declare
  chosen_role text;
begin
  chosen_role := coalesce(new.raw_user_meta_data->>'role', 'client');
  if chosen_role not in ('worker', 'client') then
    chosen_role := 'client';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    chosen_role
  )
  on conflict (id) do update set
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    role = case
      when public.profiles.role = 'admin' then public.profiles.role
      else excluded.role
    end,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;
