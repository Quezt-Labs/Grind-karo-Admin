import { ExternalLink, User } from "lucide-react";
import { Link } from "react-router-dom";
import { FormCheckHandlerBadge } from "@/components/form-check/FormCheckHandlerBadge";
import { Spinner } from "@/components/ui/Spinner";
import type { FormCheckMissingAthlete } from "@/services/formCheckInboxService";
import type { PlanTier } from "@/hooks/useFormCheckInboxRoute";
import { cn } from "@/utils/cn";

function athleteLabel(
  athlete: Pick<FormCheckMissingAthlete, "userName" | "userEmail">,
) {
  return athlete.userName?.trim() || athlete.userEmail;
}

export function FormCheckMissingList({
  planTier,
  athletes,
  isLoading,
}: {
  planTier: PlanTier;
  athletes: FormCheckMissingAthlete[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (athletes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
        <User className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No {planTier.toUpperCase()} athletes missing a form-check upload this
          week.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Athletes due a form-check this subscription week (MEGA weeks 2/4, ULTRA
        any week) with zero uploads in the current week window.
      </p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {athletes.map((athlete) => (
          <div
            key={athlete.userId}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-rose-200 bg-white px-4 py-3 shadow-sm dark:border-rose-900/50 dark:bg-gray-800",
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                to={`/users/${athlete.userId}`}
                className="inline-flex items-center gap-1 truncate text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {athleteLabel(athlete)}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </Link>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {athlete.userEmail}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <FormCheckHandlerBadge
                  formCheckHandler={athlete.formCheckHandler}
                  formCheckCoachName={athlete.formCheckCoachName}
                />
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  Sub week {athlete.subscriptionWeek}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  Block {athlete.blockStartWeek}–{athlete.blockEndWeek}
                </span>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
              0 uploads
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
