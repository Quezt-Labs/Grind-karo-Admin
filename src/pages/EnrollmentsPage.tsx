import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { enrollmentService } from "@/services/enrollmentService";
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
  planName: string;
  status: string;
  startDate: string;
  expiresAt: string;
  totalAmount: string;
  addons: string;
};

const subscriptionColumns: Column<SubscriptionRow>[] = [
  { key: "planName", header: "Plan", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
  { key: "startDate", header: "Start", sortable: true },
  { key: "expiresAt", header: "Expires", sortable: true },
  { key: "totalAmount", header: "Total", sortable: true },
  { key: "addons", header: "Add-ons", sortable: false },
];

export function SubscriptionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [cancelTarget, setCancelTarget] = useState<CoachingSubscription | null>(
    null,
  );
  const queryClient = useQueryClient();

  const {
    data: subscriptions,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["coaching-subscriptions", statusFilter],
    queryFn: () =>
      enrollmentService.getAll(
        statusFilter ? { status: statusFilter } : undefined,
      ),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => enrollmentService.cancel(id),
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
    let rows = subscriptions.map((s) => ({
      id: s.id,
      planName: s.planSnapshot?.name || s.planId,
      status: s.status,
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
          r.addons.toLowerCase().includes(term),
      );
    }

    return rows;
  }, [subscriptions, searchTerm]);

  const actionsColumn = {
    key: "id" as keyof SubscriptionRow & string,
    header: "Actions",
    render: (value: SubscriptionRow[keyof SubscriptionRow]) => {
      const sub = subMap.get(value as string);
      if (!sub || sub.status !== "ACTIVE") return null;
      return (
        <button
          onClick={() => setCancelTarget(sub)}
          className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          title="Cancel"
        >
          <XCircle className="h-4 w-4" />
        </button>
      );
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Manage coaching subscriptions"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {["", "ACTIVE", "EXPIRED", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search subscriptions..."
          className="w-full sm:w-72"
        />
      </div>

      {isError ? (
        <ErrorAlert message="Failed to load subscriptions. Please try again later." />
      ) : !isLoading && tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <Award className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No subscriptions yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Subscriptions will appear here once users subscribe to coaching
            plans.
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
    </div>
  );
}
