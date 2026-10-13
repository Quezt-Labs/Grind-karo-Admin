import { useQuery } from "@tanstack/react-query";
import { CreditCard, UserRound } from "lucide-react";
import { coachingSubscriptionService } from "@/services/coachingSubscriptionService";
import type { AdminUser, Purchase, UserInfo } from "@/types/user";
import { formatAdminPhone } from "@/utils/phoneStatus";
import { formatAthleteLocation } from "@/lib/indianStates";
import { buildUserPaymentRows, type UserPaymentStatus } from "@/utils/userPaymentRows";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/utils/cn";

function formatINR(amount: number, currency: string): string {
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return `${currency} ${amount}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_CLASS: Record<UserPaymentStatus, string> = {
  Paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Pending:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300",
  Failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Refunded:
    "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
};

type Props = {
  user: AdminUser;
  purchases: Purchase[];
  intake: UserInfo | undefined;
  intakeLoading: boolean;
  planName: string | null;
};

export function UserAccountPanel({
  user,
  purchases,
  intake,
  intakeLoading,
  planName,
}: Props) {
  const phone = formatAdminPhone(user.phone);
  const renewals = useQuery({
    queryKey: ["coaching-renewals", "account", user.id],
    queryFn: () =>
      coachingSubscriptionService.listRenewals({
        expiringWithinDays: 7,
        recentlyExpiredDays: 14,
      }),
  });
  const adjustments = useQuery({
    queryKey: ["coaching-adjustments", user.id],
    queryFn: () =>
      coachingSubscriptionService.listAdjustments({ userId: user.id }),
  });

  const overdueIds = new Set(
    (renewals.data?.overdueGrace ?? [])
      .filter((row) => row.userId === user.id)
      .map((row) => row.subscriptionId),
  );

  const rows =
    renewals.isSuccess && adjustments.isSuccess
      ? buildUserPaymentRows(purchases, adjustments.data, overdueIds)
      : [];

  const pendingCount = rows.filter(
    (row) => row.status === "Pending" || row.status === "Overdue",
  ).length;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <UserRound className="h-4 w-4" />
          User information
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={user.name || "Unnamed user"} />
          <Field label="Email" value={user.email} />
          <Field
            label="Phone"
            value={phone.missing ? "Number missing" : phone.label}
          />
          <Field label="Coaching plan" value={planName ?? "No coaching plan"} />
          <Field label="Role" value={user.role} />
          <Field label="Joined" value={formatDate(user.createdAt)} />
        </dl>
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Profile
          </h3>
          {intakeLoading ? (
            <div className="py-6">
              <Spinner />
            </div>
          ) : intake ? (
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Age" value={String(intake.age)} />
              <Field
                label="Location"
                value={formatAthleteLocation(intake.city, intake.state)}
              />
              <Field label="WhatsApp" value={intake.whatsappNumber} />
              <Field
                label="Goal"
                value={intake.coachingGoal.join(", ") || "—"}
              />
            </dl>
          ) : (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No coaching intake on file for this user.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <CreditCard className="h-4 w-4" />
          Payments
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-white">
              {pendingCount}
            </span>
          )}
        </h2>
        {renewals.isLoading || adjustments.isLoading ? (
          <div className="py-10">
            <Spinner />
          </div>
        ) : renewals.isError || adjustments.isError ? (
          <div className="mt-4">
            <ErrorAlert message="Failed to load payment records." />
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No payment records for this user.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  row.status === "Pending" || row.status === "Overdue"
                    ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                    : "border-gray-200 dark:border-gray-700",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {row.productName}
                  </p>
                  {row.status ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        STATUS_CLASS[row.status],
                      )}
                    >
                      {row.status}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      Status not on record
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {row.amount != null
                    ? formatINR(row.amount, row.currency)
                    : "Amount not recorded"}
                  {row.date ? ` · ${formatDate(row.date)}` : ""}
                  {row.source === "manual_payment" ? " · Manual payment" : ""}
                </p>
                {row.statusNote && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {row.statusNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="truncate text-sm font-medium text-gray-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
}
