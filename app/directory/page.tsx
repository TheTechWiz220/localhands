import { Search, MapPin, Star, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { workers as fallbackWorkers } from "@/lib/data";

export default async function DirectoryPage() {
  let workers = fallbackWorkers;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, full_name, location_area, bio, verification_status, availability"
      )
      .eq("role", "worker")
      .eq("verification_status", "verified")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const withSkills = await Promise.all(
        data.map(async (p: any) => {
          const { data: skills } = await supabase
            .from("worker_skills")
            .select("skill")
            .eq("worker_id", p.id);

          return {
            id: p.id,
            full_name: p.full_name || "Worker",
            location_area: p.location_area || "Gambia",
            bio: p.bio || "",
            skills: (skills || []).map((s: any) => s.skill),
            rating: 0,
            jobs_done: 0,
            availability: p.availability || "available",
            verification_status: p.verification_status,
          };
        })
      );
      workers = withSkills;
    }
  } catch {
    // keep fallback demo workers
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find a Worker</h1>
        <p className="text-sm text-gray-500 mt-1">
          Verified skilled people near you
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search skills or name..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      <p className="text-sm text-gray-500">{workers.length} verified workers</p>

      <div className="space-y-4">
        {workers.map((w) => (
          <Link key={w.id} href={`/worker/${w.id}`}>
            <div className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow">
              <div className="flex gap-3">
                <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                  {w.full_name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{w.full_name}</h3>
                    <Badge variant="success" className="text-[10px]">
                      <ShieldCheck className="h-3 w-3 mr-0.5 inline" />
                      Verified
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {w.location_area}
                  </div>
                  {w.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {w.skills.slice(0, 3).map((s: string) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {w.rating > 0 && (
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      <span className="flex items-center gap-0.5 text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {w.rating}
                      </span>
                      <span className="text-gray-500">· {w.jobs_done} jobs</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
