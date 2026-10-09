import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Returns the other party's WhatsApp for a job the caller is on.
 * Uses service role after membership check (profiles RLS blocks cross-user reads).
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { jobRequestId?: string };
    const jobRequestId = body.jobRequestId?.trim();
    if (!jobRequestId) {
      return NextResponse.json({ error: "jobRequestId required" }, { status: 400 });
    }

    const admin = createServiceClient();
    const { data: job, error } = await admin
      .from("job_requests")
      .select("id, client_id, worker_id, status")
      .eq("id", jobRequestId)
      .maybeSingle();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.client_id !== user.id && job.worker_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Contact only after price is locked
    if (!["accepted", "in_progress", "completed"].includes(job.status)) {
      return NextResponse.json({ error: "Contact not available yet" }, { status: 403 });
    }

    const otherId =
      job.client_id === user.id ? job.worker_id : job.client_id;
    if (!otherId) {
      return NextResponse.json({ whatsapp_phone: null, full_name: null });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, whatsapp_phone")
      .eq("id", otherId)
      .maybeSingle();

    return NextResponse.json({
      full_name: profile?.full_name ?? null,
      whatsapp_phone: profile?.whatsapp_phone ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
