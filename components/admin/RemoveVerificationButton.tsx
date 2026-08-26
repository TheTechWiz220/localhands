"use client";

import { Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  busy: boolean;
  onRemove: () => void;
};

export function RemoveVerificationButton({ busy, onRemove }: Props) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full border-red-200 text-red-700 hover:bg-red-50"
      disabled={busy}
      onClick={onRemove}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Ban className="h-4 w-4 mr-1" /> Remove verification
        </>
      )}
    </Button>
  );
}
