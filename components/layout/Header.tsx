"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Hand, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Main bottom-nav tabs — no in-app back on these. */
const TAB_ROOTS = ["/", "/directory", "/jobs", "/profile"];

function isTabRoot(pathname: string) {
  if (pathname === "/") return true;
  return TAB_ROOTS.some(
    (root) => root !== "/" && (pathname === root || pathname.startsWith(root + "/"))
  );
}

/** When history is empty or external, land somewhere sensible. */
function fallbackFor(pathname: string): string {
  if (pathname.startsWith("/worker/")) return "/directory";
  if (pathname.startsWith("/request/")) return "/jobs";
  if (pathname.startsWith("/post-job")) return "/";
  if (pathname.startsWith("/apply")) return "/";
  if (pathname.startsWith("/auth")) return "/";
  if (pathname.startsWith("/admin")) return "/";
  if (pathname.startsWith("/testing")) return "/";
  if (pathname.startsWith("/privacy") || pathname.startsWith("/terms")) {
    return "/profile";
  }
  if (pathname.startsWith("/sponsor")) return "/";
  if (pathname.startsWith("/welcome")) return "/";
  return "/";
}

export function Header() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const showBack = !isTabRoot(pathname);

  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setEmail(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      setIsAdmin(profile?.role === "admin");
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setEmail(null);
        setIsAdmin(false);
        return;
      }
      setEmail(session.user.email ?? null);
      supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()
        .then(({ data }) => setIsAdmin(data?.role === "admin"));
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setEmail(null);
    setIsAdmin(false);
    window.location.href = "/";
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackFor(pathname));
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="-ml-1.5 p-1.5 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 shrink-0"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <Link
            href="/"
            className="flex items-center gap-1.5 font-bold text-green-700 shrink-0"
          >
            <Hand className="h-6 w-6" />
            <span className="text-lg">LocalHands</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {email && (
            <Link
              href="/testing"
              className="text-xs text-gray-500 hover:text-green-700 shrink-0"
            >
              Test
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="text-xs text-gray-500 hover:text-green-700 shrink-0"
            >
              Admin
            </Link>
          )}
          {loading ? (
            <span className="text-sm text-gray-400">…</span>
          ) : email ? (
            <>
              <Link
                href="/profile"
                className="text-sm text-gray-600 hover:text-green-700 max-w-[72px] sm:max-w-[100px] truncate"
                title={email}
              >
                {email.split("@")[0]}
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="text-sm font-medium text-green-700 hover:underline shrink-0"
              >
                Out
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
