import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendPushToUser, sendPushToUsers } from "@/lib/push/server";

export const runtime = "nodejs";

type Body = {
  type?: "request_to_worker" | "claim_to_client" | "accepted_to_client" | "job_ad_to_workers";
  jobRequestId?: string;
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Body;
    const type = body.type;
    const jobRequestId = body.jobRequestId?.trim();
    if (!type || !jobRequestId) {
      return NextResponse.json({ error: "type and jobRequestId required" }, { status: 400 });
    }

    const admin = createServiceClient();
    const { data: job, error } = await admin
      .from("job_requests")
      .select("id, title, skill_needed, location_area, budget, client_id, worker_id, status")
      .eq("id", jobRequestId)
      .maybeSingle();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.client_id !== user.id && job.worker_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const title = job.title || job.skill_needed || "Job";
    const area = job.location_area ? ` in ${job.location_area}` : "";
    const budget =
      job.budget != null ? ` · GMD ${Number(job.budget).toLocaleString()}` : "";

    if (type === "request_to_worker") {
      if (!job.worker_id || job.client_id !== user.id) {
        return NextResponse.json({ error: "Invalid request notify" }, { status: 400 });
      }
      const result = await sendPushToUser(job.worker_id, {
        title: "New job request",
        body: `${title}${area}${budget}`,
        url: "/jobs",
        tag: `req-${job.id}`,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (type === "claim_to_client" || type === "accepted_to_client") {
      if (!job.client_id || job.worker_id !== user.id) {
        return NextResponse.json({ error: "Invalid claim notify" }, { status: 400 });
      }
      const result = await sendPushToUser(job.client_id, {
        title: type === "claim_to_client" ? "Job claimed" : "Request accepted",
        body: `A worker responded: ${title}${area}`,
        url: "/jobs",
        tag: `claim-${job.id}`,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    // Open job ad → notify approved workers who list this skill
    if (type === "job_ad_to_workers") {
      if (job.client_id !== user.id || job.worker_id) {
        return NextResponse.json({ error: "Invalid job ad notify" }, { status: 400 });
      }

      const skill = (job.skill_needed || "").trim();
      let workerIds: string[] = [];

      if (skill) {
        const { data: skillRows } = await admin
          .from("worker_skills")
          .select("worker_id")
          .eq("skill", skill);
        const candidates = [...new Set((skillRows || []).map((r) => r.worker_id).filter(Boolean))];
        if (candidates.length) {
          const { data: profiles } = await admin
            .from("profiles")
            .select("id")
            .in("id", candidates)
            .eq("role", "worker")
            .eq("verification_status", "approved");
          workerIds = (profiles || []).map((p) => p.id);
        }
      }

      // Fallback: all approved workers with push (helps testing if skill has no matches)
      if (!workerIds.length) {
        const { data: allWorkers } = await admin
          .from("profiles")
          .select("id")
          .eq("role", "worker")
          .eq("verification_status", "approved");
        workerIds = (allWorkers || []).map((p) => p.id);
      }

      // Never notify the posting client
      workerIds = workerIds.filter((id) => id !== user.id);

      const result = await sendPushToUsers(workerIds, {
        title: "New job available",
        body: `${title}${area}${budget}`,
        url: "/jobs",
        tag: `ad-${job.id}`,
      });
      return NextResponse.json({ ok: true, workers: workerIds.length, ...result });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Notify failed" },
      { status: 500 }
    );
  }
}
