import { useQuery } from "@tanstack/react-query";
import { Dumbbell } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { athleteEngagementService } from "@/services/athleteEngagementService";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatKg(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatLiftDisplay(checkin: {
  squatKg: number;
  squatLoadKg: number | null;
  squatReps: number | null;
}): string {
  if (checkin.squatLoadKg != null && checkin.squatReps != null) {
    return `${formatKg(checkin.squatLoadKg)}×${checkin.squatReps} → ${formatKg(checkin.squatKg)} kg`;
  }
  return `${formatKg(checkin.squatKg)} kg`;
}

function formatBenchDisplay(checkin: {
  benchKg: number;
  benchLoadKg: number | null;
  benchReps: number | null;
}): string {
  if (checkin.benchLoadKg != null && checkin.benchReps != null) {
    return `${formatKg(checkin.benchLoadKg)}×${checkin.benchReps} → ${formatKg(checkin.benchKg)} kg`;
  }
  return `${formatKg(checkin.benchKg)} kg`;
}

function formatDeadliftDisplay(checkin: {
  deadliftKg: number;
  deadliftLoadKg: number | null;
  deadliftReps: number | null;
}): string {
  if (checkin.deadliftLoadKg != null && checkin.deadliftReps != null) {
    return `${formatKg(checkin.deadliftLoadKg)}×${checkin.deadliftReps} → ${formatKg(checkin.deadliftKg)} kg`;
  }
  return `${formatKg(checkin.deadliftKg)} kg`;
}

interface UserBigLiftPrPanelProps {
  userId: string;
}

export function UserBigLiftPrPanel({ userId }: UserBigLiftPrPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-big-lift-pr", userId],
    queryFn: () => athleteEngagementService.getUserBigLiftPrHistory(userId),
  });

  const items = data ?? [];
  const latest = items[0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Dumbbell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Big 3 PR check-ins
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Squat · Bench · Deadlift — every ~2 months
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-gray-800">
          <Dumbbell className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No PR check-ins yet.
          </p>
        </div>
      ) : (
        <>
          {latest && (
            <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Latest — {formatDate(latest.createdAt)}
                </p>
                <StatusBadge status="Logged" />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] uppercase text-gray-500">Squat</p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatLiftDisplay(latest)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-500">Bench</p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatBenchDisplay(latest)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-500">
                    Deadlift
                  </p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatDeadliftDisplay(latest)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-center text-xs font-medium text-indigo-700 dark:text-indigo-300">
                Total {formatKg(latest.totalKg)} kg
              </p>
              {latest.notes && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  {latest.notes}
                </p>
              )}
            </div>
          )}

          {items.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                History
              </p>
              {items.slice(1).map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
                >
                  <span className="text-gray-600 dark:text-gray-300">
                    {formatDate(entry.createdAt)}
                  </span>
                  <span className="tabular-nums text-gray-900 dark:text-white">
                    S {formatLiftDisplay(entry)} · B {formatBenchDisplay(entry)}{" "}
                    · D {formatDeadliftDisplay(entry)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
