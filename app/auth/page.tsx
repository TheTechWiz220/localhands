"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Hand, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"worker" | "client">("client");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  const supabase = createClient();

  // If user already has a session (e.g. returned from magic link), redirect
  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const savedRole =
          typeof window !== "undefined"
            ? localStorage.getItem("lh_role") || "client"
            : "client";
        window.location.href = savedRole === "worker" ? "/apply" : "/directory";
        return;
      }
      setCheckingSession(false);
    }
    check();
  }, []);

  async function sendMagicLink() {
    setLoading(true);
    setError("");

    // Remember role for after redirect
    localStorage.setItem("lh_role", role);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "https://localhands-thetechwiz220s-projects.vercel.app/auth/callback";

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
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
            We sent a sign-in link to <strong>{email}</strong>.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Click the link in the email to sign in. You can close this tab.
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

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-green-100 text-green-700 mb-4">
          <Hand className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Welcome to LocalHands</h1>
        <p className="text-gray-500 mt-1">Sign in with your email</p>
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-4">
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
              type="button"
              variant={role === "worker" ? "default" : "outline"}
              onClick={() => setRole("worker")}
            >
              Offer skills
            </Button>
          </div>
        </div>

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

        <Button
          className="w-full"
          onClick={sendMagicLink}
          disabled={!email.includes("@") || loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending link...
            </>
          ) : (
            "Send sign-in link"
          )}
        </Button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        Free email sign-in. No password needed — just click the link in your email.
      </p>
    </div>
  );
}
