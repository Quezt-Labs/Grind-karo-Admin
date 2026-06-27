import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CreditCard } from "lucide-react";
import { coachingSubscriptionService } from "@/services/coachingSubscriptionService";
import type { CoachingBillingAdjustment } from "@/services/coachingSubscriptionService";
import { PurchaseDatesEditor } from "@/components/users/PurchaseDatesEditor";
import type { Purchase } from "@/types/user";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

type MilestoneStatus =
  | "paid"
  | "upcoming"
  | "expired"
  | "waived"
  | "extended"
  | "manual";

type Milestone = {
  label: string;
  date: string;
  amount?: number;
  status: MilestoneStatus;
  note?: string;
};

const ADJUSTMENT_LABEL: Record<CoachingBillingAdjustment["type"], string> = {
  EXTEND: "Access extended (admin)",
  WAIVE: "Fee waived / hold",
  MANUAL_PAYMENT: "Manual payment recorded",
  DATE_CORRECTION: "Dates corrected",
};

function coachingMilestones(
  sub: Extract<Purchase, { kind: "coaching_subscription" }>,
  adjustments: CoachingBillingAdjustment[],
): Milestone[] {
  const start = new Date(sub.startDate);
  const end = new Date(sub.expiresAt);
  const now = new Date();
  const slug = sub.planSlug.toLowerCase();
  const isMonthly = slug.includes("ultra");
  const subAdjustments = adjustments.filter(
    (row) => row.subscriptionId === sub.id,
  );

  const milestones: Milestone[] = [
    {
      label: "Plan started",
      date: sub.startDate,
      amount: sub.totalAmount,
      status: start <= now ? "paid" : "upcoming",
    },
  ];

  if (isMonthly) {
    let cursor = addMonths(start, 1);
    let installment = 2;
    while (cursor < end) {
      const waived = subAdjustments.some((row) => {
        if (row.type !== "WAIVE" || !row.periodStart || !row.periodEnd)
          return false;
        const periodStart = new Date(row.periodStart).getTime();
        const periodEnd = new Date(row.periodEnd).getTime();
        const due = cursor.getTime();
        return due >= periodStart && due <= periodEnd;
      });

      milestones.push({
        label: waived
          ? `Renewal ${installment} (waived)`
          : `Renewal ${installment}`,
        date: cursor.toISOString(),
        amount: waived ? undefined : sub.totalAmount,
        status: waived ? "waived" : cursor <= now ? "paid" : "upcoming",
      });
      cursor = addMonths(cursor, 1);
      installment += 1;
    }
  }

  milestones.push({
    label: sub.status === "ACTIVE" ? "Plan expires" : "Expired",
    date: sub.expiresAt,
    status: end < now || sub.status !== "ACTIVE" ? "expired" : "upcoming",
  });

  for (const row of subAdjustments) {
    milestones.push({
      label: ADJUSTMENT_LABEL[row.type],
      date: row.createdAt,
      amount: row.amount ?? undefined,
      status:
        row.type === "WAIVE"
          ? "waived"
          : row.type === "EXTEND"
            ? "extended"
            : "manual",
      note: row.reason,
    });
  }

  return milestones.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

function dotClass(status: MilestoneStatus): string {
  switch (status) {
    case "paid":
      return "bg-green-500";
    case "waived":
      return "bg-sky-500";
    case "extended":
      return "bg-violet-500";
    case "manual":
      return "bg-emerald-500";
    case "expired":
      return "bg-gray-400";
    default:
      return "bg-amber-400";
  }
}

type Props = {
  purchases: Purchase[];
  userId?: string;
  showDateEditor?: boolean;
  onUpdated?: () => void;
};

export function CoachingPaymentCalendar({
  purchases,
  userId,
  showDateEditor = false,
  onUpdated,
}: Props) {
  const { data: adjustments = [] } = useQuery({
    queryKey: ["coaching-billing-adjustments", userId],
    queryFn: () =>
      coachingSubscriptionService.listAdjustments({ userId: userId! }),
    enabled: !!userId,
  });

  const coachingSubs = purchases.filter(
    (p): p is Extract<Purchase, { kind: "coaching_subscription" }> =>
      p.kind === "coaching_subscription",
  );
  const programPayments = purchases.filter(
    (p): p is Extract<Purchase, { kind: "program_purchase" }> =>
      p.kind === "program_purchase" && p.status === "PAID" && !!p.paidAt,
  );

  if (coachingSubs.length === 0 && programPayments.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <CalendarDays className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Payment calendar
        </h2>
      </div>

      <div className="space-y-5">
        {coachingSubs.map((sub) => {
          const milestones = coachingMilestones(sub, adjustments);
          return (
            <section
              key={sub.id}
              className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/30"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {sub.planName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatINR(sub.totalAmount)} · {sub.status}
                  </p>
                </div>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                  Coaching
                </span>
              </div>

              <ol className="relative space-y-3 border-l border-gray-200 pl-4 dark:border-gray-700">
                {milestones.map((m, index) => (
                  <li key={`${sub.id}-${index}`} className="relative">
                    <span
                      className={`absolute -left-[1.34rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-gray-50 dark:ring-gray-900/30 ${dotClass(m.status)}`}
                    />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {m.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(m.date)}
                      {m.amount != null && ` · ${formatINR(m.amount)}`}
                    </p>
                    {m.note && (
                      <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                        {m.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              {showDateEditor && userId && (
                <PurchaseDatesEditor
                  userId={userId}
                  purchase={sub}
                  onUpdated={onUpdated}
                />
              )}
            </section>
          );
        })}

        {programPayments.length > 0 && (
          <section className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Program purchases
              </p>
            </div>
            <ul className="space-y-2">
              {programPayments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-1 border-b border-gray-200 pb-2 last:border-0 last:pb-0 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {p.programName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {p.paidAt ? formatDate(p.paidAt) : "—"} ·{" "}
                      {formatINR(p.amount)}
                    </span>
                  </div>
                  {showDateEditor && userId && (
                    <PurchaseDatesEditor
                      userId={userId}
                      purchase={p}
                      onUpdated={onUpdated}
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
