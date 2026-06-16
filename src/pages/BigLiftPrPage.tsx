import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { athleteEngagementService } from "@/services/athleteEngagementService";
import type { Column } from "@/types/dashboard";

type Row = {
  id: string;
  userName: string;
  userEmail: string;
  status: string;
  squat: string;
  bench: string;
  deadlift: string;
  total: string;
  lastDate: string;
  userId: string;
};

function formatKg(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export function BigLiftPrPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-big-lift-pr"],
    queryFn: () => athleteEngagementService.listBigLiftPrSummaries(),
  });

  const rows = useMemo<Row[]>(() => {
    return (data ?? []).map((item) => ({
      id: item.userId,
      userId: item.userId,
      userName: item.userName,
      userEmail: item.userEmail ?? "—",
      status: item.isDue ? "Due" : "Up to date",
      squat: item.lastCheckin
        ? `${formatKg(item.lastCheckin.squatKg)} kg`
        : "—",
      bench: item.lastCheckin
        ? `${formatKg(item.lastCheckin.benchKg)} kg`
        : "—",
      deadlift: item.lastCheckin
        ? `${formatKg(item.lastCheckin.deadliftKg)} kg`
        : "—",
      total: item.lastCheckin
        ? `${formatKg(item.lastCheckin.totalKg)} kg`
        : "—",
      lastDate: item.lastCheckin
        ? new Date(item.lastCheckin.createdAt).toLocaleDateString("en-IN")
        : "Never",
    }));
  }, [data]);

  const dueCount = rows.filter((r) => r.status === "Due").length;

  const columns: Column<Row>[] = [
    { key: "userName", header: "Athlete", sortable: true },
    { key: "userEmail", header: "Email", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (value) => (
        <StatusBadge
          status={value === "Due" ? "Due" : "Up to date"}
          className={
            value === "Due"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
              : undefined
          }
        />
      ),
    },
    { key: "squat", header: "Squat", sortable: false },
    { key: "bench", header: "Bench", sortable: false },
    { key: "deadlift", header: "Deadlift", sortable: false },
    { key: "total", header: "Total", sortable: false },
    { key: "lastDate", header: "Last check-in", sortable: true },
    {
      key: "userId",
      header: "",
      sortable: false,
      render: (_value, row) => (
        <Link
          to={`/users/${row.userId}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          View
          <ExternalLink className="h-3 w-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Big 3 PR Check-ins"
        description="Squat, bench & deadlift — athletes submit every ~2 months"
      />

      {isError && <ErrorAlert message="Failed to load PR data" />}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {dueCount > 0
              ? `${dueCount} athlete(s) due for a PR check-in`
              : "All athletes are up to date"}
          </p>
          <DataTable columns={columns} data={rows} />
        </>
      )}
    </div>
  );
}
