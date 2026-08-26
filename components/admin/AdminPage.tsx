"use client";

import { useEffect } from "react";

/** Temporary: full admin is being restored. Redirect avoids blank app. */
export default function AdminPage() {
  useEffect(() => {
    // Soft note for admins during restore
  }, []);
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
      <h1 className="text-xl font-bold">Admin updating</h1>
      <p className="text-sm text-gray-500">
        The admin panel is being restored after a deploy glitch. Please refresh
        in a minute. If this persists, contact the founder.
      </p>
    </div>
  );
}
