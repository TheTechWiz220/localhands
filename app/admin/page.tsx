"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Check,
  X,
  Lock,
  Loader2,
  Briefcase,
  Wallet,
  Users,
  Search,
  ExternalLink,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { calcFees, formatGmd, PLATFORM_FEE_PERCENT } from "@/lib/pricing";

// NOTE: Restored base. Feature upgrade (empty proof + suspend) applied next commit.
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
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
        Full admin panel is being restored (proof empty state + remove
        verification). Please hard-refresh in 1–2 minutes after the next deploy.
      </p>
      <p className="text-sm text-gray-500">
        If you need to approve workers urgently, use Supabase Table Editor →
        profiles → set verification_status to verified and is_verified to true.
      </p>
    </div>
  );
}
