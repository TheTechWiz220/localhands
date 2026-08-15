"use client";

import { useEffect, useState } from "react";
import { Briefcase, Plus, Loader2, Check, X, Star } from "lucide-react";
import { JobWhatsAppButton } from "@/components/job-whatsapp-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { calcFees, formatGmd, PLATFORM_FEE_PERCENT } from "@/lib/pricing";

type Payment = {
  id: string;
  status: string;
  wave_reference: string | null;
  amount: number | null;
};

type Job = {
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
  countered_by?: string | null;
  client_name?: string;
  worker_name?: string;
  myRating?: number | null;
  other_avg_rating?: number;
  other_rating_count?: number;
  other_jobs_done?: number;
  payment?: Payment | null;
  other_whatsapp?: string | null;
  is_open?: boolean;
};

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isVerifiedWorker, setIsVerifiedWorker] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [ratingJobId, setRatingJobId] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [waveRef, setWaveRef] = useState("");
  const [payJobId, setPayJobId] = useState<string | null>(null);
  const [counterJobId, setCounterJobId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNote, setCounterNote] = useState("");

  const supabase = createClient();

  async function loadTrustStats(userIdToCheck: string) {
    const { data: ratingRows } = await supabase
      .from("ratings")
      .select("rating")
      .eq("to_user_id", userIdToCheck);

    let avg = 0;
    const count = ratingRows?.length || 0;
    if (count > 0) {
      avg =
        Math.round(
          (ratingRows!.reduce((s: number, r: any) => s + (r.rating || 0), 0) /
            count) *
            10
        ) / 10;
    }

    const { count: asClient } = await supabase
      .from("job_requests")
      .select("id", { count: "exact", head: true })
      .eq("client_id", userIdToCheck)
      .eq("status", "completed");

    const { count: asWorker } = await supabase
      .from("job_requests")
      .select("id", { count: "exact", head: true })
      .eq("worker_id", userIdToCheck)
      .eq("status", "completed");

    return {
      avg,
      count,
      jobsDone: (asClient || 0) + (asWorker || 0),
    };
  }

  async function enrichJob(j: any, uid: string): Promise<Job> {
    let client_name = "Client";
    let worker_name = "Worker";
    let client_wa: string | null = null;
    let worker_wa: string | null = null;

    if (j.client_id) {
      const { data: c } = await supabase
        .from("profiles")
        .select("full_name, whatsapp_phone")
        .eq("id", j.client_id)
        .maybeSingle();
      if (c?.full_name) client_name = c.full_name;
      if (c?.whatsapp_phone) client_wa = c.whatsapp_phone;
    }

    if (j.worker_id) {
      const { data: w } = await supabase
        .from("profiles")
        .select("full_name, whatsapp_phone")
        .eq("id", j.worker_id)
        .maybeSingle();
      if (w?.full_name) worker_name = w.full_name;
      if (w?.whatsapp_phone) worker_wa = w.whatsapp_phone;
    }

    const other_whatsapp = uid === j.client_id ? worker_wa : client_wa;

    let myRating: number | null = null;
    if (j.status === "completed") {
      const { data: r } = await supabase
        .from("ratings")
        .select("rating")
        .eq("job_id", j.id)
        .eq("from_user_id", uid)
        .maybeSingle();
      if (r?.rating) myRating = r.rating;
    }

    const otherId = uid === j.client_id ? j.worker_id : j.client_id;
    let other_avg_rating = 0;
    let other_rating_count = 0;
    let other_jobs_done = 0;

    if (otherId) {
      const trust = await loadTrustStats(otherId);
      other_avg_rating = trust.avg;
      other_rating_count = trust.count;
      other_jobs_done = trust.jobsDone;
    }

    let payment: Payment | null = null;
    const { data: pay } = await supabase
      .from("payments")
      .select("id, status, wave_reference, amount")
      .eq("job_id", j.id)
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pay) payment = pay as Payment;

    return {
      ...j,
      client_name,
      worker_name,
      myRating,
      other_avg_rating,
      other_rating_count,
      other_jobs_done,
      payment,
      other_whatsapp,
      is_open: !j.worker_id && (j.status === "open" || j.status === "pending"),
    };
  }

  async function loadJobs(uid: string) {
    const { data, error: qError } = await supabase
      .from("job_requests")
      .select("*")
      .or(`client_id.eq.${uid},worker_id.eq.${uid}`)
      .order("created_at", { ascending: false });

    if (qError) {
      setError(qError.message);
      setJobs([]);
      return;
    }

    const enriched: Job[] = [];
    for (const j of data || []) {
      enriched.push(await enrichJob(j, uid));
    }
    setJobs(enriched);

    // Open jobs for verified workers to claim
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, verification_status")
      .eq("id", uid)
      .maybeSingle();

    const verified =
      profile?.role === "worker" &&
      profile?.verification_status === "verified";
    setIsVerifiedWorker(!!verified);

    if (verified) {
      const { data: openRows } = await supabase
        .from("job_requests")
        .select("*")
        .is("worker_id", null)
        .in("status", ["open", "pending"])
        .neq("client_id", uid)
        .order("created_at", { ascending: false })
        .limit(20);

      const openEnriched: Job[] = [];
      for (const j of openRows || []) {
        openEnriched.push(await enrichJob(j, uid));
      }
      setOpenJobs(openEnriched);
    } else {
      setOpenJobs([]);
    }
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await loadJobs(user.id);
      setLoading(false);
    }

    init();
  }, []);

  async function claimOpenJob(job: Job) {
    if (!userId) return;
    setActingId(job.id);
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

    setActingId(null);

    if (uError) {
      setError(
        uError.message.includes("policy")
          ? "Claim blocked by RLS. Allow verified workers to claim open jobs (worker_id null)."
          : uError.message
      );
      return;
    }

    if (!data) {
      setError("Job already claimed or update blocked.");
      return;
    }

    setMessage("You claimed this job. Client can pay via Wave in the app.");
    await loadJobs(userId);
  }

  async function updateStatus(
    jobId: string,
    status: "accepted" | "declined" | "cancelled" | "completed"
  ) {
    setActingId(jobId);
    setError("");
    setMessage("");

    const { data, error: uError } = await supabase
      .from("job_requests")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select("id, status")
      .maybeSingle();

    setActingId(null);

    if (uError) {
      setError(uError.message);
      return;
    }

    if (!data) {
      setError(
        "Update blocked. Run the job_requests update policy in Supabase SQL Editor."
      );
      return;
    }

    setMessage(`Job marked as ${status}.`);
    if (status === "completed") {
      setRatingJobId(jobId);
      setStars(5);
      setComment("");
    }
    if (userId) await loadJobs(userId);
  }

  async function submitCounter(job: Job) {
    if (!userId) return;
    const amount = Number(counterAmount);
    if (!counterAmount || Number.isNaN(amount) || amount <= 0) {
      setError("Enter a valid counter amount in GMD.");
      return;
    }

    setActingId(job.id);
    setError("");
    setMessage("");

    const { data, error: uError } = await supabase
      .from("job_requests")
      .update({
        status: "countered",
        counter_amount: amount,
        counter_note: counterNote.trim() || null,
        countered_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("id, status")
      .maybeSingle();

    setActingId(null);

    if (uError) {
      setError(
        uError.message.includes("counter") || uError.message.includes("check")
          ? "Counter failed. Run the counter-offer SQL in Supabase (adds columns + countered status)."
          : uError.message
      );
      return;
    }

    if (!data) {
      setError("Update blocked by RLS.");
      return;
    }

    setCounterJobId(null);
    setCounterAmount("");
    setCounterNote("");
    setMessage(`Counter sent: ${formatGmd(amount)}. Waiting for the other side.`);
    if (userId) await loadJobs(userId);
  }

  async function acceptCounter(job: Job) {
    if (!job.counter_amount) return;

    setActingId(job.id);
    setError("");
    setMessage("");

    const { data, error: uError } = await supabase
      .from("job_requests")
      .update({
        status: "accepted",
        budget: job.counter_amount,
        counter_amount: null,
        counter_note: null,
        countered_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("id, status, budget")
      .maybeSingle();

    setActingId(null);

    if (uError) {
      setError(uError.message);
      return;
    }

    if (!data) {
      setError("Update blocked by RLS.");
      return;
    }

    setMessage(
      `Counter accepted. Price locked at ${formatGmd(job.counter_amount)}. Pay via Wave in the app.`
    );
    if (userId) await loadJobs(userId);
  }

  async function markPaid(job: Job) {
    if (!userId || !job.budget) return;
    if (!waveRef.trim()) {
      setError("Enter your Wave transaction reference.");
      return;
    }

    setActingId(job.id);
    setError("");
    setMessage("");

    const fees = calcFees(job.budget);

    if (job.payment?.id) {
      const { error: uError } = await supabase
        .from("payments")
        .update({
          status: "paid",
          wave_reference: waveRef.trim(),
          amount: fees.amount,
          method: "wave",
          paid_at: new Date().toISOString(),
        })
        .eq("id", job.payment.id);

      if (uError) {
        setActingId(null);
        setError(
          uError.message.includes("policy")
            ? "Payment blocked. Run payments policies in Supabase SQL Editor."
            : uError.message
        );
        return;
      }
    } else {
      const { error: iError } = await supabase.from("payments").insert({
        job_id: job.id,
        amount: fees.amount,
        method: "wave",
        status: "paid",
        wave_reference: waveRef.trim(),
        paid_at: new Date().toISOString(),
      });

      if (iError) {
        setActingId(null);
        setError(
          iError.message.includes("policy")
            ? "Payment blocked. Run payments policies in Supabase SQL Editor."
            : iError.message
        );
        return;
      }
    }

    setActingId(null);
    setWaveRef("");
    setPayJobId(null);
    setMessage("Marked as paid. Waiting for worker to confirm.");
    if (userId) await loadJobs(userId);
  }

  async function confirmPayment(job: Job) {
    if (!job.payment?.id) return;

    setActingId(job.id);
    setError("");
    setMessage("");

    const { error: uError } = await supabase
      .from("payments")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", job.payment.id);

    setActingId(null);

    if (uError) {
      setError(
        uError.message.includes("policy")
          ? "Confirm blocked. Run payments policies in Supabase SQL Editor."
          : uError.message
      );
      return;
    }

    setMessage("Payment confirmed. You can mark the job completed.");
    if (userId) await loadJobs(userId);
  }

  async function submitRating(job: Job) {
    if (!userId) return;

    const toUserId = userId === job.client_id ? job.worker_id : job.client_id;
    if (!toUserId) {
      setError("Missing other party for rating.");
      return;
    }

    setSubmittingRating(true);
    setError("");
    setRatingJobId(job.id);

    const { error: insertError } = await supabase.from("ratings").insert({
      job_id: job.id,
      from_user_id: userId,
      to_user_id: toUserId,
      rating: stars,
      comment: comment.trim() || null,
    });

    setSubmittingRating(false);

    if (insertError) {
      setError(
        insertError.message.includes("policy") ||
          insertError.message.includes("row-level")
          ? "Rating blocked. Run the ratings policies in Supabase SQL Editor."
          : insertError.message
      );
      return;
    }

    setMessage("Thanks for your rating!");
    setRatingJobId(null);
    setComment("");
    if (userId) await loadJobs(userId);
  }

  function statusBadge(status: string) {
    const map: Record<
      string,
      "default" | "success" | "warning" | "secondary" | "destructive"
    > = {
      pending: "warning",
      open: "warning",
      countered: "warning",
      accepted: "success",
      in_progress: "success",
      completed: "secondary",
      declined: "destructive",
      cancelled: "secondary",
    };
    return (
      <Badge variant={map[status] || "secondary"} className="capitalize">
        {status.replace("_", " ")}
      </Badge>
    );
  }

  function paymentLabel(p?: Payment | null) {
    if (!p) return null;
    if (p.status === "confirmed") return "Payment confirmed";
    if (p.status === "paid") return "Paid — awaiting confirm";
    return p.status;
  }

  function counterForm(job: Job) {
    return (
      <div className="border-t pt-3 space-y-2">
        <p className="text-sm font-medium">Counter offer (GMD)</p>
        <input
          type="number"
          min={1}
          placeholder="e.g. 12000"
          value={counterJobId === job.id ? counterAmount : ""}
          onChange={(e) => {
            setCounterJobId(job.id);
            setCounterAmount(e.target.value);
          }}
          onFocus={() => setCounterJobId(job.id)}
          className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        <input
          type="text"
          placeholder="Optional note (why this price)"
          value={counterJobId === job.id ? counterNote : ""}
          onChange={(e) => {
            setCounterJobId(job.id);
            setCounterNote(e.target.value);
          }}
          className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        {counterJobId === job.id &&
          counterAmount &&
          !Number.isNaN(Number(counterAmount)) &&
          Number(counterAmount) > 0 && (
            <p className="text-xs text-gray-500">
              New total {formatGmd(Number(counterAmount))} · worker would get{" "}
              {formatGmd(calcFees(Number(counterAmount)).workerGets)} after{" "}
              {PLATFORM_FEE_PERCENT}% fee
            </p>
          )}
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={actingId === job.id}
          onClick={() => submitCounter(job)}
        >
          {actingId === job.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Send counter"
          )}
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
        <p className="text-gray-500">Loading jobs...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <Briefcase className="h-12 w-12 mx-auto text-gray-400" />
        <div>
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="text-gray-500 mt-2">Sign in to see your job requests.</p>
        </div>
        <Link href="/auth">
          <Button size="lg">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="text-sm text-gray-500">Post, request, negotiate, pay</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/post-job">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Post job
            </Button>
          </Link>
          <Link href="/directory">
            <Button size="sm" variant="outline">
              Find
            </Button>
          </Link>
        </div>
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</p>
      )}

      {isVerifiedWorker && openJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-gray-700">Open jobs to claim</h2>
          {openJobs.map((job) => {
            const fees = job.budget != null ? calcFees(job.budget) : null;
            return (
              <div
                key={job.id}
                className="rounded-xl border border-green-200 bg-green-50/40 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {job.location_area} · Open listing
                    </p>
                  </div>
                  {statusBadge(job.status === "pending" ? "open" : job.status)}
                </div>
                <p className="text-sm text-gray-600">{job.description}</p>
                <div className="flex flex-wrap gap-2 text-xs items-center">
                  <Badge variant="secondary">{job.skill_needed}</Badge>
                  {fees && (
                    <span className="px-2 py-0.5 bg-green-50 text-green-800 rounded font-medium">
                      {formatGmd(fees.amount)}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={actingId === job.id}
                  onClick={() => claimOpenJob(job)}
                >
                  {actingId === job.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" /> Claim this job
                      {fees ? ` · ${formatGmd(fees.amount)}` : ""}
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {jobs.length === 0 && openJobs.length === 0 ? (
        <div className="rounded-xl border bg-white py-12 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="font-semibold text-lg">No jobs yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6 px-4">
            Post an open job for workers to claim, or request a specific person
            from Find.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center px-6">
            <Link href="/post-job">
              <Button className="w-full sm:w-auto">Post a Job</Button>
            </Link>
            <Link href="/directory">
              <Button variant="outline" className="w-full sm:w-auto">
                Find a Worker
              </Button>
            </Link>
          </div>
        </div>
      ) : jobs.length > 0 ? (
        <div className="space-y-4">
          <h2 className="font-semibold text-sm text-gray-700">Your jobs</h2>
          {jobs.map((job) => {
            const isWorker = job.worker_id === userId;
            const isClient = job.client_id === userId;
            const isOpenUnclaimed =
              isClient && !job.worker_id && (job.status === "open" || job.status === "pending");
            const otherLabel = isWorker
              ? job.client_name
              : job.worker_id
                ? job.worker_name
                : "Open — waiting for worker";
            const fees = job.budget != null ? calcFees(job.budget) : null;
            const payStatus = job.payment?.status;
            const canComplete =
              job.status === "accepted" &&
              (payStatus === "confirmed" || job.budget == null);

            const waitingOnMe =
              job.status === "countered" &&
              job.countered_by &&
              job.countered_by !== userId;
            const iSentCounter =
              job.status === "countered" && job.countered_by === userId;

            return (
              <div key={job.id} className="rounded-xl border bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isOpenUnclaimed
                        ? `Open listing · ${job.location_area}`
                        : isWorker
                          ? `From ${job.client_name}`
                          : `To ${job.worker_name}`}
                      {!isOpenUnclaimed && ` · ${job.location_area}`}
                    </p>
                  </div>
                  {statusBadge(
                    isOpenUnclaimed && job.status === "pending"
                      ? "open"
                      : job.status
                  )}
                </div>

                {!isOpenUnclaimed && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-gray-800">{otherLabel}</span>
                    {(job.other_rating_count || 0) > 0 ? (
                      <span className="flex items-center gap-0.5 text-amber-600">
                        <Star className="h-3 w-3 fill-current" />
                        {job.other_avg_rating}
                        <span className="text-gray-400">
                          ({job.other_rating_count})
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-400">No ratings yet</span>
                    )}
                    <span className="text-gray-400">·</span>
                    <span>{job.other_jobs_done || 0} jobs done</span>
                  </div>
                )}

                {isOpenUnclaimed && (
                  <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-2">
                    Waiting for a verified worker to claim this job.
                  </p>
                )}

                <p className="text-sm text-gray-600">{job.description}</p>

                <div className="flex flex-wrap gap-2 text-xs items-center">
                  <Badge variant="secondary">{job.skill_needed}</Badge>
                  {fees && (
                    <span className="px-2 py-0.5 bg-green-50 text-green-800 rounded font-medium">
                      {formatGmd(fees.amount)}
                    </span>
                  )}
                  {job.status === "countered" && job.counter_amount != null && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-900 rounded font-medium">
                      Counter: {formatGmd(job.counter_amount)}
                    </span>
                  )}
                  {paymentLabel(job.payment) && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded">
                      {paymentLabel(job.payment)}
                    </span>
                  )}
                </div>

                {fees &&
                  job.status !== "declined" &&
                  job.status !== "cancelled" && (
                    <div className="text-xs text-gray-500 space-y-0.5 border-t pt-2">
                      <p>
                        Current offer: {formatGmd(fees.amount)} (worker gets{" "}
                        {formatGmd(fees.workerGets)} after fee)
                      </p>
                      {job.status === "countered" && job.counter_amount != null && (
                        <>
                          <p className="text-amber-800 font-medium">
                            Proposed: {formatGmd(job.counter_amount)} (worker
                            gets{" "}
                            {formatGmd(
                              calcFees(job.counter_amount).workerGets
                            )}
                            )
                          </p>
                          {job.counter_note && (
                            <p className="italic">“{job.counter_note}”</p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                {job.status === "pending" && isWorker && job.worker_id && (
                  <div className="space-y-2 pt-1">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={actingId === job.id}
                        onClick={() => updateStatus(job.id, "accepted")}
                      >
                        {actingId === job.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" /> Accept
                            {fees ? ` · ${formatGmd(fees.amount)}` : ""}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        disabled={actingId === job.id}
                        onClick={() => updateStatus(job.id, "declined")}
                      >
                        <X className="h-4 w-4 mr-1" /> Decline
                      </Button>
                    </div>
                    {counterJobId === job.id ? (
                      counterForm(job)
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setCounterJobId(job.id);
                          setCounterAmount(
                            job.budget ? String(job.budget) : ""
                          );
                          setCounterNote("");
                        }}
                      >
                        Counter offer
                      </Button>
                    )}
                  </div>
                )}

                {(job.status === "pending" || job.status === "open") &&
                  isClient && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={actingId === job.id}
                      onClick={() => updateStatus(job.id, "cancelled")}
                    >
                      Cancel
                    </Button>
                  )}

                {waitingOnMe && (
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-sm font-medium text-amber-800">
                      They proposed {formatGmd(job.counter_amount || 0)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={actingId === job.id}
                        onClick={() => acceptCounter(job)}
                      >
                        {actingId === job.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" /> Accept counter
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        disabled={actingId === job.id}
                        onClick={() => updateStatus(job.id, "declined")}
                      >
                        Decline
                      </Button>
                    </div>
                    {counterJobId === job.id ? (
                      counterForm(job)
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setCounterJobId(job.id);
                          setCounterAmount(
                            job.counter_amount
                              ? String(job.counter_amount)
                              : job.budget
                                ? String(job.budget)
                                : ""
                          );
                          setCounterNote("");
                        }}
                      >
                        Counter again
                      </Button>
                    )}
                  </div>
                )}

                {iSentCounter && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                    Counter sent ({formatGmd(job.counter_amount || 0)}). Waiting
                    for them to accept, counter again, or decline.
                  </p>
                )}

                {job.status === "accepted" &&
                  isClient &&
                  payStatus !== "paid" &&
                  payStatus !== "confirmed" &&
                  fees && (
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-sm font-medium">Pay with Wave</p>
                      <p className="text-xs text-gray-500">
                        Send {formatGmd(fees.amount)} via Wave, then paste the
                        transaction reference. Keep payment tracked in
                        LocalHands.
                      </p>
                      <input
                        type="text"
                        placeholder="Wave reference / transaction ID"
                        value={payJobId === job.id ? waveRef : ""}
                        onChange={(e) => {
                          setPayJobId(job.id);
                          setWaveRef(e.target.value);
                        }}
                        onFocus={() => setPayJobId(job.id)}
                        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={actingId === job.id}
                        onClick={() => markPaid(job)}
                      >
                        {actingId === job.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "I paid via Wave"
                        )}
                      </Button>
                    </div>
                  )}

                {job.status === "accepted" &&
                  isWorker &&
                  payStatus === "paid" && (
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-sm font-medium">Confirm payment</p>
                      <p className="text-xs text-gray-500">
                        Client reported Wave ref:{" "}
                        <span className="font-mono">
                          {job.payment?.wave_reference || "—"}
                        </span>
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={actingId === job.id}
                        onClick={() => confirmPayment(job)}
                      >
                        {actingId === job.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Confirm I received payment"
                        )}
                      </Button>
                    </div>
                  )}

                {job.status === "accepted" &&
                  isClient &&
                  payStatus === "paid" && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                      Waiting for worker to confirm Wave payment.
                    </p>
                  )}

                <JobWhatsAppButton
                  jobStatus={job.status}
                  paymentStatus={payStatus}
                  otherPhone={job.other_whatsapp}
                  jobTitle={job.title}
                />

                {canComplete && (isWorker || isClient) && (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={actingId === job.id}
                    onClick={() => updateStatus(job.id, "completed")}
                  >
                    Mark completed
                  </Button>
                )}

                {job.status === "accepted" &&
                  fees &&
                  payStatus !== "confirmed" &&
                  payStatus !== "paid" &&
                  isWorker && (
                    <p className="text-xs text-gray-500">
                      Waiting for client to mark Wave payment in the app.
                    </p>
                  )}

                {job.status === "completed" && job.myRating != null && (
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={
                          n <= (job.myRating || 0)
                            ? "h-4 w-4 fill-current"
                            : "h-4 w-4 text-gray-300"
                        }
                      />
                    ))}
                    <span className="text-gray-500 ml-1">You rated</span>
                  </div>
                )}

                {job.status === "completed" && job.myRating == null && (
                  <div className="border-t pt-3 space-y-3">
                    <p className="text-sm font-medium">
                      Rate {isClient ? job.worker_name : job.client_name}
                    </p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setRatingJobId(job.id);
                            setStars(n);
                          }}
                          className="p-1"
                        >
                          <Star
                            className={
                              n <= (ratingJobId === job.id ? stars : 5)
                                ? "h-7 w-7 fill-amber-500 text-amber-500"
                                : "h-7 w-7 text-gray-300"
                            }
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Optional comment..."
                      value={ratingJobId === job.id ? comment : ""}
                      onChange={(e) => {
                        setRatingJobId(job.id);
                        setComment(e.target.value);
                      }}
                      onFocus={() => setRatingJobId(job.id)}
                      className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={submittingRating}
                      onClick={() => submitRating(job)}
                    >
                      {submittingRating && ratingJobId === job.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit rating"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
