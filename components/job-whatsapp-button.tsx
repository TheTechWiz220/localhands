"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canShareContact } from "@/lib/privacy";
import { whatsappLink } from "@/lib/whatsapp";

export function JobWhatsAppButton({
  jobStatus,
  paymentStatus,
  otherPhone,
  jobTitle,
  jobId,
}: {
  jobStatus: string;
  paymentStatus?: string | null;
  otherPhone?: string | null;
  jobTitle: string;
  /** When set, fetches partner WhatsApp via API if otherPhone is missing */
  jobId?: string;
}) {
  const [phone, setPhone] = useState<string | null | undefined>(otherPhone);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPhone(otherPhone);
  }, [otherPhone]);

  useEffect(() => {
    if (!canShareContact(jobStatus, paymentStatus)) return;
    if (otherPhone) return;
    if (!jobId) return;

    let cancelled = false;
    setLoading(true);
    fetch("/api/job-contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobRequestId: jobId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.whatsapp_phone) setPhone(data.whatsapp_phone);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, jobStatus, paymentStatus, otherPhone]);

  if (!canShareContact(jobStatus, paymentStatus)) return null;

  const href = whatsappLink(
    phone,
    `Hi, about LocalHands job: ${jobTitle}`
  );

  return (
    <div className="border-t pt-3 space-y-2">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block">
          <Button size="sm" variant="outline" className="w-full" type="button">
            <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
            Message on WhatsApp
          </Button>
        </a>
      ) : (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
          {loading
            ? "Loading contact…"
            : "They have not added a WhatsApp number yet. Ask them to add it under Profile."}
        </p>
      )}
      <p className="text-[11px] text-gray-400">
        For time &amp; location only — keep price and payment in LocalHands.
      </p>
    </div>
  );
}
