import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { StatsCard } from "@/components/ui/StatsCard";
import { DataTable } from "@/components/ui/DataTable";
import { StatsCardsSkeleton } from "@/components/ui/Shimmer";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { athleteAssignmentService } from "@/services/athleteAssignmentService";
import type { Column } from "@/types/dashboard";
import type {
  CoachAthleteEarnings,
  CoachRecentCoachingSale,
} from "@/types/coachDashboard";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function changeType(percent: number): "increase" | "decrease" {
  return percent >= 0 ? "increase" : "decrease";
}

type AthleteEarningsRow = CoachAthleteEarnings & {
  athleteLabel: string;
  grossLabel: string;
  earningsLabel: string;
};

type RecentSaleRow = CoachRecentCoachingSale & {
  athleteLabel: string;
  grossLabel: string;
  earningsLabel: string;
  paidAtLabel: string;
};

export function CoachDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["coach-revenue-overview"],
    queryFn: () => athleteAssignmentService.getRevenueOverview(),
    refetchInterval: 60_000,
  });

  const overview = data?.overview;
  const sharePercent = data?.sharePercent ?? 37;

  const statCards = useMemo(() => {
    if (!overview) return [];
    return [
      {
        id: "total-earnings",
        title: "Your Total Earnings",
        value: formatINR(overview.totalEarnings),
        icon: "DollarSign",
        subtitle: `${sharePercent}% of personal coaching athletes' revenue`,
      },
      {
        id: "earnings-month",
        title: "Earnings This Month",
        value: formatINR(overview.earningsThisMonth),
        change: Math.abs(overview.earningsChangePercent),
        changeType: changeType(overview.earningsChangePercent),
        icon: "TrendingUp",
      },
      {
        id: "assigned-athletes",
        title: "Personal Coaching Athletes",
        value: String(overview.assignedAthletesCount),
        icon: "Users",
        subtitle: "Personal coaching assignments",
      },
      {
        id: "coaching-sales",
        title: "Coaching Subscriptions",
        value: String(overview.coachingSalesCount),
        icon: "Award",
        subtitle: formatINR(overview.grossCoachingRevenue) + " gross coaching",
      },
    ];
  }, [overview, sharePercent]);

  const monthlyChartData = useMemo(
    () =>
      (data?.monthlyEarnings ?? []).map((point) => ({
        month: point.month,
        label: point.label,
        revenue: point.earnings,
        salesCount: point.salesCount,
      })),
    [data?.monthlyEarnings],
  );

  const athleteRows: (AthleteEarningsRow & { id: string })[] = useMemo(() => {
    if (!data?.earningsByAthlete) return [];
    return data.earningsByAthlete.map((row) => ({
      ...row,
      id: row.athleteId,
      athleteLabel: row.athleteName ?? row.athleteEmail,
      grossLabel: formatINR(row.grossCoachingRevenue),
      earningsLabel: formatINR(row.coachEarnings),
    }));
  }, [data]);

  const recentRows: RecentSaleRow[] = useMemo(() => {
    if (!data?.recentCoachingSales) return [];
    return data.recentCoachingSales.map((sale) => ({
      ...sale,
      athleteLabel: sale.athleteName ?? sale.athleteEmail,
      grossLabel: formatINR(sale.grossAmount),
      earningsLabel: formatINR(sale.coachEarnings),
      paidAtLabel: formatDateTime(sale.paidAt),
    }));
  }, [data]);

  const athleteColumns: Column<AthleteEarningsRow & { id: string }>[] = [
    {
      key: "athleteLabel",
      header: "Athlete",
      sortable: true,
      render: (_, row) => (
        <Link
          to={`/coach/athletes/${row.athleteId}`}
          className="font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          {row.athleteLabel}
        </Link>
      ),
    },
    {
      key: "grossLabel",
      header: "Coaching revenue",
      sortable: true,
    },
    {
      key: "earningsLabel",
      header: `Your share (${sharePercent}%)`,
      sortable: true,
    },
    {
      key: "coachingSalesCount",
      header: "Subscriptions",
      sortable: true,
    },
  ];

  const recentColumns: Column<RecentSaleRow>[] = [
    { key: "paidAtLabel", header: "Date", sortable: true },
    { key: "athleteLabel", header: "Athlete", sortable: true },
    { key: "planName", header: "Plan", sortable: true },
    { key: "grossLabel", header: "Coaching amount", sortable: true },
    { key: "earningsLabel", header: "Your share", sortable: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Your ${sharePercent}% share from coaching revenue of athletes assigned for personal coaching`}
      />

      {isError ? (
        <ErrorAlert message="Failed to load your earnings. Please try again later." />
      ) : isLoading ? (
        <StatsCardsSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => (
              <StatsCard key={stat.id} {...stat} />
            ))}
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-800 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Monthly Earnings
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {overview
                  ? `${formatINR(overview.earningsThisMonth)} this month`
                  : ""}
              </span>
            </div>
            {monthlyChartData.length > 0 && (
              <RevenueChart
                data={monthlyChartData}
                caption={`Last 6 months · ${sharePercent}% from personal coaching assigned athletes`}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Earnings by Athlete
              </h2>
              {athleteRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  No coaching revenue from personal coaching athletes yet.
                </div>
              ) : (
                <DataTable data={athleteRows} columns={athleteColumns} />
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Coaching Sales
              </h2>
              {recentRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  No recent coaching subscriptions from your athletes.
                </div>
              ) : (
                <DataTable data={recentRows} columns={recentColumns} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
