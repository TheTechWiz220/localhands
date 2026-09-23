"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Temporary stub — full apply form restored in next commit */
export default function ApplyPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/profile");
  }, [router]);
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center text-gray-500">
      Opening worker application...
    </div>
  );
}
