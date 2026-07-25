import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";

interface WeightLog {
  id: string;
  weightKg: string;
  loggedOn: string;
  notes: string | null;
}

interface NutritionLog {
  id: string;
  loggedOn: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
  notes: string | null;
}

interface CompetitionMilestone {
  label: string;
  daysOut: number;
  date: string;
  isPast: boolean;
}

interface Competition {
  id: string;
  name: string;
  meetDate: string;
  federation: string | null;
  weightClass: string | null;
  notes: string | null;
  daysLeft: number;
  milestones: CompetitionMilestone[];
}

interface UserTrackersPanelProps {
  userId: string;
  kind: "weight" | "nutrition" | "competition";
}

function daysLeftLabel(daysLeft: number): string {
  if (daysLeft > 1) return `${daysLeft} days left`;
  if (daysLeft === 1) return "1 day left";
  if (daysLeft === 0) return "Meet day";
  if (daysLeft === -1) return "1 day ago";
  return `${Math.abs(daysLeft)} days ago`;
}

function formatIsoDate(iso: string, withWeekday = false): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    weekday: withWeekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: withWeekday ? "numeric" : undefined,
  });
}

export function UserTrackersPanel({ userId, kind }: UserTrackersPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-trackers", kind, userId],
    queryFn: async () => {
      const { data: raw } = await api.get(`/admin/trackers/${userId}/${kind}`);
      if (raw == null) return null;
      const unwrapped =
        typeof raw === "object" &&
        raw !== null &&
        "data" in raw &&
        (raw as { data: unknown }).data !== undefined
          ? (raw as { data: unknown }).data
          : raw;
      return unwrapped as WeightLog[] | NutritionLog[] | Competition | null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-red-500">
        Failed to load{" "}
        {kind === "weight"
          ? "bodyweight"
          : kind === "nutrition"
            ? "nutrition"
            : "competition"}{" "}
        data.
      </p>
    );
  }

  if (kind === "competition") {
    const meet = data as Competition | null;
    if (!meet) {
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No active competition set.
        </p>
      );
    }

    return (
      <div className="space-y-3 rounded-lg border border-gray-200 px-3 py-3 text-sm dark:border-gray-700">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {meet.name}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {formatIsoDate(meet.meetDate, true)} ·{" "}
            {daysLeftLabel(meet.daysLeft)}
          </p>
          {(meet.federation || meet.weightClass) && (
            <p className="mt-0.5 text-xs text-gray-500">
              {[meet.federation, meet.weightClass].filter(Boolean).join(" · ")}
            </p>
          )}
          {meet.notes && (
            <p className="mt-1 text-xs text-gray-500">{meet.notes}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Peaking timeline
          </p>
          <ul className="mt-1.5 space-y-1">
            {meet.milestones.map((m) => (
              <li
                key={`${m.daysOut}-${m.label}`}
                className={`flex justify-between gap-2 text-xs ${
                  m.isPast
                    ? "text-gray-400 line-through"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                <span>{m.label}</span>
                <span className="shrink-0 tabular-nums text-gray-500">
                  {formatIsoDate(m.date)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (!Array.isArray(data) || !data.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No {kind === "weight" ? "bodyweight" : "nutrition"} logs yet.
      </p>
    );
  }

  if (kind === "weight") {
    return (
      <ul className="space-y-2">
        {(data as WeightLog[]).map((row) => (
          <li
            key={row.id}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
          >
            <span className="font-semibold">
              {Number(row.weightKg).toFixed(1)} kg
            </span>
            <span className="ml-2 text-xs text-gray-500">{row.loggedOn}</span>
            {row.notes && (
              <p className="mt-0.5 text-xs text-gray-500">{row.notes}</p>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-2">
      {(data as NutritionLog[]).map((row) => (
        <li
          key={row.id}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
        >
          <span className="font-semibold">{row.loggedOn}</span>
          <p className="mt-0.5 text-xs text-gray-500">
            {[
              row.calories != null ? `${row.calories} kcal` : null,
              row.proteinG != null ? `P ${row.proteinG}g` : null,
              row.carbsG != null ? `C ${row.carbsG}g` : null,
              row.fatG != null ? `F ${row.fatG}g` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "No macros"}
          </p>
          {row.notes && (
            <p className="mt-0.5 text-xs text-gray-500">{row.notes}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
