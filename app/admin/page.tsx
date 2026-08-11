"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Check, X, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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

export default function AdminPage() {
  const [access, setAccess] = useState<AccessState>("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [workers, setWorkers] = useState<PendingWorker[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();

  async function loadPending() {
    setLoadingList(true);

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, location_area, bio, verification_status")
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
        skills: (skills || []).map((s: any) => s.skill),
        proof_urls: (media || []).map((m: any) => m.media_url),
      });
    }

    setWorkers(enriched);
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
        await loadPending();
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

    // Select after update to confirm RLS allowed the change
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

    // RLS often returns no error but also no row when blocked
    if (!data || data.verification_status !== status) {
      setErrorMsg(
        "Update blocked by database security (RLS). Run the admin update policy in Supabase SQL Editor, then try again."
      );
      await loadPending();
      return;
    }

    setMessage(
      status === "verified" ? "Worker approved." : "Worker rejected."
    );
    setWorkers((prev) => prev.filter((w) => w.id !== workerId));
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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-green-700" />
          Admin – Verification
        </h1>
        <p className="text-sm text-gray-500 mt-1">Signed in as {userEmail}</p>
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
          {message}
        </p>
      )}
      {errorMsg && (
        <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{errorMsg}</p>
      )}

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
    </div>
  );
}
