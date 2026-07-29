"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Hand } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
export default function AuthPage() {
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<"worker" | "client">("client");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const supabase = createClient();
  function formatPhone(raw: string) {
    let f = raw.replace(/\s+/g, "");
    if (f.startsWith("0")) f = f.slice(1);
    if (!f.startsWith("+")) f = "+220" + f;
    return f;
  }
  async function sendOtp() {
    setLoading(true); setError(""); setMessage("");
    const { error } = await supabase.auth.signInWithOtp({ phone: formatPhone(phone) });
    setLoading(false);
    if (error) setError(error.message + " — Enable Phone auth + SMS provider in Supabase.");
    else { setOtpSent(true); setMessage("Code sent! Check your SMS."); }
  }
  async function verifyOtp() {
    setLoading(true); setError("");
    const { error } = await supabase.auth.verifyOtp({ phone: formatPhone(phone), token: otp, type: "sms" });
    setLoading(false);
    if (error) setError(error.message);
    else { setMessage("Signed in! Redirecting..."); window.location.href = role === "worker" ? "/profile" : "/directory"; }
  }
  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-green-100 text-green-700 mb-4"><Hand className="h-7 w-7" /></div>
        <h1 className="text-2xl font-bold">Welcome to LocalHands</h1>
        <p className="text-gray-500 mt-1">Sign in with your phone number</p>
      </div>
      <div className="rounded-xl border bg-white p-6 space-y-4">
        {!otpSent ? (
          <>
            <div><label className="text-sm font-medium mb-1.5 block">I want to...</label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={role === "client" ? "default" : "outline"} onClick={() => setRole("client")}>Find help</Button>
                <Button type="button" variant={role === "worker" ? "default" : "outline"} onClick={() => setRole("worker")}>Offer skills</Button>
              </div></div>
            <div><label className="text-sm font-medium mb-1.5 block">Phone number</label>
              <input type="tel" placeholder="e.g. 7XX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600" />
              <p className="text-xs text-gray-400 mt-1">Gambia numbers (+220)</p></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}
            <Button className="w-full" onClick={sendOtp} disabled={!phone || loading}>{loading ? "Sending..." : "Send Code"}</Button>
          </>
        ) : (
          <>
            <div><label className="text-sm font-medium mb-1.5 block">6-digit code</label>
              <input type="text" inputMode="numeric" maxLength={6} placeholder="• • • • • •" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-green-600" /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}
            <Button className="w-full" onClick={verifyOtp} disabled={otp.length < 6 || loading}>{loading ? "Verifying..." : "Verify & Continue"}</Button>
            <button type="button" className="w-full text-sm text-gray-500" onClick={() => setOtpSent(false)}>Change phone number</button>
          </>
        )}
      </div>
      <p className="text-center text-xs text-gray-400 mt-6">Phone OTP needs SMS provider enabled in Supabase Auth settings.</p>
    </div>
  );
}
