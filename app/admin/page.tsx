"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Lock, Loader2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type AccessState = "loading" | "denied" | "allowed";

export default function AdminPage() {
  const [access, setAccess] = useState<AccessState>("loading");
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAccess("denied");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setAccess(profile?.role === "admin" ? "allowed" : "denied");
    }
    check();
  }, [supabase]);

  if (access === "loading") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
        <p className="text-gray-500">Checking access...</p>
      </div>
    );
  }

  if (access === "denied") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <Lock className="h-10 w-10 mx-auto text-red-500" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-green-700" />
        Admin
      </h1>

      <Link
        href="/admin/testing"
        className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm hover:border-green-300"
      >
        <FlaskConical className="h-6 w-6 text-green-700 shrink-0" />
        <div>
          <p className="font-semibold">Testing</p>
          <p className="text-xs text-gray-500">
            Campaigns, claims, reports, accept / pay
          </p>
        </div>
      </Link>

      <p className="text-sm text-gray-600 bg-gray-50 border rounded-lg p-3">
        Worker verification and other admin tools: use the panels you already
        had in production, or Supabase → profiles for urgent verification
        status changes.
      </p>

      <Link href="/testing">
        <Button variant="outline" className="w-full">
          Open tester view
        </Button>
      </Link>
      <Link href="/">
        <Button variant="outline" className="w-full">
          Back to app
        </Button>
      </Link>
    </div>
  );
}
