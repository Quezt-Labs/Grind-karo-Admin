import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { StatsCard } from "@/components/ui/StatsCard";
import { DataTable } from "@/components/ui/DataTable";
import { StatsCardsSkeleton } from "@/components/ui/Shimmer";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { dashboardService } from "@/services/dashboardService";
import type { Column } from "@/types/dashboard";
import type { RecentSale, TopCustomer } from "@/types/dashboardOverview";

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

const kindLabels: Record<RecentSale["kind"], string> = {
  coaching_subscription: "Coaching",
  program_purchase: "Program",
  book_purchase: "Book",
};

type RecentSaleRow = RecentSale & {
  kindLabel: string;
  amountLabel: string;
  paidAtLabel: string;
  customerLabel: string;
};
type TopCustomerRow = TopCustomer & {
  totalSpentLabel: string;
  customerLabel: string;
  lastPurchaseLabel: string;
};

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: dashboardService.getOverview,
    refetchInterval: 60_000,
  });

  const overview = data?.overview;

  const statCards = useMemo(() => {
    if (!overview) return [];
    return [
      {
        id: "total-revenue",
        title: "Total Revenue",
        value: formatINR(overview.totalRevenue),
        icon: "DollarSign",
        subtitle: `${overview.uniqueCustomers} paying customers`,
      },
      {
        id: "revenue-month",
        title: "Revenue This Month",
        value: formatINR(overview.revenueThisMonth),
        change: Math.abs(overview.revenueChangePercent),
        changeType: changeType(overview.revenueChangePercent),
        icon: "TrendingUp",
      },
      {
        id: "total-sales",
        title: "Total Sales",
        value: String(overview.totalSalesCount),
        icon: "ShoppingCart",
        subtitle: `${overview.salesThisMonth} this month`,
      },
      {
        id: "sales-month",
        title: "Sales This Month",
        value: String(overview.salesThisMonth),
        change: Math.abs(overview.salesChangePercent),
        changeType: changeType(overview.salesChangePercent),
        icon: "Activity",
      },
      {
        id: "active-subs",
        title: "Active Subscriptions",
        value: String(overview.activeSubscriptions),
        icon: "Award",
        subtitle: "Paid coaching plans",
      },
      {
        id: "customers",
        title: "Unique Customers",
        value: String(overview.uniqueCustomers),
        icon: "Users",
        subtitle: "All-time buyers",
      },
    ];
  }, [overview]);

  const breakdownCards = useMemo(() => {
    if (!overview) return [];
    const { breakdown } = overview;
    return [
      {
        id: "coaching",
        title: "Coaching Revenue",
        value: formatINR(breakdown.coaching.revenue),
        icon: "CreditCard",
        subtitle: `${breakdown.coaching.count} subscriptions`,
      },
      {
        id: "programs",
        title: "Program Revenue",
        value: formatINR(breakdown.programs.revenue),
        icon: "Dumbbell",
        subtitle: `${breakdown.programs.count} purchases`,
      },
      {
        id: "books",
        title: "Book Revenue",
        value: formatINR(breakdown.books.revenue),
        icon: "LayoutDashboard",
        subtitle: `${breakdown.books.count} purchases`,
      },
    ];
  }, [overview]);

  const recentSaleRows: RecentSaleRow[] = useMemo(() => {
    if (!data?.recentSales) return [];
    return data.recentSales.map((sale) => ({
      ...sale,
      kindLabel: kindLabels[sale.kind],
      amountLabel: formatINR(sale.amount),
      paidAtLabel: formatDateTime(sale.paidAt),
      customerLabel: sale.userName ?? sale.userEmail,
    }));
  }, [data?.recentSales]);

  const topCustomerRows: (TopCustomerRow & { id: string })[] = useMemo(() => {
    if (!data?.topCustomers) return [];
    return data.topCustomers.map((c) => ({
      ...c,
      id: c.userId,
      totalSpentLabel: formatINR(c.totalSpent),
      customerLabel: c.userName ?? c.userEmail,
      lastPurchaseLabel: formatDateTime(c.lastPurchaseAt),
    }));
  }, [data?.topCustomers]);

  const recentSaleColumns: Column<RecentSaleRow>[] = [
    {
      key: "paidAtLabel",
      header: "Date",
      sortable: true,
    },
    {
      key: "customerLabel",
      header: "Customer",
      sortable: true,
      render: (_, row) => (
        <Link
          to={`/users/${row.userId}`}
          className="font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          {row.customerLabel}
        </Link>
      ),
    },
    {
      key: "productName",
      header: "Product",
      sortable: true,
    },
    {
      key: "kindLabel",
      header: "Type",
      sortable: true,
    },
    {
      key: "amountLabel",
      header: "Amount",
      sortable: true,
    },
  ];

  const topCustomerColumns: Column<TopCustomerRow & { id: string }>[] = [
    {
      key: "customerLabel",
      header: "Customer",
      sortable: true,
      render: (_, row) => (
        <Link
          to={`/users/${row.userId}`}
          className="font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          {row.customerLabel}
        </Link>
      ),
    },
    {
      key: "totalSpentLabel",
      header: "Total Spent",
      sortable: true,
    },
    {
      key: "purchaseCount",
      header: "Orders",
      sortable: true,
    },
    {
      key: "lastPurchaseLabel",
      header: "Last Purchase",
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Revenue, sales, and customer overview across coaching, programs, and books"
      />

      {isError ? (
        <ErrorAlert message="Failed to load dashboard data. Please try again later." />
      ) : isLoading ? (
        <StatsCardsSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {statCards.map((stat) => (
              <StatsCard key={stat.id} {...stat} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {breakdownCards.map((stat) => (
              <StatsCard key={stat.id} {...stat} />
            ))}
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-800 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Monthly Revenue
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {overview
                  ? `${formatINR(overview.revenueThisMonth)} this month`
                  : ""}
              </span>
            </div>
            {data?.monthlyRevenue && (
              <RevenueChart data={data.monthlyRevenue} />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Sales
                </h2>
                <Link
                  to="/subscriptions"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  View subscriptions <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <DataTable data={recentSaleRows} columns={recentSaleColumns} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Top Customers
                </h2>
                <Link
                  to="/users"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  All users <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <DataTable data={topCustomerRows} columns={topCustomerColumns} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
