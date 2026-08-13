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
export function canShareContact(
  jobStatus: string,
  _paymentStatus?: string | null
) {
  return ["accepted", "in_progress", "completed"].includes(jobStatus);
}
