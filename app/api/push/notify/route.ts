import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendPushToUser, sendPushToUsers } from "@/lib/push/server";

export const runtime = "nodejs";

type Body = {
  type?:
    | "request_to_worker"
    | "claim_to_client"
    | "accepted_to_client"
    | "job_ad_to_workers"
    | "counter_to_other"
    | "counter_accepted_to_other"
    | "declined_to_other"
    | "cancelled_to_other"
    | "completed_to_other"
    | "payment_paid_to_worker"
    | "payment_confirmed_to_client"
    | "worker_verified"
    | "worker_rejected"
    | "worker_suspended";
  jobRequestId?: string;
  workerId?: string;
};

function otherParty(
  job: { client_id: string; worker_id: string | null },
  userId: string
): string | null {
  if (job.client_id === userId) return job.worker_id;
  if (job.worker_id === userId) return job.client_id;
  return null;
}

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
    if (!type) {
      return NextResponse.json({ error: "type required" }, { status: 400 });
    }

    const admin = createServiceClient();

    // --- Worker verification (admin only) ---
    if (
      type === "worker_verified" ||
      type === "worker_rejected" ||
      type === "worker_suspended"
    ) {
      const workerId = body.workerId?.trim();
      if (!workerId) {
        return NextResponse.json({ error: "workerId required" }, { status: 400 });
      }

      const { data: caller } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (caller?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const payload =
        type === "worker_verified"
          ? {
              title: "You're verified",
              body: "Your LocalHands profile was approved. You can now receive job requests.",
              url: "/jobs",
              tag: `verify-${workerId}`,
            }
          : type === "worker_rejected"
            ? {
                title: "Application update",
                body: "Your LocalHands application was not approved. You can re-apply later.",
                url: "/apply",
                tag: `reject-${workerId}`,
              }
            : {
                title: "Verification removed",
                body: "Your LocalHands verification was removed. Contact support if this is unexpected.",
                url: "/profile",
                tag: `suspend-${workerId}`,
              };

      const result = await sendPushToUser(workerId, payload);
      return NextResponse.json({ ok: true, ...result });
    }

    const jobRequestId = body.jobRequestId?.trim();
    if (!jobRequestId) {
      return NextResponse.json({ error: "jobRequestId required" }, { status: 400 });
    }

    const { data: job, error } = await admin
      .from("job_requests")
      .select(
        "id, title, skill_needed, location_area, budget, client_id, worker_id, status, counter_amount"
      )
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
    const counterAmt =
      job.counter_amount != null
        ? ` · GMD ${Number(job.counter_amount).toLocaleString()}`
        : "";

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
        const candidates = [
          ...new Set((skillRows || []).map((r) => r.worker_id).filter(Boolean)),
        ];
        if (candidates.length) {
          const { data: profiles } = await admin
            .from("profiles")
            .select("id")
            .in("id", candidates)
            .eq("role", "worker")
            .eq("verification_status", "verified");
          workerIds = (profiles || []).map((p) => p.id);
        }
      }

      if (!workerIds.length) {
        const { data: allWorkers } = await admin
          .from("profiles")
          .select("id")
          .eq("role", "worker")
          .eq("verification_status", "verified");
        workerIds = (allWorkers || []).map((p) => p.id);
      }

      workerIds = workerIds.filter((id) => id !== user.id);

      const result = await sendPushToUsers(workerIds, {
        title: "New job available",
        body: `${title}${area}${budget}`,
        url: "/jobs",
        tag: `ad-${job.id}`,
      });
      return NextResponse.json({ ok: true, workers: workerIds.length, ...result });
    }

    // Counter offer → other party
    if (type === "counter_to_other") {
      const target = otherParty(job, user.id);
      if (!target) {
        return NextResponse.json({ error: "No other party" }, { status: 400 });
      }
      const result = await sendPushToUser(target, {
        title: "New counter-offer",
        body: `${title}${area}${counterAmt || budget}`,
        url: "/jobs",
        tag: `counter-${job.id}`,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    // Counter accepted → other party
    if (type === "counter_accepted_to_other") {
      const target = otherParty(job, user.id);
      if (!target) {
        return NextResponse.json({ error: "No other party" }, { status: 400 });
      }
      const result = await sendPushToUser(target, {
        title: "Counter accepted",
        body: `Price agreed for ${title}${area}${budget}`,
        url: "/jobs",
        tag: `counter-ok-${job.id}`,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    // Declined / cancelled / completed → other party
    if (
      type === "declined_to_other" ||
      type === "cancelled_to_other" ||
      type === "completed_to_other"
    ) {
      const target = otherParty(job, user.id);
      if (!target) {
        return NextResponse.json({ error: "No other party" }, { status: 400 });
      }
      const copy =
        type === "declined_to_other"
          ? { title: "Job declined", body: `${title}${area} was declined.` }
          : type === "cancelled_to_other"
            ? { title: "Job cancelled", body: `${title}${area} was cancelled.` }
            : {
                title: "Job completed",
                body: `${title}${area} was marked completed.`,
              };
      const result = await sendPushToUser(target, {
        ...copy,
        url: "/jobs",
        tag: `${type}-${job.id}`,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    // Client recorded Wave payment → worker
    if (type === "payment_paid_to_worker") {
      if (job.client_id !== user.id || !job.worker_id) {
        return NextResponse.json({ error: "Invalid payment notify" }, { status: 400 });
      }
      const result = await sendPushToUser(job.worker_id, {
        title: "Payment recorded",
        body: `Client marked ${title} as paid${budget}. Please confirm.`,
        url: "/jobs",
        tag: `paid-${job.id}`,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    // Worker confirmed payment → client
    if (type === "payment_confirmed_to_client") {
      if (job.worker_id !== user.id || !job.client_id) {
        return NextResponse.json({ error: "Invalid confirm notify" }, { status: 400 });
      }
      const result = await sendPushToUser(job.client_id, {
        title: "Payment confirmed",
        body: `Worker confirmed payment for ${title}${area}.`,
        url: "/jobs",
        tag: `pay-ok-${job.id}`,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Notify failed" },
      { status: 500 }
    );
  }
}
