"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Star, ShieldCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const AREAS = [
  "All areas",
  "Kololi",
  "Brusubi",
  "Bijilo",
  "Senegambia",
  "Bakau",
  "Fajara",
  "Serrekunda",
  "Kanifing",
  "Brikama",
  "Banjul",
  "Basse",
  "Other",
];

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

      const { data } = await supabase
        .from("profiles")
        .select(
          "id, full_name, location_area, bio, verification_status, availability, avatar_url, created_at"
        )
        .eq("role", "worker")
        .eq("verification_status", "verified")
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
            location_area: p.location_area || "Gambia",
            bio: p.bio || "",
            avatar_url: p.avatar_url || null,
            skills: (skills || []).map((s: any) => s.skill),
            rating,
            rating_count: ratingRows?.length || 0,
            jobs_done: count || 0,
            joined_at: p.created_at || null,
          } as Worker;
        })
      );

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
          Verified skilled people near you
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or skill..."
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
          {AREAS.map((a) => (
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
        <div className="rounded-xl border bg-white py-12 text-center">
          <p className="font-medium">No workers match</p>
          <p className="text-sm text-gray-500 mt-1">Try another area or search</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => (
            <Link key={w.id} href={`/worker/${w.id}`}>
              <div className="rounded-xl border bg-white p-4 hover:border-green-300 transition-colors">
                <div className="flex gap-3">
                  {w.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={w.avatar_url}
                      alt={w.full_name}
                      className="h-14 w-14 rounded-full object-cover border shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg shrink-0">
                      {w.full_name[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-semibold">{w.full_name}</h3>
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {w.location_area}
                        </div>
                        {w.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {w.skills.slice(0, 3).map((s) => (
                              <Badge key={s} variant="secondary">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
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
                            <span className="text-gray-400 text-xs">No ratings</span>
                          )}
                          <span className="text-gray-500">· {w.jobs_done} jobs</span>
                          {w.joined_at && (
                            <span className="text-gray-400">
                              · Joined{" "}
                              {new Date(w.joined_at).toLocaleDateString("en-GB", {
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
