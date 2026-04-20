import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, Eye, ShoppingCart } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { userService } from "@/services/userService";
import { cn } from "@/utils/cn";
import type { Column } from "@/types/dashboard";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

// ---- All Users tab --------------------------------------------------------

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

const userColumns: Column<UserRow>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "email", header: "Email", sortable: true },
  {
    key: "role",
    header: "Role",
    sortable: true,
    render: (value) => (
      <span
        className={cn(
          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
          value === "ADMIN"
            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        )}
      >
        {value as string}
      </span>
    ),
  },
  { key: "createdAt", header: "Joined", sortable: true },
];

// ---- Purchasers tab -------------------------------------------------------

type PurchaserRow = {
  id: string;
  name: string;
  email: string;
  coachingSubs: string;
  programPurchases: string;
  totalSpent: string;
  lastPurchase: string;
};

const purchaserColumns: Column<PurchaserRow>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "email", header: "Email", sortable: true },
  { key: "coachingSubs", header: "Coaching", sortable: true },
  { key: "programPurchases", header: "Programs", sortable: true },
  { key: "totalSpent", header: "Total Spent", sortable: true },
  { key: "lastPurchase", header: "Last Purchase", sortable: true },
];

type Tab = "all" | "purchasers";

export function UsersPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "USER" | "ADMIN">("");

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  // All users query
  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
  } = useQuery({
    queryKey: ["admin-users", search, roleFilter],
    queryFn: () =>
      userService.getAll({
        q: search || undefined,
        role: roleFilter || undefined,
        limit: 500,
      }),
    enabled: tab === "all",
  });

  // Purchasers query
  const {
    data: purchasersData,
    isLoading: purchasersLoading,
    isError: purchasersError,
  } = useQuery({
    queryKey: ["admin-purchasers", search],
    queryFn: () =>
      userService.getPurchasers({
        q: search || undefined,
        limit: 500,
      }),
    enabled: tab === "purchasers",
  });

  // Map rows
  const userRows: UserRow[] = useMemo(() => {
    if (!usersData?.items) return [];
    return usersData.items.map((u) => ({
      id: u.id,
      name: u.name || "—",
      email: u.email,
      role: u.role,
      createdAt: new Date(u.createdAt).toLocaleDateString(),
    }));
  }, [usersData]);

  const purchaserRows: PurchaserRow[] = useMemo(() => {
    if (!purchasersData?.items) return [];
    return purchasersData.items.map((p) => ({
      id: p.id,
      name: p.name || "—",
      email: p.email,
      coachingSubs: String(p.coachingSubscriptionsCount),
      programPurchases: String(p.programPurchasesCount),
      totalSpent: formatINR(p.totalSpent),
      lastPurchase: new Date(p.lastPurchaseAt).toLocaleDateString(),
    }));
  }, [purchasersData]);

  const userActionsColumn = {
    key: "id" as keyof UserRow & string,
    header: "Actions",
    render: (value: UserRow[keyof UserRow]) => (
      <button
        onClick={() => navigate(`/users/${value}`)}
        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        title="View purchases"
      >
        <Eye className="h-4 w-4" />
      </button>
    ),
  };

  const purchaserActionsColumn = {
    key: "id" as keyof PurchaserRow & string,
    header: "Actions",
    render: (value: PurchaserRow[keyof PurchaserRow]) => (
      <button
        onClick={() => navigate(`/users/${value}`)}
        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        title="View purchases"
      >
        <Eye className="h-4 w-4" />
      </button>
    ),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="All signed-up users and active customers"
      />

      {/* Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(
            [
              {
                key: "all",
                label: "All Users",
                count: usersData?.total,
                icon: <Users className="h-3.5 w-3.5" />,
              },
              {
                key: "purchasers",
                label: "Purchasers",
                count: purchasersData?.total,
                icon: <ShoppingCart className="h-3.5 w-3.5" />,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    "ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium",
                    tab === t.key
                      ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                      : "bg-gray-200/70 text-gray-500 dark:bg-gray-600/50 dark:text-gray-400",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {tab === "all" && (
            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as "" | "USER" | "ADMIN")
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="">All roles</option>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          )}
          <DebouncedSearch
            onSearch={handleSearch}
            placeholder="Search by name or email..."
            className="w-full sm:w-72"
          />
        </div>
      </div>

      {/* All Users Table */}
      {tab === "all" && (
        <>
          {usersError ? (
            <ErrorAlert message="Failed to load users. Please try again later." />
          ) : !usersLoading && userRows.length === 0 ? (
            <EmptyUsers />
          ) : (
            <DataTable
              data={userRows}
              columns={[...userColumns, userActionsColumn]}
              isLoading={usersLoading}
            />
          )}
        </>
      )}

      {/* Purchasers Table */}
      {tab === "purchasers" && (
        <>
          {purchasersError ? (
            <ErrorAlert message="Failed to load purchasers. Please try again later." />
          ) : !purchasersLoading && purchaserRows.length === 0 ? (
            <EmptyPurchasers />
          ) : (
            <DataTable
              data={purchaserRows}
              columns={[...purchaserColumns, purchaserActionsColumn]}
              isLoading={purchasersLoading}
            />
          )}
        </>
      )}
    </div>
  );
}

function EmptyUsers() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
        <Users className="h-8 w-8 text-primary-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        No users found
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Users will appear here once people sign up.
      </p>
    </div>
  );
}

function EmptyPurchasers() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
        <ShoppingCart className="h-8 w-8 text-primary-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        No purchasers yet
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Users who make a paid purchase will appear here.
      </p>
    </div>
  );
}
