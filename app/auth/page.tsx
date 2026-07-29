"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Hand, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<"worker" | "client">("client");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  async function sendOtp() {
    setLoading(true);
    setError("");
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setOtpSent(true);
      setMessage("Check your email for a 6-digit code (or magic link).");
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Signed in! Redirecting...");
      window.location.href = role === "worker" ? "/apply" : "/directory";
    }
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
        {!otpSent ? (
          <>
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
            {message && <p className="text-sm text-green-600">{message}</p>}

            <Button
              className="w-full"
              onClick={sendOtp}
              disabled={!email.includes("@") || loading}
            >
              {loading ? "Sending..." : "Send Code"}
            </Button>
          </>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium mb-1.5 block">6-digit code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <p className="text-xs text-gray-400 mt-1">
                Sent to {email}. Also check spam/junk.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <Button
              className="w-full"
              onClick={verifyOtp}
              disabled={otp.length < 6 || loading}
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>

            <button
              type="button"
              className="w-full text-sm text-gray-500"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setError("");
                setMessage("");
              }}
            >
              Use a different email
            </button>
          </>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        Free email sign-in. Phone SMS can be added later.
      </p>
    </div>
  );
}
