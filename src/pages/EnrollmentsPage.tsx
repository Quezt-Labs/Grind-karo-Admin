import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { enrollmentService } from "@/services/enrollmentService";
import type { Column } from "@/types/dashboard";

type SubscriptionRow = {
  id: string;
  planName: string;
  orderId: string;
  status: string;
  subscribedAt: string;
  expiresAt: string;
};

const subscriptionColumns: Column<SubscriptionRow>[] = [
  { key: "planName", header: "Plan", sortable: true },
  { key: "orderId", header: "Order ID", sortable: false },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
  { key: "subscribedAt", header: "Subscribed", sortable: true },
  { key: "expiresAt", header: "Expires", sortable: true },
];

export function SubscriptionsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: subscriptions,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: enrollmentService.getAllSubscriptions,
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const tableData: SubscriptionRow[] = useMemo(() => {
    if (!subscriptions) return [];
    let rows = subscriptions.map((s) => ({
      id: s.id,
      planName: s.plan?.name || s.planId,
      orderId: s.orderId,
      status: s.status || "Active",
      subscribedAt: s.subscribedAt
        ? new Date(s.subscribedAt).toLocaleDateString()
        : s.createdAt
          ? new Date(s.createdAt).toLocaleDateString()
          : "—",
      expiresAt: s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : "—",
    }));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.planName.toLowerCase().includes(term) ||
          r.orderId.toLowerCase().includes(term),
      );
    }

    return rows;
  }, [subscriptions, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Subscriptions"
        description="View plan subscriptions and status"
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search subscriptions..."
          className="w-full sm:w-72"
        />
      </div>

      {/* Table */}
      {isError ? (
        <ErrorAlert message="Failed to load subscriptions. Please try again later." />
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <Award className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No subscriptions yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Subscriptions will appear here once users subscribe to your program
            plans.
          </p>
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={subscriptionColumns}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
