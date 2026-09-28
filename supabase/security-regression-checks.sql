-- LocalHands security regression checks
-- Run only against a disposable/local/staging database AFTER applying
-- security-hardening.sql, storage-hardening.sql and public-profile-view.sql.
-- This is a catalog-level guard, not a substitute for authenticated RLS tests.

with checks(check_name, passed, detail) as (
  select
    'profiles self-update policy is scoped to authenticated',
    exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='profiles'
        and policyname='Users can update own profile'
        and cmd='UPDATE' and roles = array['authenticated']::name[]
        and qual like '%auth.uid() = id%'
    ),
    'Expected authenticated-only self-update policy'
  union all
  select
    'legacy public full-profile SELECT policy removed',
    not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='profiles'
        and cmd='SELECT' and roles @> array['public']::name[]
        and qual = 'true'
    ),
    'No unrestricted SELECT policy should remain on profiles'
  union all
  select
    'public worker profile view exists',
    exists (
      select 1 from information_schema.views
      where table_schema='public' and table_name='public_worker_profiles'
    ),
    'Directory should query public_worker_profiles'
  union all
  select
    'testing findings policy correlates campaign',
    exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='testing_findings'
        and policyname='accepted testers submit findings'
        and with_check like '%testing_findings.campaign_id%'
    ),
    'Finding must match accepted application campaign'
  union all
  select
    'testing tasks policy correlates campaign',
    exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='testing_tasks'
        and policyname='campaign tasks visible to participants'
        and qual like '%testing_tasks.campaign_id%'
    ),
    'Task visibility must match application campaign'
  union all
  select
    'testing assignment ownership trigger exists',
    exists (
      select 1 from pg_trigger
      where tgname='trg_protect_testing_assignment_security'
    ),
    'Tester assignment creation/update must be database-guarded'
  union all
  select
    'testing report ownership trigger exists',
    exists (
      select 1 from pg_trigger
      where tgname='trg_protect_test_report_security'
    ),
    'Tester report updates must remain bound to the assignment owner'
  union all
  select
    'new testing applications policy is tester-owned',
    exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='testing_applications'
        and policyname='testers apply'
        and with_check like '%tester_id = auth.uid()%'
    ),
    'Testers may only create their own applications'
  union all
  select
    'new testing rewards are tester/admin scoped',
    exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='testing_rewards'
        and policyname='testers view own rewards'
        and qual like '%tester_id = auth.uid()%'
    ),
    'Rewards must not be publicly readable'
  union all
  select
    'tester finding review fields are protected',
    exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='testing_findings'
        and policyname='accepted testers submit findings'
        and with_check like '%reviewed_by is null%'
        and with_check like '%reward_amount%'
    ),
    'Tester-created findings must start unrewarded and unreviewed'
  union all
  select
    'proof-media bucket size cap configured',
    exists (
      select 1 from storage.buckets
      where id='proof-media' and file_size_limit=5242880
        and allowed_mime_types is not null
    ),
    'Expected 5 MiB limit and MIME allowlist'
  union all
  select
    'tester status cannot be self-modified',
    exists (
      select 1 from pg_trigger
      where tgname='trg_protect_testing_tester_security'
    ),
    'Tester status changes must be admin-controlled'
  union all
  select
    'applications require active tester and published campaign',
    exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='testing_applications'
        and policyname='testers apply'
        and with_check like '%status = ''active''%'
        and with_check like '%status = ''published''%'
    ),
    'Only active testers may apply to published campaigns'
  union all
  select
    'finding task must belong to submitted campaign',
    exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='testing_findings'
        and policyname='accepted testers submit findings'
        and with_check like '%testing_findings.campaign_id%'
        and with_check like '%testing_findings.task_id%'
    ),
    'A finding cannot attach a task from another campaign'
  union all
  select
    'legacy proof-media write policies removed',
    not exists (
      select 1 from pg_policies
      where schemaname='storage' and tablename='objects'
        and policyname in (
          'Authenticated upload proof-media',
          'Authenticated users can upload proof-media',
          'Authenticated update proof-media',
          'Authenticated users can update own proof-media'
        )
    ),
    'Unscoped proof-media write policies must not remain'
)
select check_name,
       case when passed then 'PASS' else 'FAIL' end as result,
       detail
from checks
order by check_name;
