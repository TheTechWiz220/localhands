"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  Lock,
  Loader2,
  Users,
  CheckCircle2,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  PendingWorkerCard,
  type PendingWorker,
} from "@/components/admin/PendingWorkerCard";
import {
  VerifiedWorkerCard,
  type ListedWorker,
} from "@/components/admin/VerifiedWorkerCard";
import SuspendedPanel from "@/components/admin/SuspendedPanel";

type AccessState = "loading" | "denied" | "allowed";
type Tab = "overview" | "verify" | "workers" | "suspended";

type Stats = {
  pendingWorkers: number;
  verifiedWorkers: number;
  suspendedWorkers: number;
};

export default function AdminPage() {
  const [access, setAccess] = useState<AccessState>("loading");
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [workers, setWorkers] = useState<PendingWorker[]>([]);
  const [verifiedList, setVerifiedList] = useState<ListedWorker[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [idChecked, setIdChecked] = useState<Record<string, boolean>>({});
  const [actingId, setActingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const supabase = createClient();

  const loadStats = useCallback(async () => {
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
    const { count: suspendedWorkers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "worker")
      .eq("verification_status", "suspended");
    setStats({
      pendingWorkers: pendingWorkers || 0,
      verifiedWorkers: verifiedWorkers || 0,
      suspendedWorkers: suspendedWorkers || 0,
    });
  }, [supabase]);

  const loadPending = useCallback(async () => {
    setLoadingList(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, location_area, bio, verification_status, avatar_url")
      .eq("role", "worker")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: true });

    if (error || !profiles) {
      setWorkers([]);
      setLoadingList(false);
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
        avatar_url: p.avatar_url || null,
        skills: (skills || []).map((s: { skill: string }) => s.skill),
        proof_urls: (media || []).map((m: { media_url: string }) => m.media_url),
      });
    }
    setWorkers(enriched);
    setLoadingList(false);
  }, [supabase]);

  const loadVerified = useCallback(async () => {
    setLoadingList(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, location_area, bio, verification_status, avatar_url, created_at, id_verified"
      )
      .eq("role", "worker")
      .eq("verification_status", "verified")
      .order("created_at", { ascending: false });

    if (error || !profiles) {
      setVerifiedList([]);
      setLoadingList(false);
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
        skills: (skills || []).map((s: { skill: string }) => s.skill),
        created_at: p.created_at,
        id_verified: p.id_verified,
      });
    }
    setVerifiedList(enriched);
    setLoadingList(false);
  }, [supabase]);

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAccess("denied");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "admin") {
        setAccess("denied");
        return;
      }
      setAccess("allowed");
      await loadStats();
    }
    check();
  }, [supabase, loadStats]);

  useEffect(() => {
    if (access !== "allowed") return;
    if (tab === "verify") loadPending();
    if (tab === "workers") loadVerified();
    if (tab === "overview") loadStats();
  }, [access, tab, loadPending, loadVerified, loadStats]);

  async function setStatus(workerId: string, status: "verified" | "rejected") {
    setActingId(workerId);
    setErrorMsg("");
    const payload: Record<string, unknown> = {
      verification_status: status,
      updated_at: new Date().toISOString(),
    };
    if (status === "verified") {
      payload.is_verified = true;
      payload.id_verified = true;
    }
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", workerId);
    if (error) {
      setErrorMsg(error.message);
      setActingId(null);
      return;
    }
    setWorkers((prev) => prev.filter((w) => w.id !== workerId));
    setActingId(null);
    await loadStats();
  }

  async function removeVerification(workerId: string) {
    setActingId(workerId);
    setErrorMsg("");
    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "pending",
        is_verified: false,
        id_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workerId);
    if (error) {
      setErrorMsg(error.message);
      setActingId(null);
      return;
    }
    setVerifiedList((prev) => prev.filter((w) => w.id !== workerId));
    setActingId(null);
    await loadStats();
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
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <Lock className="h-10 w-10 mx-auto text-red-500" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-green-700" />
        Admin
      </h1>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(
          [
            ["overview", "Overview"],
            ["verify", "Verify"],
            ["workers", "Workers"],
            ["suspended", "Suspended"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === id
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {label}
            {id === "verify" && stats && stats.pendingWorkers > 0 && (
              <span className="ml-1">({stats.pendingWorkers})</span>
            )}
            {id === "workers" && stats && stats.verifiedWorkers > 0 && (
              <span className="ml-1">({stats.verifiedWorkers})</span>
            )}
            {id === "suspended" && stats && stats.suspendedWorkers > 0 && (
              <span className="ml-1">({stats.suspendedWorkers})</span>
            )}
          </button>
        ))}
      </div>

      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTab("verify")}
            className="rounded-xl border bg-white p-4 text-left hover:border-green-300 transition"
          >
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Users className="h-3.5 w-3.5" /> Pending
            </div>
            <p className="text-2xl font-bold">{stats.pendingWorkers}</p>
            <p className="text-xs text-gray-500">tap to review</p>
          </button>
          <button
            type="button"
            onClick={() => setTab("workers")}
            className="rounded-xl border bg-white p-4 text-left hover:border-green-300 transition"
          >
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified
            </div>
            <p className="text-2xl font-bold">{stats.verifiedWorkers}</p>
            <p className="text-xs text-gray-500">tap to list</p>
          </button>
          <Link
            href="/admin/testing"
            className="rounded-xl border bg-white p-4 col-span-2 hover:border-green-300 transition"
          >
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Briefcase className="h-3.5 w-3.5" /> Testing
            </div>
            <p className="text-sm font-medium">Campaigns, claims, reports</p>
          </Link>
        </div>
      )}

      {tab === "verify" && (
        <div className="rounded-xl border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Pending Applications</h2>
            <Badge variant="secondary">{workers.length} waiting</Badge>
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
            workers.map((w) => (
              <PendingWorkerCard
                key={w.id}
                worker={w}
                idChecked={!!idChecked[w.id]}
                acting={actingId === w.id}
                onIdCheck={(checked) =>
                  setIdChecked((prev) => ({ ...prev, [w.id]: checked }))
                }
                onApprove={() => setStatus(w.id, "verified")}
                onReject={() => setStatus(w.id, "rejected")}
              />
            ))
          )}
        </div>
      )}

      {tab === "workers" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Verified workers</h2>
            <Badge variant="secondary">{verifiedList.length}</Badge>
          </div>
          {loadingList ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-green-600" />
            </div>
          ) : verifiedList.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No verified workers yet.
            </p>
          ) : (
            verifiedList.map((w) => (
              <VerifiedWorkerCard
                key={w.id}
                worker={w}
                acting={actingId === w.id}
                onRemoveVerification={() => removeVerification(w.id)}
              />
            ))
          )}
        </div>
      )}

      {tab === "suspended" && <SuspendedPanel />}

      <Link href="/">
        <Button variant="outline" className="w-full">
          Back to app
        </Button>
      </Link>
    </div>
  );
}
