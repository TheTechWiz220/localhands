"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type RejectedWorker = {
  id: string;
  full_name: string | null;
  location_area: string | null;
  bio: string | null;
  avatar_url: string | null;
  updated_at: string;
  skills: string[];
};

export default function RejectedPanel() {
  const supabase = createClient();
  const [list, setList] = useState<RejectedWorker[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, location_area, bio, avatar_url, updated_at")
      .eq("role", "worker")
      .eq("verification_status", "rejected")
      .order("updated_at", { ascending: false });

    if (!profiles) {
      setList([]);
      setLoading(false);
      return;
    }

    const enriched: RejectedWorker[] = [];
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
        avatar_url: p.avatar_url,
        updated_at: p.updated_at,
        skills: (skills || []).map((s: { skill: string }) => s.skill),
      });
    }

    setList(enriched);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function resetToClient(workerId: string, workerName: string | null) {
    const ok = window.confirm(
      `Reset ${workerName || "this account"} to Client? This clears the worker verification state, worker skills, proof photos, certificates, and worker profile details so the account can apply again. The login, name and area remain.`
    );
    if (!ok) return;

    setActingId(workerId);
    setMessage("");
    setErrorMsg("");

    try {
      const response = await fetch("/api/admin/reset-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Reset failed.");
      }

      setActingId(null);
      setMessage(
        result.storageWarning
          ? "Account reset to Client. Profile data was cleared, but some old media could not be removed from Storage."
          : "Account reset to Client. Worker profile data and media were cleared; it can now use Apply as Worker again."
      );
      setList((prev) => prev.filter((w) => w.id !== workerId));
    } catch (err: any) {
      setActingId(null);
      setErrorMsg(err?.message || "Reset failed.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Rejected applications</h2>
        <Badge variant="secondary">{list.length}</Badge>
      </div>

      <p className="text-xs text-gray-500">
        Applications rejected by an admin. Reset an account to Client when you want the person to apply again.
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
        <p className="text-sm text-gray-500 text-center py-6">
          No rejected applications.
        </p>
      ) : (
        list.map((w) => (
          <div key={w.id} className="rounded-xl border border-red-100 bg-red-50/40 p-4 space-y-3">
            <div className="flex items-start gap-3">
              {w.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={w.avatar_url}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover border"
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-red-100 text-red-900 flex items-center justify-center text-sm font-semibold">
                  {(w.full_name || "?")[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{w.full_name || "Unnamed"}</h3>
                <p className="text-xs text-gray-500">
                  {w.location_area || "Area not set"} · Rejected
                </p>
              </div>
              <Link
                href={`/workers/${w.id}`}
                className="text-xs text-green-700 flex items-center gap-0.5 shrink-0"
              >
                Profile <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {w.bio && (
              <p className="text-sm text-gray-600 line-clamp-2">{w.bio}</p>
            )}

            {w.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {w.skills.map((s) => (
                  <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-white border text-gray-700">
                    {s}
                  </span>
                ))}
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              className="w-full border-blue-300 text-blue-800 hover:bg-blue-50"
              disabled={actingId === w.id}
              onClick={() => resetToClient(w.id, w.full_name)}
            >
              {actingId === w.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset to Client
                </>
              )}
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
