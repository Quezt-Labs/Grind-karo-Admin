import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarClock, Clock, IndianRupee } from "lucide-react";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { Button } from "@/components/ui/Button";
import {
  coachingSubscriptionService,
  type CoachingRenewalRow,
} from "@/services/coachingSubscriptionService";
import { useIsAdmin } from "@/hooks/useRole";

const WINDOW_OPTIONS = [7, 14, 30] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function CoachingRenewalsPage() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [expiringWithinDays, setExpiringWithinDays] = useState<number>(7);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["coaching-renewals", expiringWithinDays],
    queryFn: () =>
      coachingSubscriptionService.listRenewals({ expiringWithinDays }),
  });

  const graceDays = data?.graceDays ?? 3;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renewals & overdue"
        description="Athletes whose coaching is expiring, in grace, or recently lapsed — so no renewal slips through the notification feed."
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Expiring window:
        </span>
        {WINDOW_OPTIONS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setExpiringWithinDays(days)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              expiringWithinDays === days
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300",
            )}
          >
            {days} days
          </button>
        ))}
      </div>

      {isError && <ErrorAlert message="Could not load renewals feed." />}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <RenewalSection
            title="Overdue — in grace"
            tone="amber"
            icon={AlertTriangle}
            emptyLabel={`No overdue athletes inside the ${graceDays}-day grace window.`}
            description={`Payment overdue but still has access for up to ${graceDays} days. Record payment to continue from the due date.`}
            rows={data?.overdueGrace ?? []}
            onOpen={(row) =>
              navigate(
                isAdmin
                  ? `/users/${row.userId}?tab=coaching#record-payment-panel`
                  : `/coach/athletes/${row.userId}?tab=plan`,
              )
            }
          />

          <RenewalSection
            title="Expiring soon"
            tone="indigo"
            icon={CalendarClock}
            emptyLabel="No plans expiring in this window."
            description="Active plans approaching their renewal date."
            rows={data?.expiringSoon ?? []}
            onOpen={(row) =>
              navigate(
                isAdmin
                  ? `/users/${row.userId}?tab=coaching#record-payment-panel`
                  : `/coach/athletes/${row.userId}?tab=plan`,
              )
            }
          />

          <RenewalSection
            title="Recently expired"
            tone="red"
            icon={Clock}
            emptyLabel="No recently expired plans."
            description="Access has ended but the athlete can still be renewed."
            rows={data?.recentlyExpired ?? []}
            onOpen={(row) =>
              navigate(
                isAdmin
                  ? `/users/${row.userId}?tab=coaching#record-payment-panel`
                  : `/coach/athletes/${row.userId}?tab=plan`,
              )
            }
          />
        </div>
      )}
    </div>
  );
}

const TONE_STYLES = {
  amber: {
    header: "text-amber-700 dark:text-amber-300",
    iconWrap:
      "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  indigo: {
    header: "text-indigo-700 dark:text-indigo-300",
    iconWrap:
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300",
    badge:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  red: {
    header: "text-red-700 dark:text-red-300",
    iconWrap: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
} as const;

type Tone = keyof typeof TONE_STYLES;

function RenewalSection({
  title,
  tone,
  icon: Icon,
  description,
  emptyLabel,
  rows,
  onOpen,
}: {
  title: string;
  tone: Tone;
  icon: typeof AlertTriangle;
  description: string;
  emptyLabel: string;
  rows: CoachingRenewalRow[];
  onOpen: (row: CoachingRenewalRow) => void;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-3 border-b border-gray-100 p-4 dark:border-gray-700">
        <div className={cn("rounded-lg p-2", styles.iconWrap)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={cn("text-sm font-semibold", styles.header)}>
              {title}
            </h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                styles.badge,
              )}
            >
              {rows.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((row) => (
            <li
              key={row.subscriptionId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {row.userName?.trim() || row.userEmail}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {row.planName} · {formatDate(row.expiresAt)}
                  {row.totalAmount > 0 && (
                    <>
                      {" · "}
                      <span className="inline-flex items-center gap-0.5 tabular-nums">
                        <IndianRupee className="h-3 w-3" />
                        {formatINR(row.totalAmount).replace("₹", "")}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    styles.badge,
                  )}
                >
                  {row.daysOverdue > 0
                    ? `${row.daysOverdue}d overdue`
                    : row.daysLeft === 0
                      ? "due today"
                      : `${row.daysLeft}d left`}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onOpen(row)}
                >
                  Record payment
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
