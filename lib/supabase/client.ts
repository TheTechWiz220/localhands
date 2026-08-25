import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 * Uses placeholders during build if env is not injected (e.g. secondary Vercel project),
 * so Next.js prerender does not fail. Runtime still needs real env on the project that serves traffic.
 */
export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://placeholder.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  return createBrowserClient(url, key);
}
