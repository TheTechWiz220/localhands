"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enablePushNotifications } from "@/lib/push/client";
import { createClient } from "@/lib/supabase/client";

export function EnableNotifications() {
  const [status, setStatus] = useState<
    "loading" | "need_login" | "unsupported" | "denied" | "off" | "on"
  >("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setStatus("need_login");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      if (Notification.permission === "granted") {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (!cancelled) setStatus(sub ? "on" : "off");
        } catch {
          if (!cancelled) setStatus("off");
        }
        return;
      }
      if (!cancelled) setStatus("off");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onEnable() {
    setBusy(true);
    setMsg("");
    const result = await enablePushNotifications();
    setBusy(false);
    if (result.ok) {
      setStatus("on");
      setMsg("Notifications on. You’ll get alerts for requests and claims.");
    } else {
      setMsg(result.error);
      if (result.error.toLowerCase().includes("denied")) setStatus("denied");
    }
  }

  if (status === "loading" || status === "need_login" || status === "unsupported") {
    return null;
  }

  if (status === "on") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 flex items-center gap-2">
        <Bell className="h-3.5 w-3.5 shrink-0" />
        Notifications on for job requests & claims
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-center gap-2">
        <BellOff className="h-3.5 w-3.5 shrink-0" />
        Notifications blocked in browser settings. Enable them for LocalHands to get request alerts.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 space-y-2">
      <p className="text-sm text-gray-700">
        Turn on notifications so you don’t miss job requests or claims — works best with the app installed.
      </p>
      <Button size="sm" onClick={onEnable} disabled={busy} className="w-full sm:w-auto">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Bell className="h-4 w-4 mr-1" /> Enable notifications
          </>
        )}
      </Button>
      {msg ? <p className="text-xs text-gray-500">{msg}</p> : null}
    </div>
  );
}
