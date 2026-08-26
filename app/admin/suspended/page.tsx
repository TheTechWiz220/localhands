"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Worker = {
  id: string;
  full_name: string | null;
  location_area: string | null;
  avatar_url: string | null;
  skills: string[];
};

export default function SuspendedWorkersPage() {
  const supabase = createClient();
  const [access, setAccess] = useState<"loading" | "denied" | "allowed">("loading");
  const [list, setList] = useState<Worker[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, location_area, avatar_url")
      .eq("role", "worker")
      .eq("verification_status", "suspended")
      .order("full_name", { ascending: true });

    if (!profiles) {
      setList([]);
      setLoading(false);
      return;
    }

    const enriched: Worker[] = [];
    for (const p of profiles) {
      const { data: skills } = await supabase
        .from("worker_skills")
        .select("skill")
        .eq("worker_id", p.id);
      enriched.push({
        id: p.id,
        full_name: p.full_name,
        location_area: p.location_area,
        avatar_url: p.avatar_url,
        skills: (skills || []).map((s: { skill: string }) => s.skill),
      });
    }
    setList(enriched);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
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
      await load();
    }
    init();
  }, []);

  async function reApprove(workerId: string) {
    const ok = window.confirm(
      "Re-approve this worker? They will appear in Find again as verified."
    );
    if (!ok) return;

    setActingId(workerId);
    setMessage("");
    setErrorMsg("");

    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "verified",
        is_verified: true,
        id_verified: true,
        id_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", workerId);

    setActingId(null);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setMessage("Worker re-approved. They appear in Find again.");
    setList((prev) => prev.filter((w) => w.id !== workerId));
  }

  if (access === "loading") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
      </div>
    );
  }

  if (access === "denied") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold">Access Denied</h1>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-green-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1">Suspended workers</h1>
        <Badge variant="secondary">{list.length}</Badge>
      </div>

      <p className="text-sm text-gray-600">
        Workers whose verification was removed. Re-approve to put them back in
        Find without using Supabase.
      </p>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
          {message}
        </p>
      )}
      {errorMsg && (
        <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{errorMsg}</p>
      )}

      {loading ? (
        <div className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-green-600" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No suspended workers. Remove verification from Admin → Workers to
          suspend someone.
        </p>
      ) : (
        list.map((w) => (
          <div
            key={w.id}
            className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 space-y-2"
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
                <div className="h-11 w-11 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-sm font-semibold">
                  {(w.full_name || "?")[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {w.full_name || "Unnamed"}
                </h3>
                <p className="text-xs text-gray-500">
                  {w.location_area || "Area not set"} · Suspended
                </p>
              </div>
              <Link
                href={`/workers/${w.id}`}
                className="text-xs text-green-700 flex items-center gap-0.5 shrink-0"
              >
                Profile <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            {w.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {w.skills.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-white border text-gray-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            <Button
              size="sm"
              className="w-full bg-green-700 hover:bg-green-800"
              disabled={actingId === w.id}
              onClick={() => reApprove(w.id)}
            >
              {actingId === w.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-1" /> Re-approve
                </>
              )}
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
