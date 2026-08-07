"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Hand } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setEmail(null);
    window.location.href = "/";
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-green-700">
          <Hand className="h-6 w-6" />
          <span className="text-lg">LocalHands</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-green-700">
            Admin
          </Link>
          {loading ? (
            <span className="text-sm text-gray-400">…</span>
          ) : email ? (
            <>
              <Link
                href="/profile"
                className="text-sm text-gray-600 hover:text-green-700 max-w-[120px] truncate"
                title={email}
              >
                {email.split("@")[0]}
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="text-sm font-medium text-green-700 hover:underline"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="text-sm font-medium text-green-700 hover:underline"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
