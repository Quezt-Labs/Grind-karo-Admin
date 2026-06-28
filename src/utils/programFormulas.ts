import type { ExerciseCategory } from "@/types/programs";

/** Coach-entered absolute load. Zero/negative means "compute from formula" (not a real fixed load). */
export function effectiveFixedLoadKg(
  loadKg: number | null | undefined,
): number | null {
  if (loadKg == null || loadKg <= 0) return null;
  return loadKg;
}

// ---------------------------------------------------------------------------
// RPE Chart – exact values from the 9-5 Powerbuilder sheet (e1rmsheet tab)
// Rows = RPE (10 → 4), Columns = Reps (1 → 10)
// Value = fraction of 1RM (e.g. 0.863 = 86.3%)
// ---------------------------------------------------------------------------

const RPE_CHART: Record<string, number[]> = {
  //           1rep    2rep    3rep    4rep    5rep    6rep    7rep    8rep    9rep   10rep
  "10": [1.0, 0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739],
  "9.5": [0.978, 0.939, 0.907, 0.878, 0.85, 0.824, 0.799, 0.774, 0.751, 0.723],
  "9": [0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707],
  "8.5": [0.939, 0.907, 0.878, 0.85, 0.824, 0.799, 0.774, 0.751, 0.723, 0.694],
  "8": [0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68],
  "7.5": [0.907, 0.878, 0.85, 0.824, 0.799, 0.774, 0.751, 0.723, 0.694, 0.667],
  "7": [0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653],
  "6.5": [0.878, 0.85, 0.824, 0.799, 0.774, 0.751, 0.723, 0.694, 0.667, 0.64],
  "6": [0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626],
  "5.5": [0.85, 0.824, 0.799, 0.774, 0.751, 0.723, 0.694, 0.667, 0.64, 0.613],
  "5": [0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599],
  "4.5": [0.824, 0.799, 0.774, 0.751, 0.723, 0.694, 0.667, 0.64, 0.613, 0.586],
  "4": [0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599, 0.572],
};

/** RPE values available in the chart */
export const RPE_VALUES = Object.keys(RPE_CHART)
  .map(Number)
  .sort((a, b) => b - a);

/** Max reps in the chart */
export const MAX_CHART_REPS = 10;

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/** Round to nearest plate increment (MROUND from Excel) */
export function mround(value: number, factor: number): number {
  if (factor === 0) return value;
  return Math.round(value / factor) * factor;
}

/**
 * Lookup %1RM factor from RPE chart.
 * @returns decimal factor (e.g. 0.863) or null if outside chart range
 */
export function getRpeFactor(rpe: number, reps: number): number | null {
  const key = String(rpe);
  const row = RPE_CHART[key];
  if (!row || reps < 1 || reps > MAX_CHART_REPS) return null;
  return row[reps - 1];
}

/**
 * Calculate training load from E1RM and target %1RM.
 * @param e1rm    – Estimated 1-rep max (kg)
 * @param percent – Target percentage as a decimal (0.53 for 53%)
 * @param roundTo – Plate rounding increment (2.5 or 5). Default 2.5
 */
export function calculateLoad(
  e1rm: number,
  percent: number,
  roundTo: number = 2.5,
): number {
  return mround(e1rm * percent, roundTo);
}

/**
 * Upper/Lower load range (±5%), rounded to plate increments.
 */
export function loadRange(
  load: number,
  roundTo: number = 2.5,
): { upper: number; lower: number } {
  return {
    upper: mround(load * 1.05, roundTo),
    lower: mround(load * 0.95, roundTo),
  };
}

/**
 * Estimate E1RM from actual performance using the RPE chart.
 * E1RM = weight / rpe_factor(rpe, reps)
 */
export function estimateE1rm(
  weight: number,
  reps: number,
  rpe: number,
  roundTo: number = 2.5,
): number | null {
  const factor = getRpeFactor(rpe, reps);
  if (!factor || factor === 0) return null;
  return mround(weight / factor, roundTo);
}

/**
 * Epley E1RM formula (used at top of each sheet tab):
 *   E1RM = weight / (1.0278 − 0.0278 × reps)
 */
export function epleyE1rm(weight: number, reps: number): number {
  const denom = 1.0278 - 0.0278 * reps;
  if (denom <= 0) return 0;
  return Math.round((weight / denom) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Build the full RPE ↔ %1RM table for display
// ---------------------------------------------------------------------------

export interface RpeChartEntry {
  rpe: number;
  factors: number[]; // index 0 = 1 rep … index 9 = 10 reps
}

export function getRpeChart(): RpeChartEntry[] {
  return Object.entries(RPE_CHART)
    .map(([key, factors]) => ({ rpe: Number(key), factors }))
    .sort((a, b) => b.rpe - a.rpe);
}

// ---------------------------------------------------------------------------
// Derive %1RM from RPE + reps (for display, returns percentage like "86.3%")
// ---------------------------------------------------------------------------

export function rpeToPercent(rpe: number, reps: number): string | null {
  const factor = getRpeFactor(rpe, reps);
  if (factor === null) return null;
  return `${(factor * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Auto-calculate helper for exercise rows
// Given category + E1RM values → compute load from %1RM or RPE+Reps
// ---------------------------------------------------------------------------

export interface E1rmInputs {
  squat: number;
  bench: number;
  deadlift: number;
}

/** Result of computing a row's training load */
export interface ComputedLoad {
  load: number;
  /** Where did the %1RM come from? */
  source: "percent" | "rpe";
  /** The decimal %1RM factor used (e.g. 0.863) */
  factor: number;
}

/**
 * Parse RPE string like "@7", "@8.5", "7", "ascending sets @8,9,9" → number or null
 */
function parseRpe(rpeStr: string | null | undefined): number | null {
  if (!rpeStr) return null;
  // Try to find first RPE-like pattern: @7, @8.5 or just a number
  const match = rpeStr.match(/@?\s*(\d+\.?\d*)/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  if (val < 4 || val > 10) return null;
  return val;
}

/**
 * Parse rep scheme to get a single rep number: "5" → 5, "5-8" → 5 (use lower), "3" → 3
 */
function parseReps(repScheme: string | null | undefined): number | null {
  if (!repScheme) return null;
  // Take the first number found
  const match = repScheme.match(/(\d+)/);
  if (!match) return null;
  const val = parseInt(match[1]);
  if (val < 1 || val > 10) return null; // RPE chart only goes to 10 reps
  return val;
}

function getE1rmForCategory(
  category: ExerciseCategory,
  e1rms: E1rmInputs,
): number | null {
  switch (category) {
    case "SQUAT":
      return e1rms.squat || null;
    case "BENCH":
      return e1rms.bench || null;
    case "DEADLIFT":
      return e1rms.deadlift || null;
    default:
      return null;
  }
}

/**
 * Compute the suggested training load for an exercise row.
 *
 * Priority:
 * 1. If %1RM is set → use it directly: load = E1RM × %1RM
 * 2. If RPE + Reps are set → derive %1RM from RPE chart, then compute load
 * 3. Otherwise → null
 */
export function computeRowLoad(
  category: ExerciseCategory,
  percentOneRm: number | null,
  e1rms: E1rmInputs,
  roundTo: number = 2.5,
  targetRpe?: string | null,
  repScheme?: string | null,
): ComputedLoad | null {
  const e1rm = getE1rmForCategory(category, e1rms);
  if (!e1rm) return null;

  // Path 1: Direct %1RM
  if (percentOneRm && percentOneRm > 0) {
    const pct = percentOneRm / 10000; // basis points → decimal
    return {
      load: calculateLoad(e1rm, pct, roundTo),
      source: "percent",
      factor: pct,
    };
  }

  // Path 2: Derive from RPE + Reps using RPE chart
  const rpe = parseRpe(targetRpe);
  const reps = parseReps(repScheme);
  if (rpe !== null && reps !== null) {
    const factor = getRpeFactor(rpe, reps);
    if (factor) {
      return {
        load: calculateLoad(e1rm, factor, roundTo),
        source: "rpe",
        factor,
      };
    }
  }

  return null;
}
