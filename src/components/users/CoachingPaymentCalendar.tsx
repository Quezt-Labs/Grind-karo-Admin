import { CalendarDays, CreditCard } from "lucide-react";
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

type Milestone = {
  label: string;
  date: string;
  amount?: number;
  status: "paid" | "upcoming" | "expired";
};

function coachingMilestones(
  sub: Extract<Purchase, { kind: "coaching_subscription" }>,
): Milestone[] {
  const start = new Date(sub.startDate);
  const end = new Date(sub.expiresAt);
  const now = new Date();
  const slug = sub.planSlug.toLowerCase();
  const isMonthly = slug.includes("ultra");
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
      milestones.push({
        label: `Renewal ${installment}`,
        date: cursor.toISOString(),
        amount: sub.totalAmount,
        status: cursor <= now ? "paid" : "upcoming",
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

  return milestones;
}

type Props = {
  purchases: Purchase[];
};

export function CoachingPaymentCalendar({ purchases }: Props) {
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
          const milestones = coachingMilestones(sub);
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
                      className={`absolute -left-[1.34rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-gray-50 dark:ring-gray-900/30 ${
                        m.status === "paid"
                          ? "bg-green-500"
                          : m.status === "expired"
                            ? "bg-gray-400"
                            : "bg-amber-400"
                      }`}
                    />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {m.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(m.date)}
                      {m.amount != null && ` · ${formatINR(m.amount)}`}
                    </p>
                  </li>
                ))}
              </ol>
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
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    {p.programName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {p.paidAt ? formatDate(p.paidAt) : "—"} ·{" "}
                    {formatINR(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
