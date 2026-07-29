"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, Check, X, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { pendingWorkers } from "@/lib/data";
import Link from "next/link";
type AccessState = "loading" | "denied" | "allowed";
export default function AdminPage() {
  const [access, setAccess] = useState<AccessState>("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAccess("denied"); return; }
      const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
      if (profile?.role === "admin") {
        setUserEmail(user.email || user.phone || profile.full_name || "Admin");
        setAccess("allowed");
      } else setAccess("denied");
    }
    checkAccess();
  }, []);
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
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600"><Lock className="h-8 w-8" /></div>
        <div><h1 className="text-2xl font-bold">Access Denied</h1><p className="text-gray-500 mt-2">Only verified administrators can access this page.</p></div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth"><Button>Sign in</Button></Link>
          <Link href="/"><Button variant="outline">Go Home</Button></Link>
        </div>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">To become an admin, set your profile role to <code className="bg-gray-100 px-1 rounded">admin</code> in Supabase.</p>
      </div>
    );
  }
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-green-700" /> Admin – Verification</h1>
        <p className="text-sm text-gray-500 mt-1">Signed in as {userEmail}</p>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between mb-4"><h2 className="font-semibold">Pending Applications</h2><Badge variant="warning">{pendingWorkers.length} waiting</Badge></div>
        <div className="space-y-4">{pendingWorkers.map((w) => (
          <div key={w.id} className="border rounded-lg p-4">
            <h3 className="font-semibold">{w.full_name}</h3>
            <p className="text-sm text-gray-500">{w.location_area} · {w.phone}</p>
            <div className="flex flex-wrap gap-1 mt-2">{w.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" className="flex-1"><Check className="h-4 w-4 mr-1" /> Approve</Button>
              <Button size="sm" variant="destructive" className="flex-1"><X className="h-4 w-4 mr-1" /> Reject</Button>
            </div>
          </div>
        ))}</div>
      </div>
    </div>
  );
}
