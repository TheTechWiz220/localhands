-- LocalHands Database Schema
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text unique,
  avatar_url text,
  role text check (role in ('worker', 'client', 'admin')) default 'client',
  location_area text,
  bio text,
  is_verified boolean default false,
  verification_status text check (verification_status in ('pending', 'verified', 'rejected', 'suspended')) default 'pending',
  verification_notes text,
  availability text check (availability in ('available', 'busy', 'unavailable')) default 'available',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists public.worker_skills (
  id uuid default gen_random_uuid() primary key,
  worker_id uuid references public.profiles(id) on delete cascade,
  skill text not null,
  experience_level text,
  created_at timestamptz default now()
);
create table if not exists public.proof_media (
  id uuid default gen_random_uuid() primary key,
  worker_id uuid references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text check (media_type in ('image', 'video')) default 'image',
  caption text,
  created_at timestamptz default now()
);
create table if not exists public.job_requests (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade,
  worker_id uuid references public.profiles(id),
  title text not null,
  description text not null,
  skill_needed text not null,
  location_area text not null,
  preferred_date date,
  budget numeric,
  status text check (status in ('pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists public.ratings (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.job_requests(id) on delete cascade,
  from_user_id uuid references public.profiles(id),
  to_user_id uuid references public.profiles(id),
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  photo_urls text[],
  created_at timestamptz default now()
);
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.job_requests(id) on delete cascade,
  amount numeric,
  method text default 'wave',
  status text check (status in ('pending', 'paid', 'confirmed', 'disputed')) default 'pending',
  wave_reference text,
  paid_at timestamptz,
  confirmed_at timestamptz
);
alter table public.profiles enable row level security;
alter table public.worker_skills enable row level security;
alter table public.proof_media enable row level security;
alter table public.job_requests enable row level security;
alter table public.ratings enable row level security;
alter table public.payments enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Skills are viewable by everyone" on public.worker_skills for select using (true);
create policy "Workers can manage own skills" on public.worker_skills for all using (auth.uid() = worker_id);
create policy "Proof media viewable by everyone" on public.proof_media for select using (true);
create policy "Job requests viewable by participants" on public.job_requests for select using (auth.uid() = client_id or auth.uid() = worker_id);
create policy "Clients can create jobs" on public.job_requests for insert with check (auth.uid() = client_id);
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.phone);
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
