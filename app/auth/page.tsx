"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
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
        // Clients land on Profile so they see their status; workers go to Apply
        window.location.href = savedRole === "worker" ? "/apply" : "/profile";
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

    const meta: Record<string, string> = {};
    if (mode === "create") {
      if (fullName.trim()) meta.full_name = fullName.trim();
      meta.role = role; // client | worker — used by handle_new_user trigger
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Only create account in Create mode — Sign in won't mint a new user
        shouldCreateUser: mode === "create",
        emailRedirectTo: redirectTo,
        data: Object.keys(meta).length ? meta : undefined,
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
          <p className="text-sm text-gray-500 mt-2">
            Link sent to <strong className="text-gray-800">{email}</strong>
          </p>
          <p className="text-xs text-gray-400 mt-3">
            Open the link on this phone to finish signing in.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSent(false);
            setError("");
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  const canSubmit =
    email.includes("@") &&
    (mode === "signin" || fullName.trim().length > 0) &&
    !loading;

  return (
    <div className="max-w-sm mx-auto px-4 py-10 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "Create account" : "Sign in"}
        </h1>
        <p className="text-sm text-gray-500">
          {mode === "create"
            ? "Join LocalHands with your email"
            : "We will email you a one-time link"}
        </p>
      </div>

      <div className="flex rounded-xl border p-1 bg-gray-50">
        <button
          type="button"
          onClick={() => {
            setMode("create");
            setError("");
          }}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            mode === "create"
              ? "bg-white shadow text-gray-900"
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
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            mode === "signin"
              ? "bg-white shadow text-gray-900"
              : "text-gray-500"
          }`}
        >
          Sign in
        </button>
      </div>

      <div className="space-y-4">
        {mode === "create" && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">I am a</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole("client")}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition ${
                    role === "client"
                      ? "border-green-600 bg-green-50 text-green-800"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  Client
                </button>
                <button
                  type="button"
                  onClick={() => setRole("worker")}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition ${
                    role === "worker"
                      ? "border-green-600 bg-green-50 text-green-800"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  Worker
                </button>
              </div>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            autoComplete="email"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <Button
          className="w-full bg-green-700 hover:bg-green-800"
          disabled={!canSubmit}
          onClick={sendMagicLink}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "create" ? (
            "Send create link"
          ) : (
            "Send sign-in link"
          )}
        </Button>

        <p className="text-xs text-center text-gray-400">
          No password — we email a one-time link
        </p>
      </div>
    </div>
  );
}
