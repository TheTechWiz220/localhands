/** Privacy helpers for LocalHands */

/** Public surfaces: never show full client names */
export function publicReviewerLabel() {
  return "Client";
}

/**
 * Job participants:
 * - Before accept: first name only (or "Client")
 * - After accept / payment / completed: full name
 */
export function participantDisplayName(
  fullName: string | undefined | null,
  jobStatus: string,
  roleLabel: "Client" | "Worker" = "Client"
) {
  if (!fullName?.trim()) return roleLabel;

  const revealed = ["accepted", "in_progress", "completed"].includes(jobStatus);

  if (revealed) return fullName.trim();

  const first = fullName.trim().split(/\s+/)[0];
  return first || roleLabel;
}

/** Contact (WhatsApp/phone) only after price locked */
export function canShareContact(jobStatus: string, paymentStatus?: string | null) {
  if (jobStatus === "completed") return true;
  if (jobStatus === "accepted" || jobStatus === "in_progress") return true;
  // optional stricter: require payment confirmed
  // return paymentStatus === "confirmed" || paymentStatus === "paid";
  return false;
}
