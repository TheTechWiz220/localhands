-- Allow positive test outcomes (no issues)
-- Run once in Supabase SQL Editor

alter table public.test_reports
  drop constraint if exists test_reports_severity_check;

alter table public.test_reports
  add constraint test_reports_severity_check
  check (severity in ('ok', 'blocker', 'annoying', 'typo'));

alter table public.test_reports
  alter column severity set default 'ok';
