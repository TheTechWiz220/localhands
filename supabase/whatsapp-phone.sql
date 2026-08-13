-- Run once in Supabase SQL Editor
alter table public.profiles
  add column if not exists whatsapp_phone text;
