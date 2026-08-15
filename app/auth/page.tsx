"use client";

import { Suspense, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Hand, Mail, CheckCircle2, Loader2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

function AuthForm() {
  const [mode, setMode] = useState<"signin" | "create">("create");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"worker" | "client">("client");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(
        urlError === "missing_code"
          ? "Sign-in link was incomplete. Please request a new one."
          : decodeURIComponent(urlError)
      );
    }

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const savedRole = localStorage.getItem("lh_role") || "client";
        window.location.href = savedRole === "worker" ? "/apply" : "/directory";
        return;
      }
      setCheckingSession(false);
    }
    check();
  }, [searchParams]);

  async function sendMagicLink() {
    if (mode === "create" && !fullName.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    setError("");

    if (mode === "create") {
      localStorage.setItem("lh_role", role);
      localStorage.setItem("lh_full_name", fullName.trim());
    }

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
        data:
          mode === "create" && fullName.trim()
            ? { full_name: fullName.trim() }
            : undefined,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (checkingSession) {
    return (
      <div className="max-w-sm mx-auto px-4 py-20 text-center">
        <Loader2 className="h-7 w-7 animate-spin mx-auto text-green-600 mb-3" />
        <p className="text-sm text-gray-500">Checking session...</p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center space-y-5">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Check your email</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Link sent to <strong className="text-gray-800">{email}</strong>
          </p>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            Open it in the same browser (Chrome). Check spam if you do not see
            it.
          </p>
        </div>
        <button
          type="button"
          className="text-sm text-green-700 font-medium hover:underline"
          onClick={() => {
            setSent(false);
            setError("");
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  const canSubmit =
    email.includes("@") &&
    (mode === "signin" || fullName.trim().length > 0) &&
    !loading;

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-700 mb-3">
          <Hand className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">
          {mode === "create" ? "Create account" : "Sign in"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {mode === "create"
            ? "Join LocalHands with your email"
            : "Welcome back"}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        {/* Mode switch — subtle, not two big buttons */}
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("create");
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              mode === "create"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              mode === "signin"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Sign in
          </button>
        </div>

        {mode === "create" && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">I am here to</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole("client")}
                  className={`flex-1 py-2 text-sm rounded-xl border transition ${
                    role === "client"
                      ? "border-green-600 bg-green-50 text-green-800 font-medium"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  Hire someone
                </button>
                <button
                  type="button"
                  onClick={() => setRole("worker")}
                  className={`flex-1 py-2 text-sm rounded-xl border transition ${
                    role === "worker"
                      ? "border-green-600 bg-green-50 text-green-800 font-medium"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  Offer skills
                </button>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          className="w-full h-11 rounded-xl text-sm font-semibold"
          onClick={sendMagicLink}
          disabled={!canSubmit}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : mode === "create" ? (
            "Continue"
          ) : (
            "Send link"
          )}
        </Button>

        <p className="text-xs text-center text-gray-400">
          No password — we email a one-time link
        </p>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        {mode === "create" ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="text-green-700 font-medium hover:underline"
              onClick={() => {
                setMode("signin");
                setError("");
              }}
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            New here?{" "}
            <button
              type="button"
              className="text-green-700 font-medium hover:underline"
              onClick={() => {
                setMode("create");
                setError("");
              }}
            >
              Create account
            </button>
          </>
        )}
      </p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-sm mx-auto px-4 py-20 text-center">
          <Loader2 className="h-7 w-7 animate-spin mx-auto text-green-600 mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
