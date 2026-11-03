import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatsCard } from "@/components/ui/StatsCard";
import { StatsCardsSkeleton } from "@/components/ui/Shimmer";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { PlanRevenueComparison } from "@/components/dashboard/PlanRevenueComparison";
import {
  RevenueComparisonTable,
  type RevenueComparisonRow,
} from "@/components/dashboard/RevenueComparisonTable";
import { dashboardService } from "@/services/dashboardService";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function changeType(percent: number): "increase" | "decrease" {
  return percent >= 0 ? "increase" : "decrease";
}

const MONTH_OPTIONS = [6, 12] as const;

export function RevenueAnalyticsPage() {
  const [months, setMonths] = useState<(typeof MONTH_OPTIONS)[number]>(6);

  const overviewQuery = useQuery({
    queryKey: ["dashboard-overview", months],
    queryFn: () => dashboardService.getOverview(months),
  });

  const planQuery = useQuery({
    queryKey: ["dashboard-plan-revenue", months],
    queryFn: () => dashboardService.getPlanRevenue(months),
  });

  const programsQuery = useQuery({
    queryKey: ["dashboard-programs-revenue", months],
    queryFn: () => dashboardService.getProgramsRevenue(months),
  });

  const booksQuery = useQuery({
    queryKey: ["dashboard-books-revenue", months],
    queryFn: () => dashboardService.getBooksRevenue(months),
  });

  const overview = overviewQuery.data?.overview;

  const programRows: RevenueComparisonRow[] = useMemo(() => {
    const programs = programsQuery.data?.programs ?? [];
    return programs.map((p) => ({
      id: p.id,
      name: p.name,
      href: `/programs/${p.slug}`,
      stats: p.stats,
    }));
  }, [programsQuery.data]);

  const bookRows: RevenueComparisonRow[] = useMemo(() => {
    const books = booksQuery.data?.books ?? [];
    return books.map((b) => ({
      id: b.id,
      name: b.name,
      href: "/program-books",
      stats: b.stats,
    }));
  }, [booksQuery.data]);

  const monthKeys =
    planQuery.data?.monthKeys ??
    programsQuery.data?.monthKeys ??
    booksQuery.data?.monthKeys ??
    [];

  const loading =
    overviewQuery.isLoading ||
    planQuery.isLoading ||
    programsQuery.isLoading ||
    booksQuery.isLoading;

  const anyError =
    overviewQuery.isError ||
    planQuery.isError ||
    programsQuery.isError ||
    booksQuery.isError;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Revenue analytics"
        description="Month-by-month earnings by coaching plan, retail program, and PDF book — for growth and focus decisions."
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Window
          </span>
          {MONTH_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMonths(n)}
              className={
                n === months
                  ? "rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              }
            >
              {n} mo
            </button>
          ))}
        </div>
      </PageHeader>

      {anyError ? (
        <ErrorAlert message="Failed to load revenue analytics. Please try again." />
      ) : null}

      {loading ? (
        <StatsCardsSkeleton />
      ) : overview ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Revenue this month"
            value={formatINR(overview.revenueThisMonth)}
            change={Math.abs(overview.revenueChangePercent)}
            changeType={changeType(overview.revenueChangePercent)}
            icon="TrendingUp"
          />
          <StatsCard
            title="Coaching (all time)"
            value={formatINR(overview.breakdown.coaching.revenue)}
            icon="Award"
            subtitle={`${overview.breakdown.coaching.count} paid enrollments`}
          />
          <StatsCard
            title="Programs (all time)"
            value={formatINR(overview.breakdown.programs.revenue)}
            icon="ShoppingBag"
            subtitle={`${overview.breakdown.programs.count} purchases`}
          />
          <StatsCard
            title="Books & add-ons"
            value={formatINR(
              overview.breakdown.books.revenue +
                (overview.breakdown.addons?.revenue ?? 0),
            )}
            icon="ShoppingBag"
            subtitle={`${overview.breakdown.books.count} books · ${overview.breakdown.addons?.count ?? 0} add-ons`}
          />
        </div>
      ) : null}

      <section className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-800 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Total business · last {months} months
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          All paid coaching (incl. manual adjustments), programs, books, and
          add-ons
        </p>
        <div className="mt-4">
          {overviewQuery.data?.monthlyRevenue ? (
            <RevenueChart
              data={overviewQuery.data.monthlyRevenue}
              caption={`Calendar months (IST) · ${months}-month window`}
            />
          ) : null}
        </div>
      </section>

      <AnalyticsSection
        title="Coaching plans"
        subtitle="Compare tiers month over month"
        link={{ to: "/plans", label: "Manage plans" }}
        loading={planQuery.isLoading}
        error={planQuery.isError}
      >
        {planQuery.data ? (
          <PlanRevenueComparison data={planQuery.data} />
        ) : null}
      </AnalyticsSection>

      <AnalyticsSection
        title="Retail programs"
        subtitle="Program purchase + program add-on revenue per SKU"
        link={{ to: "/programs", label: "All programs" }}
        loading={programsQuery.isLoading}
        error={programsQuery.isError}
      >
        {monthKeys.length > 0 ? (
          <RevenueComparisonTable
            monthKeys={monthKeys}
            rows={programRows}
            nameColumn="Program"
            caption="RETAIL programs only · includes linked add-on checkout"
            hideZeroRows
          />
        ) : null}
      </AnalyticsSection>

      <AnalyticsSection
        title="PDF books"
        subtitle="Standalone book purchases"
        link={{ to: "/program-books", label: "Book catalogue" }}
        loading={booksQuery.isLoading}
        error={booksQuery.isError}
      >
        {monthKeys.length > 0 ? (
          <RevenueComparisonTable
            monthKeys={monthKeys}
            rows={bookRows}
            nameColumn="Book"
            caption="Paid PDF resources"
            hideZeroRows
          />
        ) : null}
      </AnalyticsSection>
    </div>
  );
}

function AnalyticsSection({
  title,
  subtitle,
  link,
  loading,
  error,
  children,
}: {
  title: string;
  subtitle: string;
  link: { to: string; label: string };
  loading: boolean;
  error: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-800 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        <Link
          to={link.to}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {link.label} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {error ? (
        <ErrorAlert message={`Failed to load ${title.toLowerCase()}.`} />
      ) : loading ? (
        <div className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
      ) : (
        children
      )}
    </section>
  );
}
