"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { RemoveVerificationButton } from "@/components/admin/RemoveVerificationButton";

export type ListedWorker = {
  id: string;
  full_name: string | null;
  location_area: string | null;
  bio: string | null;
  verification_status: string;
  avatar_url: string | null;
  skills: string[];
  created_at: string | null;
  id_verified?: boolean;
};

type Props = {
  worker: ListedWorker;
  acting: boolean;
  onRemoveVerification: () => void;
};

export function VerifiedWorkerCard({
  worker: w,
  acting,
  onRemoveVerification,
}: Props) {
  return (
    <div className="rounded-xl border bg-white p-4 space-y-2">
      <div className="flex items-start gap-3">
        {w.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={w.avatar_url}
            alt=""
            className="h-11 w-11 rounded-full object-cover border"
          />
        ) : (
          <div className="h-11 w-11 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-sm font-semibold">
            {(w.full_name || "?")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {w.full_name || "Unnamed"}
          </h3>
          <p className="text-xs text-gray-500">
            {w.location_area || "Area not set"}
            {w.id_verified ? " · ID checked" : ""}
          </p>
        </div>
        <Link
          href={`/worker/${w.id}`}
          className="text-xs text-green-700 font-medium flex items-center gap-0.5 shrink-0"
        >
          Profile <ExternalLink className="h-3 w-3" />
        </Link>
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

      {w.bio && <p className="text-xs text-gray-600 line-clamp-2">{w.bio}</p>}

      {w.created_at && (
        <p className="text-[10px] text-gray-400">
          Joined {new Date(w.created_at).toLocaleDateString()}
        </p>
      )}

      <RemoveVerificationButton busy={acting} onRemove={onRemoveVerification} />
    </div>
  );
}
