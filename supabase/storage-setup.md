# Supabase Storage setup for Proof of Work

## 1. Create the bucket

1. Open Supabase → **Storage**
2. Click **New bucket**
3. Name: `proof-media`
4. Enable **Public bucket** (so worker photos can be shown on profiles)
5. Create

## 2. Policies (Storage → proof-media → Policies)

Allow authenticated users to upload to their own folder:

```sql
-- Public read
create policy "Public read proof-media"
on storage.objects for select
using (bucket_id = 'proof-media');

-- Authenticated upload to own folder (path starts with user id)
create policy "Workers upload own proof"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'proof-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update/delete their own files
create policy "Workers manage own proof files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'proof-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Workers delete own proof files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'proof-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

## 3. Table policy for proof_media inserts

In SQL Editor:

```sql
create policy "Workers insert own proof_media"
on public.proof_media for insert
to authenticated
with check (auth.uid() = worker_id);

create policy "Workers delete own proof_media"
on public.proof_media for delete
to authenticated
using (auth.uid() = worker_id);
```

After this, workers can upload from Apply and Profile pages.
