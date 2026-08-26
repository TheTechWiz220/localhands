"use client";

import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProofOfWorkBlock } from "@/components/admin/ProofOfWorkBlock";

export type PendingWorker = {
  id: string;
  full_name: string | null;
  location_area: string | null;
  bio: string | null;
  verification_status: string;
  skills: string[];
  proof_urls: string[];
};

type Props = {
  worker: PendingWorker;
  idChecked: boolean;
  acting: boolean;
  onIdCheck: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
};

export function PendingWorkerCard({
  worker: w,
  idChecked,
  acting,
  onIdCheck,
  onApprove,
  onReject,
}: Props) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div>
        <h3 className="font-semibold">{w.full_name || "Unnamed worker"}</h3>
        <p className="text-sm text-gray-500">{w.location_area || "Area not set"}</p>
        {w.bio && <p className="text-sm text-gray-600 mt-1">{w.bio}</p>}
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

      <ProofOfWorkBlock urls={w.proof_urls} />

      <label className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 cursor-pointer">
        <input
          type="checkbox"
          checked={idChecked}
          onChange={(e) => onIdCheck(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
        />
        <span className="text-xs text-gray-700 leading-snug">
          <strong>ID verified in person</strong> — I checked a valid national ID
          or passport and the photo matches this applicant. Worker is 18+.
        </span>
      </label>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1"
          disabled={acting || !idChecked}
          onClick={onApprove}
        >
          {acting ? (
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
          disabled={acting}
          onClick={onReject}
        >
          <X className="h-4 w-4 mr-1" /> Reject
        </Button>
      </div>
    </div>
  );
}
