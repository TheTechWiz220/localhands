/** Normalize Gambian / international numbers for wa.me links */

export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Local 7-digit Gambia mobile (e.g. 7xxxxxx) → 220...
  if (digits.length === 7) {
    digits = "220" + digits;
  }
  // 0 + 7 digits
  if (digits.length === 8 && digits.startsWith("0")) {
    digits = "220" + digits.slice(1);
  }
  // Already has country code without +
  if (digits.startsWith("220") && digits.length >= 10) {
    return digits;
  }
  // Other international: keep as digits
  if (digits.length >= 10) {
    return digits;
  }
  return null;
}

export function whatsappLink(
  phone: string | null | undefined,
  prefill?: string
): string | null {
  const n = normalizeWhatsAppPhone(phone);
  if (!n) return null;
  const base = `https://wa.me/${n}`;
  if (prefill?.trim()) {
    return `${base}?text=${encodeURIComponent(prefill.trim())}`;
  }
  return base;
}
