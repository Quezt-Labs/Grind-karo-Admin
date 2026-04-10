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
import { cn } from "@/utils/cn";
import type { Column } from "@/types/dashboard";

type EnrollmentRow = {
  id: string;
  programName: string;
  tier: string;
  orderId: string;
  status: string;
  enrolledAt: string;
  expiresAt: string;
};

const enrollmentColumns: Column<EnrollmentRow>[] = [
  { key: "programName", header: "Program", sortable: true },
  {
    key: "tier",
    header: "Tier",
    sortable: true,
    render: (value) => (
      <span className="inline-flex rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
        {value as string}
      </span>
    ),
  },
  { key: "orderId", header: "Order ID", sortable: false },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
  { key: "enrolledAt", header: "Enrolled", sortable: true },
  { key: "expiresAt", header: "Expires", sortable: true },
];

export function EnrollmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const {
    data: allEnrollments,
    isLoading: allLoading,
    isError: allError,
  } = useQuery({
    queryKey: ["enrollments"],
    queryFn: enrollmentService.getMyEnrollments,
    enabled: !showActiveOnly,
  });

  const {
    data: activeEnrollments,
    isLoading: activeLoading,
    isError: activeError,
  } = useQuery({
    queryKey: ["enrollments-active"],
    queryFn: enrollmentService.getMyActiveEnrollments,
    enabled: showActiveOnly,
  });

  const enrollments = showActiveOnly ? activeEnrollments : allEnrollments;
  const isLoading = showActiveOnly ? activeLoading : allLoading;
  const isError = showActiveOnly ? activeError : allError;

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const tableData: EnrollmentRow[] = useMemo(() => {
    if (!enrollments) return [];
    let rows = enrollments.map((e) => ({
      id: e.id,
      programName: e.program?.name || e.programId,
      tier: e.tier,
      orderId: e.orderId,
      status: e.status || "Active",
      enrolledAt: e.enrolledAt
        ? new Date(e.enrolledAt).toLocaleDateString()
        : e.createdAt
          ? new Date(e.createdAt).toLocaleDateString()
          : "—",
      expiresAt: e.expiresAt ? new Date(e.expiresAt).toLocaleDateString() : "—",
    }));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.programName.toLowerCase().includes(term) ||
          r.tier.toLowerCase().includes(term) ||
          r.orderId.toLowerCase().includes(term),
      );
    }

    return rows;
  }, [enrollments, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Enrollments"
        description="View program enrollments and access status"
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setShowActiveOnly(false)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              !showActiveOnly
                ? "border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300"
                : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400",
            )}
          >
            All
          </button>
          <button
            onClick={() => setShowActiveOnly(true)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              showActiveOnly
                ? "border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300"
                : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400",
            )}
          >
            Active Only
          </button>
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search enrollments..."
          className="w-full sm:w-72"
        />
      </div>

      {/* Table */}
      {isError ? (
        <ErrorAlert message="Failed to load enrollments. Please try again later." />
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : tableData.length === 0 ? (
        <EmptyState
          icon={<Award className="h-12 w-12" />}
          message="No enrollments found"
        />
      ) : (
        <DataTable
          data={tableData}
          columns={enrollmentColumns}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
