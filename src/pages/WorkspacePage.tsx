import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
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
import { coachOpsService } from "@/services/coachOpsService";
import { userService } from "@/services/userService";
import { cn } from "@/utils/cn";
import type { CoachingSetupMember } from "@/types/user";
import type { CoachOpsBoardItem } from "@/types/coachOps";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function athleteName(name: string | null | undefined, email: string) {
  return name?.trim() || email;
}

function pendingProgramDateLabel(row: CoachingSetupMember): string {
  const parts: string[] = [];
  if (row.intakeCompletedAt) {
    parts.push(`Intake ${formatShortDate(row.intakeCompletedAt)}`);
  } else if (row.subscribedAt) {
    parts.push(`Subscribed ${formatShortDate(row.subscribedAt)}`);
  }
  if (row.expiresAt) {
    parts.push(`Ends ${formatShortDate(row.expiresAt)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Date unknown";
}

function isOpsIncomplete(item: CoachOpsBoardItem): boolean {
  return !item.formChecksDone || !item.paymentDone;
}

export function WorkspacePage() {
  const today = todayIsoDate();
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
    data: pendingVideos,
    isLoading: pendingVideosLoading,
    isError: pendingVideosError,
  } = useQuery({
    queryKey: ["workspace-form-check-pending", 6],
    queryFn: () =>
      formCheckInboxService.list({ uncommentedOnly: true, limit: 6 }),
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

  const {
    data: opsBoard,
    isLoading: opsLoading,
    isError: opsError,
  } = useQuery({
    queryKey: ["workspace-ops-board", today],
    queryFn: () => coachOpsService.getBoard({ date: today }),
  });

  const awaitingProgram = setupData?.counts.awaitingProgram ?? 0;
  const missingAthletes = [
    ...(missingData?.mega ?? []),
    ...(missingData?.ultra ?? []),
  ];
  const missingTotal = missingData?.total ?? missingAthletes.length;
  const renewalsDue =
    (renewalsData?.counts.expiringSoon ?? 0) +
    (renewalsData?.counts.overdueGrace ?? 0);

  const pendingPrograms = setupData?.items ?? [];
  const renewalPreview = [
    ...(renewalsData?.overdueGrace ?? []),
    ...(renewalsData?.expiringSoon ?? []),
  ].slice(0, 8);
  const pendingVideoItems = pendingVideos?.items ?? [];
  const missingPreview = missingAthletes.slice(0, 4);

  const opsItems = opsBoard?.items ?? [];
  const opsIncomplete = opsItems.filter(isOpsIncomplete).slice(0, 5);
  const opsFormDone = opsItems.filter((i) => i.formChecksDone).length;
  const opsPayDone = opsItems.filter((i) => i.paymentDone).length;
  const opsTotal = opsItems.length;

  const openActions = awaitingProgram + pendingReviewCount + renewalsDue;
  const statsLoading = setupLoading || missingLoading || renewalsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace"
        description={`${todayLabel} · ${openActions} action${openActions === 1 ? "" : "s"} open`}
      />

      {/* Stat strip */}
      {statsLoading ? (
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
            error={setupError}
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
            secondaryLabel="Missing"
            tone="amber"
            error={missingError || pendingVideosError}
          />
          <SummaryCard
            title="Upcoming payments"
            value={renewalsDue}
            subtitle="Expiring soon or in grace"
            icon={CalendarClock}
            to="/coaching-renewals"
            tone="rose"
            error={renewalsError}
          />
        </div>
      )}

      {/* Queues */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          title="Pending programs"
          href="/users?tab=coaching-setup"
          emptyLabel="No athletes awaiting a program."
          loading={setupLoading}
          error={setupError ? "Could not load pending programs." : null}
          rows={pendingPrograms.map((row) => ({
            id: row.id,
            href: `/users/${row.id}`,
            primary: athleteName(row.name, row.email),
            secondary: `${row.planName} · ${pendingProgramDateLabel(row)}`,
            actionLabel: "Assign" as const,
          }))}
        />

        <SectionCard
          title="Form checks"
          href="/form-checks?review=pending"
          emptyLabel="No form-check alerts right now."
          loading={pendingVideosLoading || missingLoading}
          error={
            pendingVideosError || missingError
              ? "Could not load form checks."
              : null
          }
          headerExtra={
            <Link
              to="/form-checks?view=missing"
              className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Missing
            </Link>
          }
          rows={[
            ...pendingVideoItems.map((item) => ({
              id: item.id,
              href: `/form-checks?review=pending&userId=${item.userId}`,
              primary: athleteName(item.userName, item.userEmail),
              secondary: [
                item.exerciseName,
                item.dayLabel,
                item.createdAt ? formatShortDate(item.createdAt) : null,
              ]
                .filter(Boolean)
                .join(" · "),
              actionLabel: "Review" as const,
            })),
            ...missingPreview.map((row) => ({
              id: `missing-${row.userId}`,
              href: `/form-checks?view=missing`,
              primary: athleteName(row.userName, row.userEmail),
              secondary: `${row.planName} · week ${row.subscriptionWeek} · missing`,
              badge: "Missing" as const,
              badgeTone: "amber" as const,
            })),
          ]}
        />

        <SectionCard
          title="Upcoming payments / renewals"
          href="/coaching-renewals"
          emptyLabel="No renewals due in the next 7 days."
          loading={renewalsLoading}
          error={renewalsError ? "Could not load renewals." : null}
          rows={renewalPreview.map((row) => {
            const overdue = row.daysOverdue > 0;
            return {
              id: row.subscriptionId,
              href: `/users/${row.userId}?tab=coaching`,
              primary: athleteName(row.userName, row.userEmail),
              secondary: `${row.planName} · ${
                overdue
                  ? `${row.daysOverdue}d overdue`
                  : `expires ${formatDate(row.expiresAt)}`
              }`,
              badge: overdue ? ("Overdue" as const) : ("Soon" as const),
              badgeTone: overdue ? ("rose" as const) : ("amber" as const),
            };
          })}
        />
      </div>

      {/* Daily ops preview */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Daily ops board
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Checklist for today&apos;s coaching tasks.
            </p>
            {!opsLoading && !opsError && opsTotal > 0 ? (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                Form checks {opsFormDone}/{opsTotal} · Payments {opsPayDone}/
                {opsTotal}
              </p>
            ) : null}
          </div>
          <Link
            to="/coach/ops-board"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Open ops board
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {opsError ? (
          <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">
            Could not load today&apos;s ops board.
          </p>
        ) : opsLoading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Shimmer key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : opsIncomplete.length === 0 ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            You&apos;re clear — no incomplete ops items for today.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-700">
            {opsIncomplete.map((item) => (
              <li
                key={item.athleteId}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {athleteName(item.athleteName, item.athleteEmail)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.coachName ?? "Unassigned coach"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StatusChip
                    ok={item.formChecksDone}
                    label={item.formChecksDone ? "FC done" : "FC open"}
                  />
                  <StatusChip
                    ok={item.paymentDone}
                    label={item.paymentDone ? "Paid" : "Payment open"}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
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
  error,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof Video;
  to: string;
  secondaryTo?: string;
  secondaryLabel?: string;
  tone: "indigo" | "amber" | "rose";
  error?: boolean;
}) {
  const navigate = useNavigate();
  const tones = {
    indigo:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300",
  };

  return (
    <Link
      to={to}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-200 hover:bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-800 dark:hover:bg-gray-800/80 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {error ? "Could not refresh — open to retry" : subtitle}
          </p>
        </div>
        <div className={cn("rounded-lg p-3", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {secondaryTo && secondaryLabel ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate(secondaryTo);
          }}
          className="mt-3 text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {secondaryLabel}
        </button>
      ) : null}
    </Link>
  );
}

function SectionCard({
  title,
  href,
  emptyLabel,
  rows,
  loading,
  error,
  headerExtra,
}: {
  title: string;
  href: string;
  emptyLabel: string;
  rows: Array<{
    id: string;
    href: string;
    primary: string;
    secondary: string;
    actionLabel?: string;
    badge?: string;
    badgeTone?: "amber" | "rose";
  }>;
  loading?: boolean;
  error?: string | null;
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
      ) : error ? (
        <div className="p-4">
          <ErrorAlert message={error} />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((row) => (
            <QueueRow
              key={row.id}
              href={row.href}
              primary={row.primary}
              secondary={row.secondary}
              actionLabel={row.actionLabel}
              badge={row.badge}
              badgeTone={row.badgeTone}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function QueueRow({
  href,
  primary,
  secondary,
  actionLabel,
  badge,
  badgeTone,
}: {
  href: string;
  primary: string;
  secondary: string;
  actionLabel?: string;
  badge?: string;
  badgeTone?: "amber" | "rose";
}) {
  return (
    <li>
      <Link
        to={href}
        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {primary}
            </p>
            {badge ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  badgeTone === "rose"
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                )}
              >
                {badge}
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {secondary}
          </p>
        </div>
        {actionLabel ? (
          <span className="shrink-0 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {actionLabel}
          </span>
        ) : (
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        )}
      </Link>
    </li>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        ok
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
      )}
    >
      {label}
    </span>
  );
}
