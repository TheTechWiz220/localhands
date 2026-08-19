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
  Search,
  ExternalLink,
  Star,
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

type ListedWorker = {
  id: string;
  full_name: string | null;
  location_area: string | null;
  bio: string | null;
  verification_status: string;
  avatar_url: string | null;
  skills: string[];
  created_at: string | null;
};

type ListedClient = {
  id: string;
  full_name: string | null;
  location_area: string | null;
  avatar_url: string | null;
  created_at: string | null;
  jobs_posted: number;
  jobs_completed: number;
  avg_rating: number;
  rating_count: number;
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
  clientsCount: number;
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
  const [verifiedList, setVerifiedList] = useState<ListedWorker[]>([]);
  const [clientsList, setClientsList] = useState<ListedClient[]>([]);
  const [workerSearch, setWorkerSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [tab, setTab] = useState<
    "overview" | "verify" | "workers" | "clients" | "jobs"
  >("overview");

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

  async function loadVerifiedWorkers() {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, location_area, bio, verification_status, avatar_url, created_at"
      )
      .eq("role", "worker")
      .eq("verification_status", "verified")
      .order("full_name", { ascending: true });

    if (error || !profiles) {
      setVerifiedList([]);
      return;
    }

    const enriched: ListedWorker[] = [];

    for (const p of profiles) {
      const { data: skills } = await supabase
        .from("worker_skills")
        .select("skill")
        .eq("worker_id", p.id);

      enriched.push({
        id: p.id,
        full_name: p.full_name,
        location_area: p.location_area,
        bio: p.bio,
        verification_status: p.verification_status,
        avatar_url: p.avatar_url,
        skills: (skills || []).map((s: any) => s.skill),
        created_at: p.created_at,
      });
    }

    setVerifiedList(enriched);
  }

  async function loadClients() {
    // Clients by role, plus anyone who has posted a job (even if also a worker)
    const { data: byRole } = await supabase
      .from("profiles")
      .select("id, full_name, location_area, avatar_url, created_at, role")
      .eq("role", "client")
      .order("full_name", { ascending: true });

    const { data: jobClients } = await supabase
      .from("job_requests")
      .select("client_id")
      .not("client_id", "is", null);

    const idSet = new Set<string>((byRole || []).map((p: any) => p.id));
    for (const row of jobClients || []) {
      if (row.client_id) idSet.add(row.client_id);
    }

    const ids = Array.from(idSet);
    if (ids.length === 0) {
      setClientsList([]);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, location_area, avatar_url, created_at, role")
      .in("id", ids)
      .neq("role", "admin");

    const enriched: ListedClient[] = [];

    for (const p of profiles || []) {
      const { count: posted } = await supabase
        .from("job_requests")
        .select("id", { count: "exact", head: true })
        .eq("client_id", p.id);

      const { count: completed } = await supabase
        .from("job_requests")
        .select("id", { count: "exact", head: true })
        .eq("client_id", p.id)
        .eq("status", "completed");

      const { data: ratingRows } = await supabase
        .from("ratings")
        .select("rating")
        .eq("to_user_id", p.id);

      let avg = 0;
      const rCount = ratingRows?.length || 0;
      if (rCount > 0) {
        avg =
          Math.round(
            (ratingRows!.reduce(
              (s: number, r: any) => s + (r.rating || 0),
              0
            ) /
              rCount) *
              10
          ) / 10;
      }

      enriched.push({
        id: p.id,
        full_name: p.full_name,
        location_area: p.location_area,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        jobs_posted: posted || 0,
        jobs_completed: completed || 0,
        avg_rating: avg,
        rating_count: rCount,
      });
    }

    enriched.sort((a, b) =>
      (a.full_name || "").localeCompare(b.full_name || "")
    );
    setClientsList(enriched);
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

    const { count: clientsCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "client");

    setJobs(enriched);
    setStats({
      pendingWorkers: pendingWorkers || 0,
      verifiedWorkers: verifiedWorkers || 0,
      clientsCount: clientsCount || 0,
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
    await loadVerifiedWorkers();
    await loadClients();
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
        await loadVerifiedWorkers();
        await loadClients();
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
    await loadVerifiedWorkers();
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

  const filteredVerified = verifiedList.filter((w) => {
    const q = workerSearch.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      w.full_name || "",
      w.location_area || "",
      ...(w.skills || []),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  const filteredClients = clientsList.filter((c) => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return true;
    const hay = [c.full_name || "", c.location_area || ""]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

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

      <div className="flex flex-wrap gap-2 text-sm">
        {(
          [
            ["overview", "Overview"],
            ["verify", "Verify"],
            ["workers", "Workers"],
            ["clients", "Clients"],
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
            {id === "workers" && verifiedList.length > 0 && (
              <span className="ml-1">({verifiedList.length})</span>
            )}
            {id === "clients" && clientsList.length > 0 && (
              <span className="ml-1">({clientsList.length})</span>
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
            <button
              type="button"
              onClick={() => setTab("workers")}
              className="rounded-xl border bg-white p-4 text-left hover:border-green-300 transition"
            >
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Users className="h-3.5 w-3.5" /> Verified workers
              </div>
              <p className="text-2xl font-bold">{stats.verifiedWorkers}</p>
              <p className="text-xs text-amber-700">
                {stats.pendingWorkers} pending · tap to list
              </p>
            </button>
            <button
              type="button"
              onClick={() => setTab("clients")}
              className="rounded-xl border bg-white p-4 text-left hover:border-green-300 transition"
            >
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Users className="h-3.5 w-3.5" /> Clients
              </div>
              <p className="text-2xl font-bold">{stats.clientsCount}</p>
              <p className="text-xs text-gray-500">tap to list</p>
            </button>
            <div className="rounded-xl border bg-white p-4 col-span-2">
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

      {tab === "workers" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Verified workers</h2>
            <Badge variant="success">{verifiedList.length}</Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search name, area, skill..."
              value={workerSearch}
              onChange={(e) => setWorkerSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          {loadingList ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-green-600" />
            </div>
          ) : filteredVerified.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              {verifiedList.length === 0
                ? "No verified workers yet. Approve applicants under Verify."
                : "No match for that search."}
            </p>
          ) : (
            filteredVerified.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border bg-white p-4 space-y-2"
              >
                <div className="flex items-start gap-3">
                  {w.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={w.avatar_url}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-sm font-semibold">
                      {(w.full_name || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {w.full_name || "Unnamed"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {w.location_area || "Area not set"}
                    </p>
                  </div>
                  <Link
                    href={`/worker/${w.id}`}
                    className="text-xs text-green-700 font-medium flex items-center gap-0.5 shrink-0"
                  >
                    Profile <ExternalLink className="h-3 w-3" />
                  </Link>
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

                {w.bio && (
                  <p className="text-xs text-gray-600 line-clamp-2">{w.bio}</p>
                )}

                {w.created_at && (
                  <p className="text-[10px] text-gray-400">
                    Joined {new Date(w.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "clients" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Clients</h2>
            <Badge variant="secondary">{clientsList.length}</Badge>
          </div>
          <p className="text-xs text-gray-400">
            No emails shown. Includes client accounts and anyone who has posted
            a job.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search name or area..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          {loadingList ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-green-600" />
            </div>
          ) : filteredClients.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              {clientsList.length === 0
                ? "No clients yet."
                : "No match for that search."}
            </p>
          ) : (
            filteredClients.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border bg-white p-4 space-y-2"
              >
                <div className="flex items-start gap-3">
                  {c.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.avatar_url}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-semibold">
                      {(c.full_name || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {c.full_name || "Unnamed"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {c.location_area || "Area not set"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                  <span>
                    <strong>{c.jobs_posted}</strong> posted
                  </span>
                  <span>
                    <strong>{c.jobs_completed}</strong> completed
                  </span>
                  {c.rating_count > 0 ? (
                    <span className="flex items-center gap-0.5 text-amber-600">
                      <Star className="h-3 w-3 fill-current" />
                      {c.avg_rating}
                      <span className="text-gray-400">
                        ({c.rating_count})
                      </span>
                    </span>
                  ) : (
                    <span className="text-gray-400">No ratings</span>
                  )}
                </div>

                {c.created_at && (
                  <p className="text-[10px] text-gray-400">
                    Joined {new Date(c.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
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
