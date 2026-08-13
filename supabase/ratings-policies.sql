-- Run in Supabase SQL Editor so ratings work

-- Anyone can read ratings (for worker profiles later)
drop policy if exists "Ratings are viewable by everyone" on public.ratings;
create policy "Ratings are viewable by everyone"
on public.ratings for select
using (true);

-- Users can only insert their own rating
drop policy if exists "Users can insert own ratings" on public.ratings;
create policy "Users can insert own ratings"
on public.ratings for insert
to authenticated
with check (auth.uid() = from_user_id);
