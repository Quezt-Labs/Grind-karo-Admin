import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { StatsCard } from "@/components/ui/StatsCard";
import { DataTable } from "@/components/ui/DataTable";
import { StatsCardsSkeleton } from "@/components/ui/Shimmer";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dashboardService } from "@/services/dashboardService";
import type { Column } from "@/types/dashboard";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  price: string;
  validityMonths: string;
  isActive: string;
};

const recentPlanColumns: Column<PlanRow>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "slug", header: "Slug", sortable: true },
  { key: "price", header: "Price", sortable: true },
  { key: "validityMonths", header: "Validity", sortable: false },
  {
    key: "isActive",
    header: "Status",
    sortable: false,
    render: (value) => <StatusBadge status={value as string} />,
  },
];

export function DashboardPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardService.getStats,
  });

  const {
    data: recentPlans,
    isLoading: plansLoading,
    isError: plansError,
  } = useQuery({
    queryKey: ["dashboard-recent-plans"],
    queryFn: dashboardService.getRecentPlans,
  });

  const planRows: PlanRow[] = useMemo(() => {
    if (!recentPlans) return [];
    return recentPlans.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: formatINR(p.price),
      validityMonths: `${p.validityMonths} months`,
      isActive: p.isActive ? "Active" : "Inactive",
    }));
  }, [recentPlans]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your coaching platform metrics"
      />

      {/* Stats cards */}
      {statsError ? (
        <ErrorAlert message="Failed to load stats. Please try again later." />
      ) : statsLoading ? (
        <StatsCardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats?.map((stat) => (
            <StatsCard key={stat.id} {...stat} />
          ))}
        </div>
      )}

      {/* Recent Plans */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Active Plans
          </h2>
          <Link
            to="/plans"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {plansError ? (
          <ErrorAlert message="Failed to load plans. Please try again later." />
        ) : (
          <DataTable
            data={planRows}
            columns={recentPlanColumns}
            isLoading={plansLoading}
          />
        )}
      </div>
    </div>
  );
}
