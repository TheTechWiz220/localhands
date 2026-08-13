"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canShareContact } from "@/lib/privacy";
import { whatsappLink } from "@/lib/whatsapp";

export function JobWhatsAppButton({
  jobStatus,
  paymentStatus,
  otherPhone,
  jobTitle,
}: {
  jobStatus: string;
  paymentStatus?: string | null;
  otherPhone?: string | null;
  jobTitle: string;
}) {
  if (!canShareContact(jobStatus, paymentStatus)) return null;

  const href = whatsappLink(
    otherPhone,
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
          They have not added a WhatsApp number yet. Ask them to add it under
          Profile.
        </p>
      )}
      <p className="text-[11px] text-gray-400">
        For time &amp; location only — keep price and payment in LocalHands.
      </p>
    </div>
  );
}
