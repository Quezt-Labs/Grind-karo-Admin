import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { formCheckInboxService } from "@/services/formCheckInboxService";
import { formCheckKeys } from "@/hooks/formCheckQueryKeys";
import { useFormCheckPendingCount } from "@/hooks/useFormCheckPendingCount";
import { coachingSubscriptionService } from "@/services/coachingSubscriptionService";
import { userService } from "@/services/userService";
import { cn } from "@/utils/cn";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function athleteName(name: string | null | undefined, email: string) {
  return name?.trim() || email;
}

export function WorkspacePage() {
  const {
    data: setupData,
    isLoading: setupLoading,
    isError: setupError,
  } = useQuery({
    queryKey: ["workspace-coaching-setup"],
    queryFn: () =>
      userService.getCoachingSetup({
        status: "awaiting_program",
        limit: 8,
      }),
  });

  const { data: pendingReviewCount = 0 } = useFormCheckPendingCount();

  const {
    data: missingData,
    isLoading: missingLoading,
    isError: missingError,
  } = useQuery({
    queryKey: formCheckKeys.missing(),
    queryFn: () => formCheckInboxService.listMissing(),
  });

  const {
    data: renewalsData,
    isLoading: renewalsLoading,
    isError: renewalsError,
  } = useQuery({
    queryKey: ["workspace-renewals", 7],
    queryFn: () =>
      coachingSubscriptionService.listRenewals({ expiringWithinDays: 7 }),
  });

  const awaitingProgram = setupData?.counts.awaitingProgram ?? 0;
  const missingTotal = missingData?.total ?? 0;
  const renewalsDue =
    (renewalsData?.counts.expiringSoon ?? 0) +
    (renewalsData?.counts.overdueGrace ?? 0);

  const pendingPrograms = setupData?.items ?? [];
  const renewalPreview = [
    ...(renewalsData?.overdueGrace ?? []),
    ...(renewalsData?.expiringSoon ?? []),
  ].slice(0, 8);

  const isLoading = setupLoading || missingLoading || renewalsLoading;
  const hasError = setupError || missingError || renewalsError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace"
        description="Today's coaching queue — programs to assign, form checks, and renewals."
      />

      {hasError ? (
        <ErrorAlert message="Could not load some workspace sections." />
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Pending programs"
            value={awaitingProgram}
            subtitle="Awaiting program assignment"
            icon={ClipboardList}
            to="/users?tab=coaching-setup"
            tone="indigo"
          />
          <SummaryCard
            title="Form checks"
            value={pendingReviewCount}
            subtitle={
              missingTotal > 0
                ? `${missingTotal} missing upload${missingTotal === 1 ? "" : "s"} this week`
                : "Videos awaiting review"
            }
            icon={Video}
            to="/form-checks?review=pending"
            secondaryTo="/form-checks?view=missing"
            secondaryLabel="View missing"
            tone="amber"
          />
          <SummaryCard
            title="Upcoming payments"
            value={renewalsDue}
            subtitle="Expiring soon or in grace"
            icon={CalendarClock}
            to="/coaching-renewals"
            tone="rose"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          title="Pending programs"
          href="/users?tab=coaching-setup"
          emptyLabel="No athletes awaiting a program."
          rows={pendingPrograms.map((row) => ({
            id: row.id,
            primary: athleteName(row.name, row.email),
            secondary: row.planName,
            href: `/users/${row.id}`,
          }))}
          loading={setupLoading}
        />

        <SectionCard
          title="Form checks"
          href="/form-checks?review=pending"
          emptyLabel="No form-check alerts right now."
          headerExtra={
            <Link
              to="/form-checks?view=missing"
              className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Missing uploads
            </Link>
          }
          rows={[
            {
              id: "pending-review",
              primary: `${pendingReviewCount} pending review`,
              secondary: "Open the inbox to leave feedback",
              href: "/form-checks?review=pending",
            },
            {
              id: "missing-uploads",
              primary: `${missingTotal} missing this week`,
              secondary: "Due athletes with zero uploads",
              href: "/form-checks?view=missing",
            },
          ].filter((row) => {
            if (row.id === "pending-review") return pendingReviewCount > 0;
            return missingTotal > 0;
          })}
          loading={missingLoading}
        />

        <SectionCard
          title="Upcoming payments / renewals"
          href="/coaching-renewals"
          emptyLabel="No renewals due in the next 7 days."
          rows={renewalPreview.map((row) => ({
            id: row.subscriptionId,
            primary: athleteName(row.userName, row.userEmail),
            secondary: `${row.planName} · ${
              row.daysOverdue > 0
                ? `${row.daysOverdue}d overdue`
                : `expires ${formatDate(row.expiresAt)}`
            }`,
            href: `/users/${row.userId}?tab=coaching`,
          }))}
          loading={renewalsLoading}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Daily ops board
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Checklist for today&apos;s coaching tasks.
            </p>
          </div>
          <Link
            to="/coach/ops-board"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Open ops board
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  to,
  secondaryTo,
  secondaryLabel,
  tone,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof Video;
  to: string;
  secondaryTo?: string;
  secondaryLabel?: string;
  tone: "indigo" | "amber" | "rose";
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>
        <div className={cn("rounded-lg p-3", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Open
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        {secondaryTo && secondaryLabel ? (
          <Link
            to={secondaryTo}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  href,
  emptyLabel,
  rows,
  loading,
  headerExtra,
}: {
  title: string;
  href: string;
  emptyLabel: string;
  rows: Array<{
    id: string;
    primary: string;
    secondary: string;
    href: string;
  }>;
  loading?: boolean;
  headerExtra?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {headerExtra}
          <Link
            to={href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={row.href}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {row.primary}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {row.secondary}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
