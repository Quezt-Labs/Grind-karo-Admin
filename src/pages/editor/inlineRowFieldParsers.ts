/** Basis points (5300) → display percent string ("53") */
export function percentBasisToInput(
  basisPoints: number | null | undefined,
): string {
  if (basisPoints == null || basisPoints === 0) return "";
  return String(basisPoints / 100);
}

/** User input ("53", "53%") → basis points or null if empty */
export function parsePercentInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/%$/, "");
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

export function parseSetsInput(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  if (Number.isNaN(n)) return undefined;
  return n;
}

export function parseLoadInput(raw: string): number | null | undefined {
  const trimmed = raw.trim().replace(/kg$/i, "").trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (Number.isNaN(n)) return undefined;
  return n;
}
