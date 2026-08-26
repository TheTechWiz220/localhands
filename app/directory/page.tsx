"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Star, ShieldCheck, Loader2, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AREA_FILTERS } from "@/lib/skills";

type Worker = {
  id: string;
  full_name: string;
  location_area: string;
  bio: string;
  avatar_url: string | null;
  skills: string[];
  rating: number;
  rating_count: number;
  jobs_done: number;
  joined_at: string | null;
  id_verified?: boolean;
  verification_status: string;
};

export default function DirectoryPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All areas");

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Show verified + suspended so the public can see suspension status
      const { data } = await supabase
        .from("profiles")
        .select(
          "id, full_name, location_area, bio, verification_status, availability, avatar_url, created_at, id_verified"
        )
        .eq("role", "worker")
        .in("verification_status", ["verified", "suspended"])
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) {
        setWorkers([]);
        setLoading(false);
        return;
      }

      const withSkills = await Promise.all(
        data.map(async (p: any) => {
          const { data: skills } = await supabase
            .from("worker_skills")
            .select("skill")
            .eq("worker_id", p.id);

          const { data: ratingRows } = await supabase
            .from("ratings")
            .select("rating")
            .eq("to_user_id", p.id);

          let rating = 0;
          if (ratingRows && ratingRows.length > 0) {
            rating =
              Math.round(
                (ratingRows.reduce(
                  (sum: number, r: any) => sum + (r.rating || 0),
                  0
                ) /
                  ratingRows.length) *
                  10
              ) / 10;
          }

          const { count } = await supabase
            .from("job_requests")
            .select("id", { count: "exact", head: true })
            .eq("worker_id", p.id)
            .eq("status", "completed");

          return {
            id: p.id,
            full_name: p.full_name || "Worker",
            id_verified: !!(p as any).id_verified,
            location_area: p.location_area || "The Gambia",
            bio: p.bio || "",
            avatar_url: p.avatar_url || null,
            skills: (skills || []).map((s: any) => s.skill),
            rating,
            rating_count: ratingRows?.length || 0,
            jobs_done: count || 0,
            joined_at: p.created_at || null,
            verification_status: p.verification_status || "verified",
          } as Worker;
        })
      );

      // Verified first, suspended at the bottom
      withSkills.sort((a, b) => {
        if (a.verification_status === b.verification_status) return 0;
        if (a.verification_status === "verified") return -1;
        return 1;
      });

      setWorkers(withSkills);
      setLoading(false);
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return workers.filter((w) => {
      const areaOk =
        area === "All areas" ||
        w.location_area.toLowerCase() === area.toLowerCase();
      if (!areaOk) return false;
      if (!q) return true;
      const inName = w.full_name.toLowerCase().includes(q);
      const inSkill = w.skills.some((s) => s.toLowerCase().includes(q));
      const inBio = w.bio.toLowerCase().includes(q);
      return inName || inSkill || inBio;
    });
  }, [workers, query, area]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find a Worker</h1>
        <p className="text-sm text-gray-500 mt-1">
          Verified skilled people across Greater Banjul and beyond
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or skill (e.g. solar, phone repair)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
        >
          {AREA_FILTERS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-3" />
          <p className="text-gray-500 text-sm">Loading workers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-white py-12 text-center px-4">
          <p className="font-medium">No workers match yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Try another area, or post a job so verified workers can claim it.
          </p>
          <Link
            href="/post-job"
            className="inline-block mt-3 text-sm text-green-700 font-medium hover:underline"
          >
            Post a job →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => {
            const isSuspended = w.verification_status === "suspended";
            return (
              <Link key={w.id} href={`/worker/${w.id}`}>
                <div
                  className={`rounded-xl border p-4 transition-colors ${
                    isSuspended
                      ? "bg-amber-50/50 border-amber-200 hover:border-amber-300"
                      : "bg-white hover:border-green-300"
                  }`}
                >
                  <div className="flex gap-3 items-center">
                    {w.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={w.avatar_url}
                        alt={w.full_name}
                        className={`h-14 w-14 rounded-full object-cover border shrink-0 ${
                          isSuspended ? "opacity-70 grayscale" : ""
                        }`}
                      />
                    ) : (
                      <div
                        className={`h-14 w-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                          isSuspended
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {w.full_name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3
                          className={`font-semibold ${
                            isSuspended ? "text-gray-700" : ""
                          }`}
                        >
                          {w.full_name}
                        </h3>
                        {isSuspended ? (
                          <Badge
                            variant="warning"
                            className="text-[10px] px-1.5 py-0 gap-0.5"
                          >
                            <Ban className="h-3 w-3" />
                            Suspended
                          </Badge>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                            {w.id_verified && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                ID checked
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {w.location_area}
                      </div>
                      {isSuspended && (
                        <p className="text-xs text-amber-700 mt-1">
                          Not available for new jobs until re-approved
                        </p>
                      )}
                      {!isSuspended && w.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {w.skills.slice(0, 3).map((s) => (
                            <Badge key={s} variant="secondary">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {!isSuspended && (
                        <div className="flex items-center gap-2 mt-1 text-sm flex-wrap">
                          {w.rating > 0 ? (
                            <span className="flex items-center gap-0.5 text-amber-600">
                              <Star className="h-3.5 w-3.5 fill-current" />
                              {w.rating}
                              {w.rating_count > 0 && (
                                <span className="text-gray-400">
                                  ({w.rating_count})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              No ratings yet
                            </span>
                          )}
                          <span className="text-gray-500">
                            · {w.jobs_done} jobs
                          </span>
                          {w.joined_at && (
                            <span className="text-gray-400">
                              · Joined{" "}
                              {new Date(w.joined_at).toLocaleDateString(
                                "en-GB",
                                {
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
