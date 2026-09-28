import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  ids?: string[];
};

/**
 * POST { ids: string[] }
 * Returns { emails: Record<string, string> } for admins only.
 * Emails come from auth.users via the service role — never exposed publicly.
 */
export async function POST(request: Request) {
  try {
    const server = await createServerClient();
    const {
      data: { user },
      error: userErr,
    } = await server.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await server
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id) => typeof id === "string" && id.length > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ emails: {} });
    }

    const batch = ids.slice(0, 100);

    let service;
    try {
      service = createServiceClient();
    } catch (e: any) {
      return NextResponse.json(
        {
          error:
            e?.message ||
            "Service role not configured. Add SUPABASE_SERVICE_ROLE_KEY on Vercel.",
        },
        { status: 500 }
      );
    }

    const emails: Record<string, string> = {};

    await Promise.all(
      batch.map(async (id) => {
        try {
          const { data, error } = await service.auth.admin.getUserById(id);
          if (!error && data?.user?.email) {
            emails[id] = data.user.email;
          }
        } catch {
          /* skip individual failures */
        }
      })
    );

    return NextResponse.json({ emails });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
