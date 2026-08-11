import { MapPin, Star, ShieldCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { workers as fallbackWorkers } from "@/lib/data";

export default async function WorkerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let worker: any = null;
  let proofUrls: string[] = [];

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, location_area, bio, verification_status, availability, avatar_url"
    )
    .eq("id", id)
    .maybeSingle();

  if (profile) {
    const { data: skills } = await supabase
      .from("worker_skills")
      .select("skill")
      .eq("worker_id", id);

    const { data: media } = await supabase
      .from("proof_media")
      .select("media_url")
      .eq("worker_id", id)
      .order("created_at", { ascending: false });

    worker = {
      id: profile.id,
      full_name: profile.full_name || "Worker",
      location_area: profile.location_area || "Gambia",
      bio: profile.bio || "No bio yet.",
      avatar_url: profile.avatar_url || null,
      skills: (skills || []).map((s: any) => s.skill),
      rating: 0,
      jobs_done: 0,
      verification_status: profile.verification_status,
    };
    proofUrls = (media || []).map((m: any) => m.media_url);
  } else {
    worker = fallbackWorkers.find((w) => w.id === id) || fallbackWorkers[0];
  }

  const isVerified = worker.verification_status === "verified";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex gap-4 items-start">
        {worker.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={worker.avatar_url}
            alt={worker.full_name}
            className="h-20 w-20 rounded-full object-cover border"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-2xl">
            {worker.full_name[0]}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{worker.full_name}</h1>
            {isVerified && (
              <Badge variant="success">
                <ShieldCheck className="h-3.5 w-3.5 mr-1 inline" />
                Verified
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-gray-500 mt-1">
            <MapPin className="h-4 w-4" />
            {worker.location_area}
          </div>
          {worker.rating > 0 && (
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <Star className="h-4 w-4 fill-current" />
                {worker.rating}
              </span>
              <span className="text-gray-500">{worker.jobs_done} jobs completed</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href={`/request/${worker.id}`} className="flex-1">
          <Button className="w-full">Request this person</Button>
        </Link>
        <Button variant="outline" size="icon" disabled>
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h3 className="font-semibold mb-2">About</h3>
        <p className="text-sm text-gray-600">{worker.bio}</p>
      </div>

      {worker.skills?.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {worker.skills.map((s: string) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white p-4">
        <h3 className="font-semibold mb-2">Proof of Work</h3>
        {proofUrls.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {proofUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Proof ${i + 1}`}
                className="aspect-square object-cover rounded-lg border"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400"
                >
                  Photo {i}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              No proof photos uploaded yet.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
