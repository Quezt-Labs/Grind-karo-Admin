import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { athleteAssignmentService } from "@/services/athleteAssignmentService";
import { cn } from "@/utils/cn";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CoachAthletesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["coach-assigned-athletes"],
    queryFn: () => athleteAssignmentService.listAssignedAthletes(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My athletes"
        description="Athletes assigned to you for coaching and support."
      />

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-900/30">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total assigned athletes
            </p>
            <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
              {data?.total ?? 0}
            </p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
      {isError && <ErrorAlert message="Failed to load assigned athletes." />}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Athlete
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Program purchased
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Personal coaching
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Form check
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Assigned
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {(data?.items ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No athletes assigned yet.
                  </td>
                </tr>
              ) : (
                data?.items.map((row) => (
                  <tr
                    key={row.athleteId}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    onClick={() => navigate(`/coach/athletes/${row.athleteId}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {row.athleteName || "Unnamed"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {row.athleteEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {row.programsPurchased.length > 0
                        ? row.programsPurchased.join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill active={row.personalCoachingEnabled} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill active={row.formCheckEnabled} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(row.assignedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        active
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
      )}
    >
      {active ? "ON" : "OFF"}
    </span>
  );
}
