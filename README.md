# LocalHands

Verified skilled workers platform for The Gambia.

Find trusted phone repairers, solar installers, farm workers, electricians and more.

## Stack

- Next.js 15 (App Router)
- TypeScript + Tailwind CSS
- Supabase (Auth + Postgres)
- Vercel

## Live

https://localhands-thetechwiz220s-projects.vercel.app

## Features (MVP)

- Mobile-first directory of verified workers
- Worker profiles (skills, ratings, proof of work)
- Job posting
- Phone OTP auth
- Admin verification panel (role-protected)

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env.local` and add Supabase keys
3. Run SQL in `supabase/schema.sql`
4. `npm install && npm run dev`
