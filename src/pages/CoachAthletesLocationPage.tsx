import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Globe2, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { athleteAssignmentService } from "@/services/athleteAssignmentService";
import {
  buildLocationSummary,
  filterGroupsByState,
  groupAthletesByState,
  UNKNOWN_LOCATION_KEY,
} from "@/lib/athleteLocationGroups";
import { PENDING_STATE_KEY } from "@/lib/indianStates";
import { formatAthleteLocation } from "@/lib/indianStates";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";

export function CoachAthletesLocationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["athlete-locations", user?.role],
    queryFn: () => athleteAssignmentService.listAssignedAthletes(),
  });

  const summary = useMemo(
    () => buildLocationSummary(data?.items ?? []),
    [data?.items],
  );
  const groups = useMemo(
    () => groupAthletesByState(data?.items ?? []),
    [data?.items],
  );
  const visibleGroups = useMemo(
    () => filterGroupsByState(groups, selectedState),
    [groups, selectedState],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Athlete locations"
        description={
          isAdmin
            ? "All active coaching members — grouped by state."
            : "See where your assigned athletes are based — grouped by state."
        }
      >
        <Link
          to={isAdmin ? "/users" : "/coach/athletes"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <Users className="h-4 w-4" />
          {isAdmin ? "Coaching setup" : "Full roster"}
        </Link>
      </PageHeader>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
      {isError && <ErrorAlert message="Failed to load athlete locations." />}

      {!isLoading && !isError && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label={isAdmin ? "Active coaching members" : "Assigned athletes"}
              value={String(summary.total)}
              icon={
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              }
              iconBg="bg-indigo-50 dark:bg-indigo-900/30"
            />
            <SummaryCard
              label="States / UTs covered"
              value={String(summary.statesCount)}
              icon={
                <Globe2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              }
              iconBg="bg-emerald-50 dark:bg-emerald-900/30"
            />
            <SummaryCard
              label="State not selected"
              value={String(summary.pendingState)}
              icon={
                <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              }
              iconBg="bg-amber-50 dark:bg-amber-900/30"
              hint={
                summary.pendingState > 0
                  ? "City saved — ask athlete to pick state in intake"
                  : summary.missingLocation > 0
                    ? `${summary.missingLocation} with no city or state`
                    : "Everyone has state on file"
              }
            />
          </div>

          {groups.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Filter by state
              </p>
              <div className="flex flex-wrap gap-2">
                <StateChip
                  label="All"
                  count={summary.total}
                  active={selectedState === null}
                  onClick={() => setSelectedState(null)}
                />
                {groups.map((group) => (
                  <StateChip
                    key={group.stateKey}
                    label={group.state}
                    count={group.athletes.length}
                    active={selectedState === group.stateKey}
                    muted={
                      group.stateKey === UNKNOWN_LOCATION_KEY ||
                      group.stateKey === PENDING_STATE_KEY
                    }
                    onClick={() =>
                      setSelectedState(
                        selectedState === group.stateKey
                          ? null
                          : group.stateKey,
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {visibleGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-600 dark:bg-gray-800">
              <MapPin className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                {isAdmin
                  ? "No active coaching members yet"
                  : "No athletes assigned yet"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {isAdmin
                  ? "Location breakdown will appear here once members have active coaching."
                  : "Location breakdown will appear here once athletes are assigned to you."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {visibleGroups.map((group) => (
                <section
                  key={group.stateKey}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
                    <div className="flex items-center gap-2">
                      <MapPin
                        className={cn(
                          "h-4 w-4",
                          group.stateKey === UNKNOWN_LOCATION_KEY ||
                            group.stateKey === PENDING_STATE_KEY
                            ? "text-amber-500"
                            : "text-indigo-500",
                        )}
                      />
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {group.state}
                      </h2>
                      {group.source === "pending" && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                          city only
                        </span>
                      )}
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300">
                        {group.athletes.length}
                      </span>
                    </div>
                    {group.cities.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Cities: {group.cities.join(", ")}
                      </p>
                    )}
                  </div>

                  <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {group.athletes.map((athlete) => (
                      <li key={athlete.athleteId}>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              isAdmin
                                ? `/users/${athlete.athleteId}`
                                : `/coach/athletes/${athlete.athleteId}`,
                            )
                          }
                          className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                              {athlete.athleteName || "Unnamed"}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {athlete.athleteEmail}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm text-gray-700 dark:text-gray-200">
                              {formatAthleteLocation(
                                athlete.city,
                                athlete.state,
                              )}
                            </p>
                            {athlete.programsPurchased.length > 0 && (
                              <p className="mt-0.5 max-w-[220px] truncate text-xs text-gray-500">
                                {athlete.programsPurchased.join(", ")}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  iconBg,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <div className={cn("rounded-lg p-3", iconBg)}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StateChip({
  label,
  count,
  active,
  muted,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500"
          : muted
            ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
            : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-gray-700",
      )}
    >
      <span className="max-w-[180px] truncate">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
          active
            ? "bg-indigo-500 text-white"
            : "bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300",
        )}
      >
        {count}
      </span>
    </button>
  );
}
