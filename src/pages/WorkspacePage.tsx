import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Phone,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { formCheckInboxService } from "@/services/formCheckInboxService";
import { formCheckKeys } from "@/hooks/formCheckQueryKeys";
import { useFormCheckPendingCount } from "@/hooks/useFormCheckPendingCount";
import { coachOpsService } from "@/services/coachOpsService";
import { userService } from "@/services/userService";
import { cn } from "@/utils/cn";
import { formatWeekDateRange } from "@/utils/weekDates";
import type { CoachingSetupMember } from "@/types/user";
import type {
  CoachOpsBoardItem,
  ProgramEndingSoonItem,
} from "@/types/coachOps";

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

function daysWaitingLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return null;
  const days = Math.max(
    0,
    Math.floor((Date.now() - start.getTime()) / 86_400_000),
  );
  if (days === 0) return "Today";
  if (days === 1) return "1d waiting";
  return `${days}d waiting`;
}

function pendingProgramDateLabel(row: CoachingSetupMember): string {
  const wait =
    daysWaitingLabel(row.intakeCompletedAt) ??
    daysWaitingLabel(row.subscribedAt);
  const parts: string[] = [row.planName];
  if (wait) parts.push(wait);
  if (row.expiresAt) parts.push(`Sub ends ${formatShortDate(row.expiresAt)}`);
  return parts.join(" · ");
}

function weekUrgency(row: ProgramEndingSoonItem): number {
  if (row.daysUntilEnd < 0) return 0;
  if (row.daysUntilEnd === 0) return 1;
  if (row.daysUntilEnd <= 2) return 2;
  return 3;
}

function isCheckInDue(item: CoachOpsBoardItem, today: string): boolean {
  if (!item.nextCheckInDate) return false;
  return item.nextCheckInDate.slice(0, 10) <= today;
}

function isOpsIncomplete(item: CoachOpsBoardItem): boolean {
  return (
    item.setupStatus !== "ready" || !item.formChecksDone || !item.paymentDone
  );
}

type FocusItem = {
  id: string;
  href: string;
  label: string;
  why: string;
  cta: string;
  tone: "rose" | "amber" | "indigo";
};

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

  const { data: pendingVideoCount = 0 } = useFormCheckPendingCount();

  const {
    data: athletesData,
    isLoading: athletesLoading,
    isError: athletesError,
  } = useQuery({
    queryKey: formCheckKeys.athletes("pending"),
    queryFn: () =>
      formCheckInboxService.listAthletes({ uncommentedOnly: true }),
  });

  const {
    data: missingData,
    isLoading: missingLoading,
    isError: missingError,
  } = useQuery({
    queryKey: formCheckKeys.missing(),
    queryFn: () => formCheckInboxService.listMissing(),
  });

  const {
    data: endingData,
    isLoading: endingLoading,
    isError: endingError,
  } = useQuery({
    queryKey: ["workspace-programs-ending", 7],
    queryFn: () => coachOpsService.listProgramsEnding({ withinDays: 7 }),
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
  const pendingPrograms = setupData?.items ?? [];

  const fcAthletes = [
    ...(athletesData?.mega ?? []),
    ...(athletesData?.ultra ?? []),
  ]
    .filter((a) => a.pendingCount > 0)
    .sort((a, b) => b.pendingCount - a.pendingCount);
  const fcAthleteCount = fcAthletes.length;

  const missingAthletes = [
    ...(missingData?.mega ?? []),
    ...(missingData?.ultra ?? []),
  ];
  const missingTotal = missingData?.total ?? missingAthletes.length;

  const endingItems = [...(endingData?.items ?? [])].sort((a, b) => {
    const urg = weekUrgency(a) - weekUrgency(b);
    if (urg !== 0) return urg;
    return a.daysUntilEnd - b.daysUntilEnd;
  });
  const urgentEnding = endingItems.filter((r) => r.daysUntilEnd <= 2);
  const endingPreview = endingItems.slice(0, 8);

  const opsItems = opsBoard?.items ?? [];
  const checkInsDue = opsItems.filter((i) => isCheckInDue(i, today));
  const opsNeedsAttention = opsItems.filter(
    (i) => isOpsIncomplete(i) || isCheckInDue(i, today),
  );
  const opsFormOpen = opsItems.filter((i) => !i.formChecksDone).length;
  const opsPayOpen = opsItems.filter((i) => !i.paymentDone).length;
  const programNeeded = opsItems.filter(
    (i) => i.setupStatus !== "ready",
  ).length;

  const focusItems: FocusItem[] = [];
  for (const row of endingItems) {
    if (focusItems.length >= 5) break;
    if (row.daysUntilEnd > 1) break;
    const overdue = row.daysUntilEnd < 0;
    focusItems.push({
      id: `week-${row.programId}`,
      href: `/coaching/${row.athleteId}/editor`,
      label: athleteName(row.athleteName, row.athleteEmail),
      why: overdue
        ? `Week ended ${Math.abs(row.daysUntilEnd)}d ago — build next`
        : row.daysUntilEnd === 0
          ? "Last week ends today — build next"
          : "Last week ends tomorrow — build next",
      cta: "Build",
      tone: overdue ? "rose" : "amber",
    });
  }
  for (const row of pendingPrograms) {
    if (focusItems.length >= 5) break;
    if (focusItems.some((f) => f.id === `prog-${row.id}`)) continue;
    focusItems.push({
      id: `prog-${row.id}`,
      href: `/coaching/${row.id}/editor`,
      label: athleteName(row.name, row.email),
      why: pendingProgramDateLabel(row),
      cta: "Assign",
      tone: "indigo",
    });
  }
  for (const row of fcAthletes) {
    if (focusItems.length >= 5) break;
    if (focusItems.some((f) => f.href.includes(row.userId))) continue;
    focusItems.push({
      id: `fc-${row.userId}`,
      href: `/form-checks?review=pending&userId=${row.userId}`,
      label: athleteName(row.userName, row.userEmail),
      why: `${row.pendingCount} video${row.pendingCount === 1 ? "" : "s"} awaiting review`,
      cta: "Review",
      tone: "amber",
    });
  }
  for (const row of checkInsDue.slice(0, 2)) {
    if (focusItems.length >= 5) break;
    if (focusItems.some((f) => f.id === `call-${row.athleteId}`)) continue;
    focusItems.push({
      id: `call-${row.athleteId}`,
      href: "/coach/ops-board?view=checkins",
      label: athleteName(row.athleteName, row.athleteEmail),
      why: `Check-in due ${formatShortDate(row.nextCheckInDate!)}`,
      cta: "Open",
      tone: "indigo",
    });
  }

  const statsLoading =
    setupLoading || athletesLoading || missingLoading || endingLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace"
        description={`${todayLabel} · ${awaitingProgram} programs · ${fcAthleteCount} athletes need FC · ${urgentEnding.length} weeks urgent`}
      />

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
            subtitle="Awaiting first / next program"
            icon={ClipboardList}
            to="/users?tab=coaching-setup"
            tone="indigo"
            error={setupError}
          />
          <SummaryCard
            title="Form checks"
            value={fcAthleteCount}
            subtitle={
              missingTotal > 0
                ? `${pendingVideoCount} videos · ${missingTotal} missing uploads`
                : `${pendingVideoCount} videos awaiting review`
            }
            icon={Video}
            to="/form-checks?review=pending"
            secondaryTo="/form-checks?view=missing"
            secondaryLabel="Missing uploads"
            tone="amber"
            error={athletesError || missingError}
          />
          <SummaryCard
            title="Weeks ending"
            value={urgentEnding.length}
            subtitle={`${endingItems.length} in next 7 days · show urgent first`}
            icon={CalendarClock}
            to="#weeks-ending"
            tone="rose"
            error={endingError}
          />
        </div>
      )}

      {/* Today's focus */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Today&apos;s focus
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Highest-priority coaching work right now.
            </p>
          </div>
        </div>
        {statsLoading || opsLoading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Shimmer key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : focusItems.length === 0 ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Nothing urgent — queues look clear.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-700">
            {focusItems.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/30"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {item.label}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          item.tone === "rose"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                            : item.tone === "amber"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
                        )}
                      >
                        {item.cta}
                      </span>
                    </div>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {item.why}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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
            href: `/coaching/${row.id}/editor`,
            primary: athleteName(row.name, row.email),
            secondary: pendingProgramDateLabel(row),
            actionLabel: "Build" as const,
          }))}
        />

        <SectionCard
          title="Athletes needing review"
          href="/form-checks?review=pending"
          emptyLabel="No athletes with pending form checks."
          loading={athletesLoading}
          error={athletesError ? "Could not load form checks." : null}
          headerExtra={
            missingTotal > 0 ? (
              <Link
                to="/form-checks?view=missing"
                className="text-xs font-semibold text-amber-700 hover:underline dark:text-amber-300"
              >
                {missingTotal} missing
              </Link>
            ) : null
          }
          rows={fcAthletes.slice(0, 8).map((row) => ({
            id: row.userId,
            href: `/form-checks?review=pending&userId=${row.userId}`,
            primary: athleteName(row.userName, row.userEmail),
            secondary: `${row.pendingCount} pending · ${row.formCheckCoachName ?? row.formCheckHandler}`,
            actionLabel: "Review" as const,
            badge: row.pendingCount >= 5 ? ("Hot" as const) : undefined,
            badgeTone: "rose" as const,
          }))}
        />

        <div id="weeks-ending">
          <SectionCard
            title="Weeks ending soon"
            href="/coach/ops-board?view=attention"
            emptyLabel="No scheduled weeks ending in the next 7 days."
            loading={endingLoading}
            error={endingError ? "Could not load ending weeks." : null}
            rows={endingPreview.map((row) => {
              const overdue = row.daysUntilEnd < 0;
              const dateRange =
                formatWeekDateRange(row.weekStart, row.weekEnd) ??
                `until ${row.weekEnd}`;
              const weekLabel =
                row.weekTitle?.trim() || `Week ${row.weekNumber}`;
              return {
                id: `${row.programId}-${row.weekEnd}`,
                href: `/coaching/${row.athleteId}/editor`,
                primary: athleteName(row.athleteName, row.athleteEmail),
                secondary: `${weekLabel} · ${dateRange}`,
                actionLabel: "Build" as const,
                badge: overdue
                  ? ("Ended" as const)
                  : row.daysUntilEnd === 0
                    ? ("Today" as const)
                    : row.daysUntilEnd === 1
                      ? ("Tomorrow" as const)
                      : (`${row.daysUntilEnd}d` as const),
                badgeTone: overdue
                  ? ("rose" as const)
                  : row.daysUntilEnd <= 1
                    ? ("amber" as const)
                    : ("amber" as const),
              };
            })}
          />
        </div>
      </div>

      {/* Thin ops strip */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Daily ops
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Checklist + check-ins — open only what still needs work.
            </p>
            {!opsLoading && !opsError && opsItems.length > 0 ? (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                {opsNeedsAttention.length} need attention · {programNeeded}{" "}
                program gaps · {opsFormOpen} FC open · {opsPayOpen} payment open
                {checkInsDue.length > 0
                  ? ` · ${checkInsDue.length} check-in${checkInsDue.length === 1 ? "" : "s"} due`
                  : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {checkInsDue.length > 0 ? (
              <Link
                to="/coach/ops-board?view=checkins"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <Phone className="h-4 w-4" />
                Check-ins ({checkInsDue.length})
              </Link>
            ) : null}
            <Link
              to="/coach/ops-board?view=attention"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Open ops board
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {opsError ? (
          <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">
            Could not load today&apos;s ops board.
          </p>
        ) : opsLoading ? (
          <div className="mt-4">
            <Shimmer className="h-10 w-full rounded-lg" />
          </div>
        ) : checkInsDue.length > 0 ? (
          <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-700">
            {checkInsDue.slice(0, 4).map((item) => (
              <li
                key={item.athleteId}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {athleteName(item.athleteName, item.athleteEmail)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Due {formatShortDate(item.nextCheckInDate!)}
                    {item.opsNotes ? ` · ${item.opsNotes}` : ""}
                  </p>
                </div>
                <Link
                  to="/coach/ops-board?view=checkins"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        ) : opsNeedsAttention.length === 0 ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Ops clear for today.
          </div>
        ) : null}
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

  const isHash = to.startsWith("#");

  return (
    <a
      href={isHash ? to : undefined}
      onClick={(e) => {
        if (isHash) {
          e.preventDefault();
          document.querySelector(to)?.scrollIntoView({ behavior: "smooth" });
          return;
        }
        e.preventDefault();
        navigate(to);
      }}
      className="block cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-200 hover:bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-800 dark:hover:bg-gray-800/80 sm:p-5"
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
    </a>
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
