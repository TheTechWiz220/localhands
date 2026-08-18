"use client";

import { Star } from "lucide-react";

type Props = {
  avgRating?: number;
  ratingCount?: number;
  jobsDone?: number;
  memberSince?: string | null;
};

export function ClientTrustLine({
  avgRating = 0,
  ratingCount = 0,
  jobsDone = 0,
  memberSince,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600 bg-white/80 rounded-lg px-3 py-2 border border-green-100">
      {ratingCount > 0 ? (
        <span className="flex items-center gap-0.5 text-amber-600 font-medium">
          <Star className="h-3 w-3 fill-current" />
          {avgRating}
          <span className="text-gray-400 font-normal">({ratingCount})</span>
        </span>
      ) : (
        <span className="text-gray-400">No ratings yet</span>
      )}
      <span className="text-gray-300">·</span>
      <span>{jobsDone} jobs done</span>
      {memberSince && (
        <>
          <span className="text-gray-300">·</span>
          <span>
            Joined{" "}
            {new Date(memberSince).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })}
          </span>
        </>
      )}
    </div>
  );
}
