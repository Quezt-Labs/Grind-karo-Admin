import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { EmptyState } from "@/components/ui/EmptyState";
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
        <EmptyState
          icon={<Award className="h-12 w-12" />}
          message="No subscriptions found"
        />
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
