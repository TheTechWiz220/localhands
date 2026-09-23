"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Temporary bridge while full apply page is restored with Android photo fix. */
export default function ApplyPage() {
  const router = useRouter();
  useEffect(() => {
    // Soft bounce so users are not stuck on blank page if deploy is mid-rollout
    const t = setTimeout(() => router.refresh(), 1500);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
      <p className="text-gray-600">Loading worker application...</p>
      <p className="text-xs text-gray-400 mt-2">If this stays, hard-refresh the page.</p>
    </div>
  );
}
