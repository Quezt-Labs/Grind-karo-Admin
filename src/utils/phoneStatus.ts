export function formatAdminPhone(phone: string | null | undefined): {
  label: string;
  missing: boolean;
} {
  const trimmed = phone?.trim() ?? "";
  if (!trimmed) {
    return { label: "Missing", missing: true };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (/^[1-9]\d{7,14}$/.test(digits)) {
    return { label: `+${digits}`, missing: false };
  }

  return { label: trimmed, missing: false };
}
