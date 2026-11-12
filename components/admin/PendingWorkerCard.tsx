"use client";

import { Check, X, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProofOfWorkBlock } from "@/components/admin/ProofOfWorkBlock";
import { cohortLabel } from "@/lib/cohort";

export type PendingWorker = {
  id: string;
  full_name: string | null;
  location_area: string | null;
  bio: string | null;
  verification_status: string;
  avatar_url: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  skills: string[];
  proof_urls: string[];
  cohort_source?: string | null;
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
      <div className="flex items-start gap-3">
        {w.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={w.avatar_url}
            alt=""
            className="h-14 w-14 rounded-full object-cover border shrink-0"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-lg font-semibold shrink-0">
            {(w.full_name || "?")[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{w.full_name || "Unnamed worker"}</h3>
          <p className="text-sm text-gray-500">
            {w.location_area || "Area not set"}
          </p>
          {cohortLabel(w.cohort_source) && (
            <Badge className="mt-1 text-[10px] bg-green-100 text-green-800 hover:bg-green-100">
              {cohortLabel(w.cohort_source)}
            </Badge>
          )}
          {w.whatsapp_phone ? (
            <p className="text-xs text-green-700 mt-0.5 flex items-center gap-1">
              <Phone className="h-3 w-3 shrink-0" />
              <a
                href={`https://wa.me/${w.whatsapp_phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {w.whatsapp_phone}
              </a>
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">No phone on file</p>
          )}
          {w.email ? (
            <p className="text-xs text-gray-600 mt-0.5">
              <a href={`mailto:${w.email}`} className="underline break-all">
                {w.email}
              </a>
            </p>
          ) : null}
          {w.bio && <p className="text-sm text-gray-600 mt-1">{w.bio}</p>}
        </div>
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

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={idChecked}
          onChange={(e) => onIdCheck(e.target.checked)}
          className="rounded border-gray-300"
        />
        ID verified in person
      </label>

      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={acting || !idChecked}
          onClick={onApprove}
          className="flex-1"
        >
          {acting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Approve
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={acting}
          onClick={onReject}
          className="flex-1"
        >
          <X className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </div>
    </div>
  );
}
