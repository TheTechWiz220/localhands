"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Client-side fallback for magic links that land with tokens in the URL hash
 * (implicit flow) instead of ?code= (PKCE).
 */
export default function AuthConfirmPage() {
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    async function handle() {
      const supabase = createClient();

      // 1) Already have a session?
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const role = localStorage.getItem("lh_role") || "client";
        // Clients land on Profile so they see their status; workers go to Apply
        window.location.href = role === "worker" ? "/apply" : "/profile";
        return;
      }

      // 2) Hash tokens from older/implicit magic links
      if (typeof window !== "undefined" && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (!error) {
            const role = localStorage.getItem("lh_role") || "client";
            window.location.href = role === "worker" ? "/apply" : "/profile";
            return;
          }
          setMessage(error.message);
          return;
        }
      }

      // 3) Query error from callback
      const q = new URLSearchParams(window.location.search);
      const err = q.get("error_description") || q.get("error");
      if (err) {
        setMessage(decodeURIComponent(err));
        return;
      }

      setMessage("No session found. Please request a new sign-in link.");
    }

    handle();
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
      <p className="text-gray-600">{message}</p>
    </div>
  );
}
