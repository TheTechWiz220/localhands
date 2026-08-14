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
        // Create account mode: allow new users. Sign in: still allow create
        // so a first-time user who taps Sign in is not blocked.
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
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
        <p className="text-gray-500">Checking session...</p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-gray-500 mt-2">
            We sent a link to <strong>{email}</strong>.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Open it to {mode === "create" ? "finish creating your account" : "sign in"}.
            Prefer the same browser (Chrome), not the email app's built-in browser.
          </p>
          <p className="text-xs text-gray-400 mt-4">Also check spam / junk.</p>
        </div>
        <button
          type="button"
          className="text-sm text-green-700 hover:underline"
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
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-green-100 text-green-700 mb-4">
          <Hand className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Welcome to LocalHands</h1>
        <p className="text-gray-500 mt-1">
          {mode === "create"
            ? "Create a free account with your email"
            : "Sign in with your email"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button
          type="button"
          variant={mode === "create" ? "default" : "outline"}
          onClick={() => {
            setMode("create");
            setError("");
          }}
        >
          Create account
        </Button>
        <Button
          type="button"
          variant={mode === "signin" ? "default" : "outline"}
          onClick={() => {
            setMode("signin");
            setError("");
          }}
        >
          Sign in
        </Button>
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-4">
        {mode === "create" && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">I want to...</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={role === "client" ? "default" : "outline"}
                onClick={() => setRole("client")}
              >
                Find help
              </Button>
              <Button
                type="button"asetype="button"
                variant={role === "worker" ? "default" : "outline"}
                onClick={() => setRole("worker")}
              >
                Offer skills
              </Button>
            </div>
          </div>
        )}

        {mode === "create" && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">Full name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-1.5 block">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button className="w-full" onClick={sendMagicLink} disabled={!canSubmit}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending link...
            </>
          ) : mode === "create" ? (
            "Create account — send link"
          ) : (
            "Send sign-in link"
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          No password. We email a one-time link.
          {mode === "signin" && (
            <>
              {" "}
              New here?{" "}
              <button
                type="button"
                className="text-green-700 hover:underline"
                onClick={() => setMode("create")}
              >
                Create an account
              </button>
            </>
          )}
        </p>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        Free email access for now. Phone sign-in can come later when we add SMS.
        Workers can finish verification from their profile after signing in.
      </p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
