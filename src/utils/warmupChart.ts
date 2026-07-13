/**
 * Coach warmup prescriptions keyed by working-set load (kg).
 * Source: Shivam 5-days trial sheet → Warmups tab.
 *
 * Exact rows from the sheet are authoritative. Gaps between 75–220 kg
 * (missing from the provided export) are filled with the same ramp style
 * as the heavy end of the sheet.
 */

export type WarmupStep = {
  /** Display text, e.g. "Empty bar × 6" or "40 × 6" */
  text: string;
  loadKg: number | null;
  /** Alternate load when sheet uses "35X3/37.5X3" */
  loadKgAlt: number | null;
  reps: number | null;
};

const BAR_KG = 20;

/** Exact sheet rows: loadKg → raw comma-separated warmup string */
const SHEET_ROWS: Record<string, string> = {
  "25": "PUSHUPS TILL FAILURE, EMPTY BARX6",
  "27.5": "PUSHUPS TILL FAILURE, EMPTY BARRX6, 22.5X6",
  "30": "PUSHUPS TILL FAILURE, EMPTY BARX6, 25X6",
  "32.5": "PUSHUPS TILL FAILURE, EMPTY BARX6, 27.5X6",
  "35": "PUSHUPS TILL FAILURE, EMPTY BARX6, 30X3",
  "37.5": "PUSHUPS TILL FAILURE, EMPTY BARX6, 32.5X3",
  "40": "PUSHUPS TILL FAILURE, EMPTY BARX6, 30X3, 35X1",
  "42.5": "EMPTY BARX6, 30X6, 35X3/37.5X3",
  "45": "EMPTY BARX6, 30X6, 40X3",
  "47.5": "EMPTY BARX6, 30X6, 37.5X3/40X3, 42.5X1/45X1",
  "50": "EMPTY BARX6, 30X6, 40X3, 45X1",
  "52.5": "EMPTY BARX6, 40X6, 47.5X3",
  "55": "EMPTY BARX6, 40X6, 50X3",
  "57.5": "EMPTY BARX6, 40X6, 50X3, 55X1",
  "60": "EMPTY BARX6, 40X6, 50X3, 55X1",
  "62.5": "EMPTY BARX6, 40X6, 50X3, 57.5X1/ 60X1",
  "65": "EMPTY BARX6, 40X6, 50X3, 60X1",
  "67.5": "EMPTY BARX6, 40X6, 50X3, 60X1, 65X1",
  "70": "EMPTY BARX6, 40X6, 50X3, 60X1, 65X1",
  "72.5": "EMPTY BARX6, 40X6, 60X3, 65X1/67.5X1",
  "222.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 200X1, 215X1",
  "225": "EMPTY BARX6, 70X6, 120X3, 170X1, 200X1, 220X1",
  "227.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 200X1, 220X1",
  "230": "EMPTY BARX6, 70X6, 120X3, 170X1, 200X1, 220X1",
  "232.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 190X1, 210X1, 225X1",
  "235": "EMPTY BARX6, 70X6, 120X3, 170X1, 190X1, 210X1, 225X1",
  "237.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 190X1, 210X1, 230X1",
  "240": "EMPTY BARX6, 70X6, 120X3, 170X1, 190X1, 210X1, 230X1",
  "242.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 200X1, 220X1, 235X1",
  "245": "EMPTY BARX6, 70X6, 120X3, 170X1, 200X1, 220X1, 240X1",
  "247.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 200X1, 220X1, 240X1",
  "250": "EMPTY BARX6, 70X6, 120X3, 170X1, 200X1, 220X1, 240X1",
  "252.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 210X1, 230X1, 245X1",
  "255": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 240X1",
  "257.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 240X1",
  "260": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 240X1",
  "262.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 250X1",
  "265": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 250X1",
  "267.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 250X1",
  "270": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 250X1",
  "272.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 250X1",
  "275": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 260X1",
  "277.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 260X1",
  "280": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 260X1",
  "282.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 250X1, 270X1",
  "285": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 250X1, 270X1",
  "287.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 250X1, 270X1",
  "290": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 250X1, 270X1",
  "292.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 260X1, 280X1",
  "295": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 260X1, 280X1",
  "297.5": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 260X1, 290X1",
  "300": "EMPTY BARX6, 70X6, 120X3, 170X1, 220X1, 270X1",
};

function round25(n: number): number {
  return Math.round(n / 2.5) * 2.5;
}

function loadKey(kg: number): string {
  // Avoid "72.499999" float keys
  const r = round25(kg);
  return Number.isInteger(r) ? String(r) : String(r);
}

/** Fill missing mid-range loads (75–220) in the coach's heavy-ramp style. */
function generateMidRangeRaw(workingLoad: number): string {
  const w = round25(workingLoad);
  if (w < 100) {
    // Bridge from light (72.5) style toward heavy
    const a = Math.max(40, round25(w * 0.55));
    const b = round25(w * 0.75);
    const c = round25(w * 0.9);
    const parts = [`EMPTY BARX6`, `${a}X6`, `${b}X3`];
    if (c < w && c > b) parts.push(`${c}X1`);
    const last = round25(w - 5);
    if (last < w && last > (c < w ? c : b)) parts.push(`${last}X1`);
    return parts.join(", ");
  }

  // Scaled version of 222.5+ pattern: bar → ~30%×6 → ~53%×3 → singles up
  const s1 = Math.max(40, Math.min(70, round25(w * 0.31)));
  const s2 = round25(w * 0.53);
  const s3 = round25(w * 0.75);
  const s4 = round25(w * 0.89);
  const s5 = round25(w - 5);
  const parts = [`EMPTY BARX6`, `${s1}X6`, `${s2}X3`, `${s3}X1`];
  if (s4 > s3 && s4 < w) parts.push(`${s4}X1`);
  if (s5 > s4 && s5 < w) parts.push(`${s5}X1`);
  return parts.join(", ");
}

/** Extend above 300 / below sheet floor with nearest style. */
function generateOutOfRangeRaw(workingLoad: number): string {
  const w = round25(workingLoad);
  if (w < 25) {
    return "PUSHUPS TILL FAILURE, EMPTY BARX6";
  }
  // Above 300: keep heavy skeleton, last singles track working load
  const last = round25(w - 30);
  const mid = round25(w - 80);
  const approach = round25(w - 10);
  return `EMPTY BARX6, 70X6, 120X3, 170X1, ${mid}X1, ${last}X1, ${approach}X1`;
}

export function parseWarmupRaw(raw: string): WarmupStep[] {
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map(parseOneStep);
}

function parseOneStep(part: string): WarmupStep {
  const cleaned = part.replace(/\s+/g, " ").trim();

  if (/PUSHUPS/i.test(cleaned)) {
    return {
      text: "Pushups till failure",
      loadKg: null,
      loadKgAlt: null,
      reps: null,
    };
  }

  if (/EMPTY\s*BAR/i.test(cleaned)) {
    const m = cleaned.match(/X\s*(\d+)/i);
    const reps = m ? Number(m[1]) : 6;
    return {
      text: `Empty bar × ${reps}`,
      loadKg: BAR_KG,
      loadKgAlt: null,
      reps,
    };
  }

  const choice = cleaned.match(
    /^([\d.]+)\s*X\s*(\d+)\s*\/\s*([\d.]+)\s*X\s*(\d+)$/i,
  );
  if (choice) {
    const loadKg = Number(choice[1]);
    const reps = Number(choice[2]);
    const loadKgAlt = Number(choice[3]);
    return {
      text: `${loadKg} × ${reps} / ${loadKgAlt} × ${choice[4]}`,
      loadKg,
      loadKgAlt,
      reps,
    };
  }

  const simple = cleaned.match(/^([\d.]+)\s*X\s*(\d+)$/i);
  if (simple) {
    const loadKg = Number(simple[1]);
    const reps = Number(simple[2]);
    return {
      text: `${loadKg} × ${reps}`,
      loadKg,
      loadKgAlt: null,
      reps,
    };
  }

  return { text: cleaned, loadKg: null, loadKgAlt: null, reps: null };
}

function rawForLoad(workingLoad: number): string | null {
  if (!Number.isFinite(workingLoad) || workingLoad <= 0) return null;
  const key = loadKey(workingLoad);
  if (SHEET_ROWS[key]) return SHEET_ROWS[key];

  const w = round25(workingLoad);
  if (w >= 75 && w <= 220) return generateMidRangeRaw(w);
  if (w < 25 || w > 300) return generateOutOfRangeRaw(w);

  // Between known keys that aren't filled (shouldn't happen often): nearest lower sheet key
  const keys = Object.keys(SHEET_ROWS)
    .map(Number)
    .sort((a, b) => a - b);
  let nearest = keys[0];
  let best = Math.abs(keys[0] - w);
  for (const k of keys) {
    const d = Math.abs(k - w);
    if (d < best || (d === best && k <= w)) {
      best = d;
      nearest = k;
    }
  }
  return SHEET_ROWS[loadKey(nearest)] ?? null;
}

/**
 * Resolve warmup steps for an athlete's working-set load (kg).
 * Returns null when load is missing / not applicable.
 */
export function lookupWarmupSteps(
  workingLoadKg: number | null,
): WarmupStep[] | null {
  if (
    workingLoadKg == null ||
    !Number.isFinite(workingLoadKg) ||
    workingLoadKg <= 0
  ) {
    return null;
  }
  const raw = rawForLoad(workingLoadKg);
  if (!raw) return null;
  return parseWarmupRaw(raw);
}

/** All authoritative + generated loads for admin reference. */
export function listWarmupChartEntries(): Array<{
  loadKg: number;
  steps: WarmupStep[];
  source: "sheet" | "generated";
}> {
  const loads = new Set<number>();
  for (const k of Object.keys(SHEET_ROWS)) loads.add(Number(k));
  for (let w = 75; w <= 220; w += 2.5) loads.add(round25(w));

  return [...loads]
    .sort((a, b) => a - b)
    .map((loadKg) => {
      const key = loadKey(loadKg);
      const source: "sheet" | "generated" = SHEET_ROWS[key]
        ? "sheet"
        : "generated";
      return {
        loadKg,
        steps: lookupWarmupSteps(loadKg) ?? [],
        source,
      };
    });
}

export const WARMUP_MAIN_CATEGORIES = new Set(["SQUAT", "BENCH", "DEADLIFT"]);
