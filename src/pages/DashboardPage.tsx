import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { StatsCard } from "@/components/ui/StatsCard";
import { DataTable } from "@/components/ui/DataTable";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dashboardService } from "@/services/dashboardService";
import type { Column } from "@/types/dashboard";

type ProgramRow = {
  id: string;
  name: string;
  level: string;
  category: string;
  duration: string;
  isActive: string;
};

const recentProgramColumns: Column<ProgramRow>[] = [
  { key: "name", header: "Name", sortable: true },
  {
    key: "level",
    header: "Level",
    sortable: true,
    render: (value) => <LevelBadge level={value as string} />,
  },
  { key: "category", header: "Category", sortable: true },
  { key: "duration", header: "Duration", sortable: false },
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
    data: recentPrograms,
    isLoading: programsLoading,
    isError: programsError,
  } = useQuery({
    queryKey: ["dashboard-recent-programs"],
    queryFn: dashboardService.getRecentPrograms,
  });

  const programRows: ProgramRow[] = useMemo(() => {
    if (!recentPrograms) return [];
    return recentPrograms.map((p) => ({
      id: p.id,
      name: p.name,
      level: p.level,
      category: p.category,
      duration: `${p.duration} weeks`,
      isActive: p.isActive ? "Active" : "Inactive",
    }));
  }, [recentPrograms]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your platform metrics and programs"
      />

      {/* Stats cards */}
      {statsError ? (
        <ErrorAlert message="Failed to load stats. Please try again later." />
      ) : statsLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats?.map((stat) => (
            <StatsCard key={stat.id} {...stat} />
          ))}
        </div>
      )}

      {/* Recent Programs */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Programs
          </h2>
          <Link
            to="/programs"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {programsError ? (
          <ErrorAlert message="Failed to load programs. Please try again later." />
        ) : (
          <DataTable
            data={programRows}
            columns={recentProgramColumns}
            isLoading={programsLoading}
          />
        )}
      </div>
    </div>
  );
}
