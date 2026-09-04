import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Default to Profile so new clients see their account status first
  const next = searchParams.get("next") ?? "/profile";

  // Build redirect response first so we can attach cookies to IT
  let response = NextResponse.redirect(`${origin}${next}`);

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Critical: set on the redirect response, not only cookieStore
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }

    // Exchange failed
    response = NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(error.message)}`
    );
    return response;
  }

  // No code in URL — likely wrong redirect or expired link
  return NextResponse.redirect(`${origin}/auth?error=missing_code`);
}
