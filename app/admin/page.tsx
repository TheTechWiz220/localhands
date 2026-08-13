"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Check,
  X,
  Lock,
  Loader2,
  Briefcase,
  Wallet,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { calcFees, formatGmd, PLATFORM_FEE_PERCENT } from "@/lib/pricing";

type AccessState = "loading" | "denied" | "allowed";

type PendingWorker = {
  id: string;
  full_name: string | null;
  location_area: string | null;
  bio: string | null;
  verification_status: string;
  skills: string[];
  proof_urls: string[];
};

type AdminJob = {
  id: string;
  title: string;
  status: string;
  budget: number | null;
  skill_needed: string;
  location_area: string;
  created_at: string;
  client_name: string;
  worker_name: string;
  payment_status: string | null;
  wave_reference: string | null;
};

type Stats = {
  pendingWorkers: number;
  verifiedWorkers: number;
  jobsPending: number;
  jobsCountered: number;
  jobsAccepted: number;
  jobsCompleted: number;
  feesEarned: number;
  volumeCompleted: number;
};

export default function AdminPage() {
  const [access, setAccess] = useState<AccessState>("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [workers, setWorkers] = useState<PendingWorker[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [tab, setTab] = useState<"overview" | "verify" | "jobs">("overview");

  const supabase = createClient();

  async function loadPending() {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, location_area, bio, verification_status")
      .eq("role", "worker")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: true });

    if (error || !profiles) {
      setWorkers([]);
      return;
    }

    const enriched: PendingWorker[] = [];

    for (const p of profiles) {
      const { data: skills } = await supabase
        .from("worker_skills")
        .select("skill")
        .eq("worker_id", p.id);

      const { data: media } = await supabase
        .from("proof_media")
        .select("media_url")
        .eq("worker_id", p.id)
        .limit(6);

      enriched.push({
        id: p.id,
        full_name: p.full_name,
        location_area: p.location_area,
        bio: p.bio,
        verification_status: p.verification_status,
        skills: (skills || []).map((s: any) => s.skill),
        proof_urls: (media || []).map((m: any) => m.media_url),
      });
    }

    setWorkers(enriched);
  }

  async function loadJobsAndStats() {
    const { data: allJobs, error } = await supabase
      .from("job_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      setErrorMsg(
        error.message.includes("policy") || error.message.includes("permission")
          ? "Cannot load jobs. Run admin-read SQL policies in Supabase."
          : error.message
      );
      setJobs([]);
      return;
    }

    const list = allJobs || [];
    const enriched: AdminJob[] = [];

    let volumeCompleted = 0;
    let feesEarned = 0;
    let jobsPending = 0;
    let jobsCountered = 0;
    let jobsAccepted = 0;
    let jobsCompleted = 0;

    for (const j of list) {
      let client_name = "Client";
      let worker_name = "Worker";

      if (j.client_id) {
        const { data: c } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", j.client_id)
          .maybeSingle();
        if (c?.full_name) client_name = c.full_name;
      }
      if (j.worker_id) {
        const { data: w } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", j.worker_id)
          .maybeSingle();
        if (w?.full_name) worker_name = w.full_name;
      }

      const { data: pay } = await supabase
        .from("payments")
        .select("status, wave_reference, amount")
        .eq("job_id", j.id)
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (j.status === "pending") jobsPending++;
      if (j.status === "countered") jobsCountered++;
      if (j.status === "accepted") jobsAccepted++;
      if (j.status === "completed") {
        jobsCompleted++;
        if (j.budget) {
          volumeCompleted += Number(j.budget);
          feesEarned += calcFees(Number(j.budget)).fee;
        }
      }

      enriched.push({
        id: j.id,
        title: j.title,
        status: j.status,
        budget: j.budget,
        skill_needed: j.skill_needed,
        location_area: j.location_area,
        created_at: j.created_at,
        client_name,
        worker_name,
        payment_status: pay?.status || null,
        wave_reference: pay?.wave_reference || null,
      });
    }

    const { count: pendingWorkers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "worker")
      .eq("verification_status", "pending");

    const { count: verifiedWorkers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "worker")
      .eq("verification_status", "verified");

    setJobs(enriched);
    setStats({
      pendingWorkers: pendingWorkers || 0,
      verifiedWorkers: verifiedWorkers || 0,
      jobsPending,
      jobsCountered,
      jobsAccepted,
      jobsCompleted,
      feesEarned,
      volumeCompleted,
    });
  }

  async function refreshAll() {
    setLoadingList(true);
    setErrorMsg("");
    await loadPending();
    await loadJobsAndStats();
    setLoadingList(false);
  }

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAccess("denied");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        setUserEmail(user.email || profile.full_name || "Admin");
        setAccess("allowed");
        setLoadingList(true);
        await loadPending();
        await loadJobsAndStats();
        setLoadingList(false);
      } else {
        setAccess("denied");
      }
    }

    checkAccess();
  }, []);

  async function setStatus(workerId: string, status: "verified" | "rejected") {
    setActingId(workerId);
    setMessage("");
    setErrorMsg("");

    const { data, error } = await supabase
      .from("profiles")
      .update({
        verification_status: status,
        is_verified: status === "verified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", workerId)
      .select("id, verification_status")
      .maybeSingle();

    setActingId(null);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (!data || data.verification_status !== status) {
      setErrorMsg(
        "Update blocked by RLS. Run the admin update policy in Supabase SQL Editor."
      );
      await loadPending();
      return;
    }

    setMessage(
      status === "verified" ? "Worker approved." : "Worker rejected."
    );
    setWorkers((prev) => prev.filter((w) => w.id !== workerId));
    await loadJobsAndStats();
  }

  function statusBadge(status: string) {
    const map: Record<
      string,
      "default" | "success" | "warning" | "secondary" | "destructive"
    > = {
      pending: "warning",
      countered: "warning",
      accepted: "success",
      completed: "secondary",
      declined: "destructive",
      cancelled: "secondary",
    };
    return (
      <Badge variant={map[status] || "secondary"} className="capitalize">
        {status}
      </Badge>
    );
  }

  if (access === "loading") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
        <p className="text-gray-500">Checking access...</p>
      </div>
    );
  }

  if (access === "denied") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600">
          <Lock className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-gray-500 mt-2">
            Only administrators can access this page.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth">
            <Button>Sign in</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-green-700" />
            Admin
          </h1>
          <p className="text-sm text-gray-500 mt-1">Signed in as {userEmail}</p>
        </div>
        <Button size="sm" variant="outline" onClick={refreshAll} disabled={loadingList}>
          {loadingList ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <div className="flex gap-2 text-sm">
        {(
          [
            ["overview", "Overview"],
            ["verify", "Verify"],
            ["jobs", "Jobs"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-full border ${
              tab === id
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-700"
            }`}
          >
            {label}
            {id === "verify" && workers.length > 0 && (
              <span className="ml-1">({workers.length})</span>
            )}
          </button>
        ))}
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
          {message}
        </p>
      )}
      {errorMsg && (
        <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{errorMsg}</p>
      )}

      {tab === "overview" && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Users className="h-3.5 w-3.5" /> Workers
              </div>
              <p className="text-2xl font-bold">{stats.verifiedWorkers}</p>
              <p className="text-xs text-amber-700">
                {stats.pendingWorkers} pending approval
              </p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Wallet className="h-3.5 w-3.5" /> Fees ({PLATFORM_FEE_PERCENT}%)
              </div>
              <p className="text-2xl font-bold">{formatGmd(stats.feesEarned)}</p>
              <p className="text-xs text-gray-500">
                on {formatGmd(stats.volumeCompleted)} completed volume
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <Briefcase className="h-3.5 w-3.5" /> Jobs (recent load)
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>
                Pending: <strong>{stats.jobsPending}</strong>
              </p>
              <p>
                Countered: <strong>{stats.jobsCountered}</strong>
              </p>
              <p>
                Accepted: <strong>{stats.jobsAccepted}</strong>
              </p>
              <p>
                Completed: <strong>{stats.jobsCompleted}</strong>
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Fees are tracked from completed jobs with a budget. Collect platform
            fee manually until Wave business API is connected.
          </p>
        </div>
      )}

      {tab === "verify" && (
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Pending Applications</h2>
            <Badge variant="warning">{workers.length} waiting</Badge>
          </div>

          {loadingList ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-green-600" />
            </div>
          ) : workers.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No pending workers right now.
            </p>
          ) : (
            <div className="space-y-4">
              {workers.map((w) => (
                <div key={w.id} className="border rounded-lg p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold">
                      {w.full_name || "Unnamed worker"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {w.location_area || "Area not set"}
                    </p>
                    {w.bio && (
                      <p className="text-sm text-gray-600 mt-1">{w.bio}</p>
                    )}
                  </div>

                  {w.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {w.skills.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {w.proof_urls.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Proof of work</p>
                      <div className="grid grid-cols-3 gap-2">
                        {w.proof_urls.map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt={`Proof ${i + 1}`}
                            className="aspect-square object-cover rounded-lg border"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={actingId === w.id}
                      onClick={() => setStatus(w.id, "verified")}
                    >
                      {actingId === w.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      disabled={actingId === w.id}
                      onClick={() => setStatus(w.id, "rejected")}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "jobs" && (
        <div className="space-y-3">
          <h2 className="font-semibold">Recent jobs</h2>
          {loadingList ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-green-600" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              No jobs loaded. If you expected data, run admin read policies in
              Supabase.
            </p>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="rounded-xl border bg-white p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm">{j.title}</h3>
                    <p className="text-xs text-gray-500">
                      {j.client_name} → {j.worker_name} · {j.location_area}
                    </p>
                  </div>
                  {statusBadge(j.status)}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{j.skill_needed}</Badge>
                  {j.budget != null && (
                    <span className="px-2 py-0.5 bg-green-50 text-green-800 rounded">
                      {formatGmd(j.budget)}
                    </span>
                  )}
                  {j.budget != null && j.status === "completed" && (
                    <span className="px-2 py-0.5 bg-gray-50 rounded">
                      Fee {formatGmd(calcFees(j.budget).fee)}
                    </span>
                  )}
                  {j.payment_status && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded capitalize">
                      Pay: {j.payment_status}
                    </span>
                  )}
                </div>
                {j.wave_reference && (
                  <p className="text-xs text-gray-500 font-mono">
                    Wave: {j.wave_reference}
                  </p>
                )}
                <p className="text-[10px] text-gray-400">
                  {new Date(j.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
