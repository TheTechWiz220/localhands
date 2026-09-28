-- LocalHands storage hardening
-- Keeps proof-media public for the current MVP, but prevents users from
-- writing to another user's folder and removes unrestricted update access.

drop policy if exists "Authenticated upload proof-media" on storage.objects;
drop policy if exists "Authenticated users can upload proof-media" on storage.objects;
drop policy if exists "Authenticated update proof-media" on storage.objects;
drop policy if exists "Authenticated users can update own proof-media" on storage.objects;
drop policy if exists "Workers delete own proof files" on storage.objects;

create policy "Users upload own proof-media"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'proof-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and coalesce(metadata->>'mimetype', '') in (
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  )
);

create policy "Users update own proof-media"
on storage.objects
for update to authenticated
using (
  bucket_id = 'proof-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'proof-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and coalesce(metadata->>'mimetype', '') in (
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  )
);

create policy "Users delete own proof-media"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'proof-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Explicitly cap the bucket and allowed MIME types at the storage layer too.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ]
where id = 'proof-media';
