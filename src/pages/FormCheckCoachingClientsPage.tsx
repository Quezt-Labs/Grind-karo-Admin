import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Eye, MessageCircle, UserCheck, Video } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/types/dashboard";
import { formCheckInboxService } from "@/services/formCheckInboxService";
import type { FormCheckCoachingClient } from "@/services/formCheckInboxService";
import { buildFormCheckThreadRoute } from "@/utils/formCheckRoutes";
import { formatINR } from "@/pages/users/usersConstants";
import { cn } from "@/utils/cn";
import { useIsAdmin } from "@/hooks/useRole";

type Row = {
  id: string;
  name: string;
  email: string;
  status: string;
  plan: string;
  coachingSubs: string;
  totalSpent: string;
  pendingReviews: string;
  lastPurchase: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function athleteLabel(client: FormCheckCoachingClient): string {
  return client.userName?.trim() || client.userEmail;
}

export function FormCheckCoachingClientsPage() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [search, setSearch] = useState("");
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["form-check-coaching-clients", search],
    queryFn: () =>
      formCheckInboxService.listCoachingClients({
        q: search || undefined,
        limit: 500,
      }),
    placeholderData: keepPreviousData,
  });

  const rows = useMemo<Row[]>(() => {
    return (data?.items ?? []).map((client) => ({
      id: client.userId,
      name: athleteLabel(client),
      email: client.userEmail,
      status: client.isActive ? "Active" : "Expired",
      plan: client.isActive
        ? [client.activePlanName, client.activePlanTier?.toUpperCase()]
            .filter(Boolean)
            .join(" · ") || "—"
        : "—",
      coachingSubs: String(client.coachingSubscriptionsCount),
      totalSpent: formatINR(client.totalSpent),
      pendingReviews:
        client.pendingFormCheckCount > 0
          ? String(client.pendingFormCheckCount)
          : "—",
      lastPurchase: formatDate(client.lastPurchaseAt),
    }));
  }, [data?.items]);

  const columns: Column<Row>[] = [
    { key: "name", header: "Athlete", sortable: true },
    { key: "email", header: "Email", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (value) => (
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
            value === "Active"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
          )}
        >
          {value as string}
        </span>
      ),
    },
    { key: "plan", header: "Active plan", sortable: true },
    { key: "coachingSubs", header: "Coaching subs", sortable: true },
    { key: "totalSpent", header: "Total spent", sortable: true },
    { key: "pendingReviews", header: "Pending reviews", sortable: true },
    { key: "lastPurchase", header: "Last purchase", sortable: true },
    {
      key: "id",
      header: "Actions",
      render: (_value, row) => (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() =>
              navigate(buildFormCheckThreadRoute({ userId: row.id }))
            }
            className="rounded p-1.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400"
            title="Open form checks"
          >
            <Video className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(
                isAdmin ? `/users/${row.id}` : `/coach/athletes/${row.id}`,
              )
            }
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="View user"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/chat?userId=${row.id}`)}
            className="rounded p-1.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400"
            title="Open chat"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coaching clients"
        description="Athletes who purchased a coaching plan. Open form checks or chat from here."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search name or email…"
          className="max-w-md"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {data?.total ?? 0} coaching client
          {(data?.total ?? 0) === 1 ? "" : "s"}
        </p>
      </div>

      {isError && (
        <ErrorAlert message="Failed to load coaching clients. Please try again." />
      )}

      {!isError && !isLoading && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <UserCheck className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No coaching clients yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Athletes with a paid coaching subscription will appear here.
          </p>
        </div>
      )}

      {(isLoading || rows.length > 0) && (
        <DataTable data={rows} columns={columns} isLoading={isLoading} />
      )}
    </div>
  );
}
