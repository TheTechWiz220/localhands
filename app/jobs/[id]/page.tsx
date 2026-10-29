"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  Loader2,
  Check,
  MapPin,
  Calendar,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  calcFees,
  formatGmd,
  PLATFORM_FEE_PERCENT,
  CLIENT_FEE_PERCENT,
  WORKER_FEE_PERCENT,
} from "@/lib/pricing";
import { ClientTrustLine } from "@/components/client-trust-line";

type JobDetail = {
  id: string;
  title: string;
  description: string;
  skill_needed: string;
  location_area: string;
  budget: number | null;
  status: string;
  created_at: string;
  client_id: string;
  worker_id: string | null;
  counter_amount?: number | null;
  counter_note?: string | null;
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isVerifiedWorker, setIsVerifiedWorker] = useState(false);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [acting, setActing] = useState(false);
  const [clientTrust, setClientTrust] = useState({
    avg: 0,
    count: 0,
    jobsDone: 0,
    memberSince: null as string | null,
  });

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!jobId) {
        setError("Job not found");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, verification_status")
        .eq("id", user.id)
        .maybeSingle();

      const verified =
        profile?.role === "worker" &&
        profile?.verification_status === "verified";
      setIsVerifiedWorker(!!verified);

      const { data: row, error: qErr } = await supabase
        .from("job_requests")
        .select(
          "id, title, description, skill_needed, location_area, budget, status, created_at, client_id, worker_id, counter_amount, counter_note"
        )
        .eq("id", jobId)
        .maybeSingle();

      if (qErr) {
        setError(qErr.message);
        setLoading(false);
        return;
      }

      if (!row) {
        setError("Job not found or you do not have access to view it.");
        setLoading(false);
        return;
      }

      setJob(row as JobDetail);

      if (row.client_id) {
        const { data: ratings } = await supabase
          .from("ratings")
          .select("rating")
          .eq("to_user_id", row.client_id);
        const count = ratings?.length || 0;
        let avg = 0;
        if (count > 0) {
          avg =
            Math.round(
              (ratings!.reduce((s, r) => s + (r.rating || 0), 0) / count) * 10
            ) / 10;
        }
        const { count: doneCount } = await supabase
          .from("job_requests")
          .select("id", { count: "exact", head: true })
          .eq("client_id", row.client_id)
          .eq("status", "completed");
        const { data: cProf } = await supabase
          .from("profiles")
          .select("created_at")
          .eq("id", row.client_id)
          .maybeSingle();
        setClientTrust({
          avg,
          count,
          jobsDone: doneCount || 0,
          memberSince: cProf?.created_at || null,
        });
      }

      setLoading(false);
    }

    load();
  }, [jobId]);

  async function claimJob() {
    if (!userId || !job) return;
    setActing(true);
    setError("");
    setMessage("");

    const { data, error: uError } = await supabase
      .from("job_requests")
      .update({
        worker_id: userId,
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .is("worker_id", null)
      .select("id, status, worker_id")
      .maybeSingle();

    setActing(false);

    if (uError) {
      setError(
        uError.message.includes("policy")
          ? "Could not claim this job. You may need to be a verified worker."
          : uError.message
      );
      return;
    }

    if (!data) {
      setError("Job already claimed or no longer available.");
      return;
    }

    setMessage("You claimed this job. Opening your jobs…");
    setTimeout(() => router.push("/jobs"), 800);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-green-700" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4 text-center">
        <p className="text-sm text-gray-600">Sign in to view job details.</p>
        <Link href="/auth">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <p className="text-sm text-red-700">{error || "Job not found."}</p>
        <Link href="/jobs" className="text-sm text-green-700 underline">
          Back to jobs
        </Link>
      </div>
    );
  }

  const fees = job.budget != null ? calcFees(job.budget) : null;
  const isOpen =
    !job.worker_id && (job.status === "open" || job.status === "pending");
  const isParticipant =
    userId === job.client_id || userId === job.worker_id;
  const canClaim =
    isVerifiedWorker && isOpen && userId !== job.client_id;

  const created = new Date(job.created_at);
  const createdLabel = created.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold text-gray-900 leading-snug">
            {job.title}
          </h1>
          <Badge
            variant="secondary"
            className={
              isOpen
                ? "bg-green-100 text-green-800 shrink-0"
                : "shrink-0"
            }
          >
            {isOpen ? "Open" : job.status}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          Posted {createdLabel}
        </p>
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</p>
      )}

      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Job details</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {job.description || "No description provided."}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {job.skill_needed && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-800">
              <Wrench className="h-3.5 w-3.5" />
              {job.skill_needed}
            </span>
          )}
          {job.location_area && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-800">
              <MapPin className="h-3.5 w-3.5" />
              {job.location_area}
            </span>
          )}
        </div>
      </section>

      {fees && (
        <section className="rounded-xl border border-green-100 bg-green-50/50 p-4 space-y-1">
          <p className="text-sm font-semibold text-green-900">
            Job budget {formatGmd(fees.amount)}
          </p>
          <p className="text-sm text-gray-800">
            Client pays <strong>{formatGmd(fees.clientPays)}</strong> (+{CLIENT_FEE_PERCENT}%)
          </p>
          <p className="text-sm text-green-800">
            Worker receives <strong>{formatGmd(fees.workerGets)}</strong> (−{WORKER_FEE_PERCENT}%)
          </p>
          <p className="text-xs text-gray-600">
            LocalHands total {PLATFORM_FEE_PERCENT}% ({formatGmd(fees.fee)}) —
            split 5% client / 5% worker
          </p>
          {job.status === "countered" && job.counter_amount != null && (
            <p className="text-sm text-amber-800 pt-2 border-t border-green-100 mt-2">
              Counter offer: {formatGmd(job.counter_amount)}
              {job.counter_note ? ` — “${job.counter_note}”` : ""}
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl border bg-white p-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">About the client</h2>
        <ClientTrustLine
          avgRating={clientTrust.avg}
          ratingCount={clientTrust.count}
          jobsDone={clientTrust.jobsDone}
          memberSince={clientTrust.memberSince}
        />
      </section>

      {canClaim && (
        <Button
          className="w-full"
          size="lg"
          disabled={acting}
          onClick={claimJob}
        >
          {acting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Claim this job
              {fees ? ` · get ${formatGmd(fees.workerGets)}` : ""}
            </>
          )}
        </Button>
      )}

      {!canClaim && isOpen && !isVerifiedWorker && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-3">
          Only verified workers can claim open jobs.{" "}
          <Link href="/apply" className="underline font-medium">
            Apply to get verified
          </Link>
        </p>
      )}

      {isParticipant && (
        <Link href="/jobs">
          <Button variant="outline" className="w-full">
            <Briefcase className="h-4 w-4 mr-1" />
            Manage this job on My jobs
          </Button>
        </Link>
      )}

      <Link
        href="/jobs"
        className="block text-center text-sm text-green-700 hover:underline py-2"
      >
        All jobs
      </Link>
    </div>
  );
}
