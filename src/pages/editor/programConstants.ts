import type { ExerciseCategory } from "@/types/programs";

export const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  SQUAT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  BENCH:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  DEADLIFT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ACCESSORY:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  OTHER: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

export const CATEGORY_BORDER: Record<ExerciseCategory, string> = {
  SQUAT: "border-l-blue-500",
  BENCH: "border-l-orange-500",
  DEADLIFT: "border-l-red-500",
  ACCESSORY: "border-l-purple-400",
  OTHER: "border-l-gray-300",
};

export const BLOCK_TYPE_COLORS: Record<string, string> = {
  MAIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  DELOAD:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PEAK: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CUSTOM: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

export function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function formatPercent(basisPoints: number | null): string {
  if (basisPoints === null || basisPoints === 0) return "—";
  return `${(basisPoints / 100).toFixed(1)}%`;
}
