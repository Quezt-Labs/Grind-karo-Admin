import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/ShadTable";
import { athleteAssignmentService } from "@/services/athleteAssignmentService";
import { cn } from "@/utils/cn";
import { formatAthleteLocation } from "@/lib/indianStates";

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
      >
        <Link
          to="/coach/locations"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <MapPin className="h-4 w-4" />
          View by location
        </Link>
      </PageHeader>

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
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50 dark:bg-gray-900/40">
              <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Athlete
                </TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Location
                </TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Program purchased
                </TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Personal coaching
                </TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Form check
                </TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Assigned
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No athletes assigned yet.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((row) => (
                  <TableRow
                    key={row.athleteId}
                    className="cursor-pointer"
                    onClick={() => navigate(`/coach/athletes/${row.athleteId}`)}
                  >
                    <TableCell className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {row.athleteName || "Unnamed"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {row.athleteEmail}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatAthleteLocation(row.city, row.state)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {row.programsPurchased.length > 0
                        ? row.programsPurchased.join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusPill active={row.personalCoachingEnabled} />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusPill active={row.formCheckEnabled} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(row.assignedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
