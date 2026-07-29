"use client";

import { useEffect, useState } from "react";
import { User, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email || null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, verification_status")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name);
        setRole(profile.role);
        setStatus(profile.verification_status);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-sm text-gray-500">Manage your LocalHands account</p>
        </div>
        <div className="rounded-xl border bg-white py-10 text-center">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-lg">Not signed in</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Sign in to create or edit your profile.
          </p>
          <Link href="/auth">
            <Button>Sign in with Email</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-gray-500">Your LocalHands account</p>
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl">
            {(fullName || email)[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{fullName || "No name set"}</p>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Role</p>
            <p className="font-medium capitalize">{role || "client"}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Status</p>
            <p className="font-medium capitalize">{status || "—"}</p>
          </div>
        </div>

        {role !== "worker" && (
          <Link href="/apply">
            <Button className="w-full">Apply as Worker</Button>
          </Link>
        )}

        {role === "worker" && status === "pending" && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            Your worker application is pending review.
          </p>
        )}

        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
