-- Institute cohort tag on worker profiles (GTMI / USET / GTHI)
-- Run in Supabase SQL Editor if not applied by CLI.

alter table public.profiles
  add column if not exists cohort_source text;

comment on column public.profiles.cohort_source is
  'Training partner cohort: gtmi | uset | gthi | null for independent workers';

-- Optional: constrain known values (null allowed)
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
