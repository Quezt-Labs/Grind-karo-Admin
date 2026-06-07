import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, ShoppingCart, ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { AddUserSection } from "@/components/users/AddUserSection";
import { userService } from "@/services/userService";
import { cn } from "@/utils/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import { AllUsersSection } from "./users/AllUsersSection";
import { PurchasersSection } from "./users/PurchasersSection";
import { CoachingSetupSection } from "./users/CoachingSetupSection";
import { formatINR } from "./users/usersConstants";
import type { Tab } from "./users/usersConstants";
import type { CoachingSetupStatusFilter } from "@/types/user";

export function UsersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [roleFilter, setRoleFilter] = useState<
    "" | "USER" | "ADMIN" | "ASSISTANT_COACH"
  >("");
  const [coachingSetupFilter, setCoachingSetupFilter] =
    useState<CoachingSetupStatusFilter>("awaiting_sheet");

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

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

  const {
    data: coachingSetupData,
    isLoading: coachingSetupLoading,
    isError: coachingSetupError,
  } = useQuery({
    queryKey: ["admin-coaching-setup", search, coachingSetupFilter],
    queryFn: () =>
      userService.getCoachingSetup({
        q: search || undefined,
        status: coachingSetupFilter,
        limit: 500,
      }),
    enabled: tab === "coaching-setup",
  });

  const userRows = useMemo(() => {
    if (!usersData?.items) return [];
    return usersData.items.map((u) => ({
      id: u.id,
      name: u.name || "—",
      email: u.email,
      role: u.role,
      createdAt: new Date(u.createdAt).toLocaleDateString(),
    }));
  }, [usersData]);

  const purchaserRows = useMemo(() => {
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

  const coachingSetupRows = useMemo(() => {
    if (!coachingSetupData?.items) return [];
    return coachingSetupData.items.map((m) => ({
      id: m.id,
      name: m.name || "—",
      email: m.email,
      planName: m.planName,
      setupStatus: m.setupStatus,
      subscribedAt: new Date(m.subscribedAt).toLocaleDateString(),
      expiresAt: new Date(m.expiresAt).toLocaleDateString(),
    }));
  }, [coachingSetupData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="All signed-up users and active customers"
      >
        <Button onClick={() => setShowAddUser((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Add user
        </Button>
      </PageHeader>

      {showAddUser && <AddUserSection onClose={() => setShowAddUser(false)} />}

      {/* Tabs + filters */}
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
              {
                key: "coaching-setup",
                label: "Coaching setup",
                count: coachingSetupData?.counts?.awaitingSheet,
                icon: <ClipboardList className="h-3.5 w-3.5" />,
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
            <Select
              value={roleFilter || "__all__"}
              onValueChange={(v) =>
                setRoleFilter(
                  (v === "__all__" ? "" : v) as
                    | ""
                    | "USER"
                    | "ADMIN"
                    | "ASSISTANT_COACH",
                )
              }
            >
              <SelectTrigger className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm h-9 w-36 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All roles</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="ASSISTANT_COACH">Assistant coach</SelectItem>
              </SelectContent>
            </Select>
          )}
          <DebouncedSearch
            onSearch={handleSearch}
            placeholder="Search by name or email..."
            className="w-full sm:w-72"
          />
        </div>
      </div>

      {tab === "all" && (
        <AllUsersSection
          rows={userRows}
          isLoading={usersLoading}
          isError={usersError}
        />
      )}

      {tab === "purchasers" && (
        <PurchasersSection
          rows={purchaserRows}
          isLoading={purchasersLoading}
          isError={purchasersError}
        />
      )}

      {tab === "coaching-setup" && (
        <CoachingSetupSection
          rows={coachingSetupRows}
          isLoading={coachingSetupLoading}
          isError={coachingSetupError}
          statusFilter={coachingSetupFilter}
          onStatusFilterChange={setCoachingSetupFilter}
          counts={coachingSetupData?.counts}
        />
      )}
    </div>
  );
}
