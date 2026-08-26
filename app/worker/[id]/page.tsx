import { MapPin, Star, ShieldCheck, MessageCircle, Briefcase, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { workers as fallbackWorkers } from "@/lib/data";
import { publicReviewerLabel } from "@/lib/privacy";
import { ProofGallery } from "@/components/image-lightbox";

export default async function WorkerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let worker: any = null;
  let proofUrls: string[] = [];
  let reviews: {
    rating: number;
    comment: string | null;
    from_name: string;
    created_at: string;
  }[] = [];
  let avgRating = 0;
  let ratingCount = 0;
  let jobsDone = 0;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, location_area, bio, verification_status, availability, avatar_url, created_at, id_verified"
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

    const { data: ratingRows } = await supabase
      .from("ratings")
      .select("rating, comment, created_at, from_user_id")
      .eq("to_user_id", id)
      .order("created_at", { ascending: false });

    if (ratingRows && ratingRows.length > 0) {
      ratingCount = ratingRows.length;
      avgRating =
        Math.round(
          (ratingRows.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) /
            ratingCount) *
            10
        ) / 10;

      for (const r of ratingRows) {
        reviews.push({
          rating: r.rating,
          comment: r.comment,
          from_name: publicReviewerLabel(),
          created_at: r.created_at,
        });
      }
    }

    const { count } = await supabase
      .from("job_requests")
      .select("id", { count: "exact", head: true })
      .eq("worker_id", id)
      .eq("status", "completed");

    jobsDone = count || 0;

    worker = {
      id: profile.id,
      full_name: profile.full_name || "Worker",
      location_area: profile.location_area || "Gambia",
      bio: profile.bio || "No bio yet.",
      avatar_url: profile.avatar_url || null,
      skills: (skills || []).map((s: any) => s.skill),
      verification_status: profile.verification_status,
      id_verified: !!(profile as any).id_verified,
      joined_at: profile.created_at || null,
    };
    proofUrls = (media || []).map((m: any) => m.media_url);
  } else {
    worker = fallbackWorkers.find((w) => w.id === id) || fallbackWorkers[0];
    avgRating = worker.rating || 0;
    jobsDone = worker.jobs_done || 0;
  }

  const isVerified = worker.verification_status === "verified";
  const isSuspended = worker.verification_status === "suspended";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {isSuspended && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <Ban className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">
              Account suspended
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              This worker is not available for new jobs until LocalHands
              re-approves their verification.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-4 items-center">
        {worker.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={worker.avatar_url}
            alt={worker.full_name}
            className={`h-20 w-20 rounded-full object-cover border shrink-0 ${
              isSuspended ? "opacity-70 grayscale" : ""
            }`}
          />
        ) : (
          <div
            className={`h-20 w-20 rounded-full flex items-center justify-center font-bold text-2xl shrink-0 ${
              isSuspended
                ? "bg-amber-100 text-amber-800"
                : "bg-green-100 text-green-700"
            }`}
          >
            {worker.full_name[0]}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{worker.full_name}</h1>
            {isVerified && (
              <>
                <Badge variant="success">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 inline" />
                  Verified
                </Badge>
                {worker.id_verified && (
                  <Badge variant="secondary">ID checked</Badge>
                )}
              </>
            )}
            {isSuspended && (
              <Badge variant="warning">
                <Ban className="h-3.5 w-3.5 mr-1 inline" />
                Suspended
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-gray-500 mt-1">
            <MapPin className="h-4 w-4 shrink-0" />
            {worker.location_area}
          </div>
          <div className="flex items-center gap-x-2 gap-y-1 mt-2 text-sm flex-wrap">
            {ratingCount > 0 ? (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <Star className="h-4 w-4 fill-current" />
                {avgRating}
                <span className="text-gray-400 font-normal">
                  ({ratingCount})
                </span>
              </span>
            ) : (
              <span className="text-gray-400">No ratings yet</span>
            )}
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1 text-gray-500">
              <Briefcase className="h-3.5 w-3.5" />
              {jobsDone} jobs completed
            </span>
            {worker.joined_at && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-400">
                  Joined{" "}
                  {new Date(worker.joined_at).toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {isSuspended ? (
          <Button className="flex-1" disabled title="Worker is suspended">
            Not available
          </Button>
        ) : (
          <Link href={`/request/${worker.id}`} className="flex-1">
            <Button className="w-full">Request this person</Button>
          </Link>
        )}
        <Button
          variant="outline"
          size="icon"
          disabled
          title="Chat after job is accepted"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>

      {worker.skills?.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {worker.skills.map((s: string) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-2">About</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{worker.bio}</p>
      </div>

      {proofUrls.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Proof of work</h2>
          <p className="text-xs text-gray-500 mb-2">Tap a photo to enlarge</p>
          <ProofGallery urls={proofUrls} />
        </div>
      )}

      {reviews.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Reviews</h2>
          <div className="space-y-3">
            {reviews.map((r, i) => (
              <div key={i} className="rounded-lg border bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-amber-600">
                    {Array.from({ length: 5 }).map((_, n) => (
                      <Star
                        key={n}
                        className={
                          n < r.rating
                            ? "h-3.5 w-3.5 fill-current"
                            : "h-3.5 w-3.5 text-gray-300"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-sm text-gray-600 mt-1.5">{r.comment}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{r.from_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
