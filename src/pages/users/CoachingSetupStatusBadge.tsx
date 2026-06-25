import { cn } from "@/utils/cn";

const coachingSetupStatusLabel: Record<string, string> = {
  needs_intake: "Needs intake",
  awaiting_program: "Awaiting program",
  ready: "Ready",
};

export function CoachingSetupStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "ready" &&
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        status === "awaiting_program" &&
          "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        status === "needs_intake" &&
          "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      )}
    >
      {coachingSetupStatusLabel[status] ?? status}
    </span>
  );
}
