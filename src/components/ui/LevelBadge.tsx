import { cn } from "@/utils/cn";

const badgeColorMap: Record<string, string> = {
  ELITE:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  POWERLIFTING: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  BEST_VALUE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  LIMITED_TIME:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  STRENGTH:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  FAT_LOSS: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  HOME: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  RESTART: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  ADVANCED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  COMPETITION_PREP:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  BEGINNER:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  INTERMEDIATE:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  ALL_LEVELS:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

interface LevelBadgeProps {
  level: string;
  className?: string;
}

export function LevelBadge({ level, className }: LevelBadgeProps) {
  const colors =
    badgeColorMap[level] ||
    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
  const label = level.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        colors,
        className,
      )}
    >
      {label.toLowerCase()}
    </span>
  );
}
