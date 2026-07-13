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

interface UserTrackersPanelProps {
  userId: string;
  kind: "weight" | "nutrition";
}

export function UserTrackersPanel({ userId, kind }: UserTrackersPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-trackers", kind, userId],
    queryFn: async () => {
      const { data: raw } = await api.get(`/admin/trackers/${userId}/${kind}`);
      return (raw.data ?? raw) as WeightLog[] | NutritionLog[];
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
    return <p className="text-sm text-red-500">Failed to load {kind} logs.</p>;
  }

  if (!data?.length) {
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
