import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, RotateCcw, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { coachingSubscriptionService } from "@/services/coachingSubscriptionService";
import type { Column } from "@/types/dashboard";
import type { CoachingSubscription } from "@/types/program";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

type SubscriptionRow = {
  id: string;
  user: string;
  userId: string;
  planName: string;
  status: string;
  payment: string;
  startDate: string;
  expiresAt: string;
  totalAmount: string;
  addons: string;
};

const subscriptionColumns: Column<SubscriptionRow>[] = [
  {
    key: "user",
    header: "Athlete",
    sortable: true,
    render: (value, row) => (
      <Link
        to={`/users/${(row as SubscriptionRow).userId}?tab=coaching`}
        className="font-medium text-primary-600 hover:underline dark:text-primary-400"
      >
        {value as string}
      </Link>
    ),
  },
  { key: "planName", header: "Plan", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
  {
    key: "payment",
    header: "Payment",
    sortable: true,
    render: (value) => {
      const label = value as string;
      if (label === "Unpaid checkout") {
        return (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            {label}
          </span>
        );
      }
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {label}
        </span>
      );
    },
  },
  { key: "startDate", header: "Start", sortable: true },
  { key: "expiresAt", header: "Expires", sortable: true },
  { key: "totalAmount", header: "Total", sortable: true },
  { key: "addons", header: "Add-ons", sortable: false },
];

type PaymentFilter = "" | "PAID" | "UNPAID";

export function SubscriptionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("");
  const [cancelTarget, setCancelTarget] = useState<CoachingSubscription | null>(
    null,
  );
  const [refundTarget, setRefundTarget] = useState<CoachingSubscription | null>(
    null,
  );
  const queryClient = useQueryClient();

  const paidParam =
    paymentFilter === "PAID"
      ? true
      : paymentFilter === "UNPAID"
        ? false
        : undefined;

  const {
    data: subscriptions,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["coaching-subscriptions", statusFilter, paymentFilter],
    queryFn: () =>
      coachingSubscriptionService.listSubscriptions({
        status: statusFilter || undefined,
        paid: paidParam,
      }),
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) =>
      coachingSubscriptionService.refundSubscription(id),
    onSuccess: () => {
      toast.success("Subscription refunded via Razorpay");
      queryClient.invalidateQueries({ queryKey: ["coaching-subscriptions"] });
      setRefundTarget(null);
    },
    onError: () => toast.error("Failed to refund subscription"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      coachingSubscriptionService.cancelSubscription(id),
    onSuccess: () => {
      toast.success("Subscription cancelled");
      queryClient.invalidateQueries({ queryKey: ["coaching-subscriptions"] });
      setCancelTarget(null);
    },
    onError: () => {
      toast.error("Failed to cancel subscription");
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const subMap = useMemo(() => {
    const map = new Map<string, CoachingSubscription>();
    subscriptions?.forEach((s) => map.set(s.id, s));
    return map;
  }, [subscriptions]);

  const tableData: SubscriptionRow[] = useMemo(() => {
    if (!subscriptions) return [];
    let rows: SubscriptionRow[] = subscriptions.map((s) => ({
      id: s.id,
      userId: s.userId,
      user: s.user?.name?.trim() || s.user?.email?.trim() || s.userId,
      planName: s.planSnapshot?.name || s.planId,
      status: s.status,
      payment:
        s.status === "PENDING"
          ? "Pending checkout"
          : s.status === "REFUNDED"
            ? "Refunded"
            : s.razorpayPaymentId === null
              ? "Unpaid checkout"
              : `Paid ${formatINR(s.totalAmount)}`,
      startDate: new Date(s.startDate).toLocaleDateString(),
      expiresAt: new Date(s.expiresAt).toLocaleDateString(),
      totalAmount: formatINR(s.totalAmount),
      addons: s.addonsSnapshot.length
        ? s.addonsSnapshot.map((a) => a.name).join(", ")
        : "—",
    }));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.planName.toLowerCase().includes(term) ||
          r.addons.toLowerCase().includes(term) ||
          r.user.toLowerCase().includes(term),
      );
    }

    return rows;
  }, [subscriptions, searchTerm]);

  const actionsColumn = {
    key: "id" as keyof SubscriptionRow & string,
    header: "Actions",
    render: (value: SubscriptionRow[keyof SubscriptionRow]) => {
      const sub = subMap.get(value as string);
      if (!sub) return null;
      const canCancel = sub.status === "ACTIVE" || sub.status === "PENDING";
      const canRefund =
        sub.status === "ACTIVE" && sub.razorpayPaymentId != null;
      if (!canCancel && !canRefund) return null;
      return (
        <div className="flex items-center gap-1">
          {canRefund ? (
            <button
              onClick={() => setRefundTarget(sub)}
              className="rounded p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-700 dark:text-gray-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-300"
              title="Refund via Razorpay"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          ) : null}
          {canCancel ? (
            <button
              onClick={() => setCancelTarget(sub)}
              className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="Cancel"
            >
              <XCircle className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      );
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Coaching subscriptions — filter unpaid checkout rows to find stuck payments."
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {["", "PENDING", "ACTIVE", "EXPIRED", "CANCELLED", "REFUNDED"].map(
            (s) => (
              <button
                key={s || "all-status"}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {s || "All statuses"}
              </button>
            ),
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "", label: "All payments" },
                { key: "PAID", label: "Paid" },
                { key: "UNPAID", label: "Unpaid checkout" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key || "all-pay"}
                type="button"
                onClick={() => setPaymentFilter(opt.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  paymentFilter === opt.key
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <DebouncedSearch
            onSearch={handleSearch}
            placeholder="Search athlete, plan, add-ons..."
            className="w-full sm:w-72"
          />
        </div>
      </div>

      {isError ? (
        <ErrorAlert message="Failed to load subscriptions. Please try again later." />
      ) : !isLoading && tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <Award className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No subscriptions match
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Try “Unpaid checkout” to surface stuck Razorpay sessions.
          </p>
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={[...subscriptionColumns, actionsColumn]}
          isLoading={isLoading}
        />
      )}

      <ConfirmModal
        open={!!cancelTarget}
        title="Cancel Subscription"
        message={`Cancel this subscription for "${cancelTarget?.planSnapshot?.name}"? No refund will be issued.`}
        confirmLabel="Cancel Subscription"
        variant="danger"
        isLoading={cancelMutation.isPending}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        onCancel={() => setCancelTarget(null)}
      />

      <ConfirmModal
        open={!!refundTarget}
        title="Refund Subscription"
        message={`Issue a Razorpay refund for "${refundTarget?.planSnapshot?.name}"? Access will be revoked immediately.`}
        confirmLabel="Refund"
        variant="danger"
        isLoading={refundMutation.isPending}
        onConfirm={() => refundTarget && refundMutation.mutate(refundTarget.id)}
        onCancel={() => setRefundTarget(null)}
      />
    </div>
  );
}
