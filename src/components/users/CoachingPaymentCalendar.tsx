import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CreditCard } from "lucide-react";
import { coachingSubscriptionService } from "@/services/coachingSubscriptionService";
import type { CoachingBillingAdjustment } from "@/services/coachingSubscriptionService";
import { PurchaseDatesEditor } from "@/components/users/PurchaseDatesEditor";
import type { Purchase } from "@/types/user";
import { COACHING_DAYS_PER_BILLING_PERIOD } from "@/utils/coachingBillingPeriod";

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

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

type MilestoneStatus =
  | "paid"
  | "upcoming"
  | "estimated"
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
  /** When true, the amount is inferred (e.g. auto-renewal), not a recorded payment. */
  amountEstimated?: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const ADJUSTMENT_LABEL: Record<CoachingBillingAdjustment["type"], string> = {
  EXTEND: "Access extended (admin)",
  WAIVE: "Fee waived / hold",
  MANUAL_PAYMENT: "Manual payment recorded",
  DATE_CORRECTION: "Dates corrected",
  FEE_CORRECTION: "Lifter fee updated",
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

  // Real admin actions (manual payments, waives, extends, corrections) are the
  // source of truth — render each as its own honest milestone.
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

  // Dates already accounted for by a recorded payment/waive, so we don't
  // duplicate them with an estimated marker.
  const recordedDates = subAdjustments
    .filter((row) => row.type === "MANUAL_PAYMENT" || row.type === "WAIVE")
    .flatMap((row) =>
      [row.periodStart, row.periodEnd, row.createdAt]
        .filter((d): d is string => !!d)
        .map((d) => new Date(d).getTime()),
    );
  const hasRecordedNear = (time: number) =>
    recordedDates.some(
      (d) => Math.abs(d - time) < COACHING_DAYS_PER_BILLING_PERIOD * DAY_MS,
    );

  // Auto-renewals (Razorpay) don't leave a per-payment record. Rather than
  // fabricate exact "Renewal N" payments, we infer how many billing blocks the
  // access window spans and surface them as clearly-labelled ESTIMATES. Using a
  // rounded block count avoids spurious markers when the window is only a few
  // days longer than one block (e.g. a 30-day window ≈ 1 block, not 2).
  if (isMonthly) {
    const spanDays = (end.getTime() - start.getTime()) / DAY_MS;
    const blocks = Math.max(
      1,
      Math.round(spanDays / COACHING_DAYS_PER_BILLING_PERIOD),
    );
    for (let i = 1; i < blocks; i += 1) {
      const cursor = addDays(start, i * COACHING_DAYS_PER_BILLING_PERIOD);
      if (hasRecordedNear(cursor.getTime())) continue;

      const waived = subAdjustments.some((row) => {
        if (row.type !== "WAIVE" || !row.periodStart || !row.periodEnd)
          return false;
        const periodStart = new Date(row.periodStart).getTime();
        const periodEnd = new Date(row.periodEnd).getTime();
        const due = cursor.getTime();
        return due >= periodStart && due <= periodEnd;
      });
      if (waived) continue;

      milestones.push({
        label: `Renewal ${i + 1} (est.)`,
        date: cursor.toISOString(),
        amount: sub.totalAmount,
        amountEstimated: true,
        status: "estimated",
      });
    }
  }

  const expired = end < now || sub.status !== "ACTIVE";
  if (!expired && isMonthly) {
    // Active monthly plan: the end date is when the next renewal is due.
    milestones.push({
      label: "Renewal due (est.)",
      date: sub.expiresAt,
      amount: sub.totalAmount,
      amountEstimated: true,
      status: "estimated",
      note: "Access ends this day unless renewed",
    });
  } else {
    milestones.push({
      label: expired ? "Expired" : "Plan expires",
      date: sub.expiresAt,
      status: expired ? "expired" : "upcoming",
    });
  }

  return milestones.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

type CoachingSub = Extract<Purchase, { kind: "coaching_subscription" }>;

/**
 * Each renewal is its own DB row, but to the admin it's the same plan being
 * extended. Stitch a chain of same-plan rows (sorted by start date) into one
 * continuous timeline: the first row "Plan started", each later row becomes a
 * "Renewed (payment)" milestone, and only the last row carries the trailing
 * expiry / renewal-due. If two rows aren't contiguous (a real lapse then a
 * re-join), the intermediate "Expired" is kept so the gap stays honest.
 */
function chainMilestones(
  chain: CoachingSub[],
  adjustments: CoachingBillingAdjustment[],
): Milestone[] {
  const out: Milestone[] = [];
  chain.forEach((sub, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === chain.length - 1;
    let ms = coachingMilestones(sub, adjustments);

    if (!isFirst) {
      ms = ms.map((m) =>
        m.label === "Plan started" ? { ...m, label: "Renewed (payment)" } : m,
      );
    }

    if (!isLast) {
      const next = chain[idx + 1];
      const gapMs =
        new Date(next.startDate).getTime() - new Date(sub.expiresAt).getTime();
      const contiguous = Math.abs(gapMs) <= 2 * DAY_MS;
      if (contiguous) {
        ms = ms.filter(
          (m) =>
            m.label !== "Expired" &&
            m.label !== "Plan expires" &&
            m.label !== "Renewal due (est.)",
        );
      }
    }

    out.push(...ms);
  });
  return out.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

/** Group same-plan coaching rows into chains, each ordered oldest → newest. */
function buildCoachingChains(subs: CoachingSub[]): CoachingSub[][] {
  const byPlan = new Map<string, CoachingSub[]>();
  for (const sub of subs) {
    const arr = byPlan.get(sub.planId) ?? [];
    arr.push(sub);
    byPlan.set(sub.planId, arr);
  }
  return [...byPlan.values()].sort(
    (a, b) =>
      new Date(a[0].startDate).getTime() - new Date(b[0].startDate).getTime(),
  );
}

function dotClass(status: MilestoneStatus): string {
  switch (status) {
    case "paid":
      return "bg-green-500";
    case "manual":
      return "bg-emerald-500";
    case "waived":
      return "bg-sky-500";
    case "extended":
      return "bg-violet-500";
    case "estimated":
      return "border-2 border-dashed border-amber-500 bg-white dark:bg-gray-900";
    case "expired":
      return "bg-gray-400";
    default:
      return "bg-amber-400";
  }
}

const LEGEND: { label: string; className: string }[] = [
  { label: "Paid", className: "bg-green-500" },
  { label: "Manual payment", className: "bg-emerald-500" },
  {
    label: "Estimated",
    className:
      "border-2 border-dashed border-amber-500 bg-white dark:bg-gray-900",
  },
  { label: "Waived / hold", className: "bg-sky-500" },
  { label: "Extended", className: "bg-violet-500" },
  { label: "Expired", className: "bg-gray-400" },
];

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

  const coachingSubs = purchases
    .filter(
      (p): p is Extract<Purchase, { kind: "coaching_subscription" }> =>
        p.kind === "coaching_subscription",
    )
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
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

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {LEGEND.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${item.className}`}
              aria-hidden
            />
            {item.label}
          </span>
        ))}
      </div>

      <div className="space-y-5">
        {buildCoachingChains(coachingSubs).map((chain) => {
          const milestones = chainMilestones(chain, adjustments);
          const first = chain[0];
          const last = chain[chain.length - 1];
          const renewalCount = chain.length - 1;
          const totalCollected = chain.reduce(
            (sum, s) => sum + s.totalAmount,
            0,
          );
          return (
            <section
              key={first.id}
              className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/30"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {last.planName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(first.startDate)} – {formatDate(last.expiresAt)}{" "}
                    · {last.status}
                  </p>
                  {renewalCount > 0 && (
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                      {renewalCount} renewal{renewalCount > 1 ? "s" : ""} ·{" "}
                      {formatINR(totalCollected)} collected
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                  Coaching
                </span>
              </div>

              <ol className="relative space-y-3 border-l border-gray-200 pl-4 dark:border-gray-700">
                {milestones.map((m, index) => (
                  <li key={`${first.id}-${index}`} className="relative">
                    <span
                      className={`absolute -left-[1.34rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-gray-50 dark:ring-gray-900/30 ${dotClass(m.status)}`}
                    />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {m.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(m.date)}
                      {m.amount != null &&
                        (m.amountEstimated
                          ? ` · ~${formatINR(m.amount)} est.`
                          : ` · ${formatINR(m.amount)}`)}
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
                <div className="mt-2 space-y-2">
                  {chain.map((sub) => (
                    <div key={sub.id}>
                      {chain.length > 1 && (
                        <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                          {formatDate(sub.startDate)} –{" "}
                          {formatDate(sub.expiresAt)}
                        </p>
                      )}
                      <PurchaseDatesEditor
                        userId={userId}
                        purchase={sub}
                        onUpdated={onUpdated}
                      />
                    </div>
                  ))}
                </div>
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
