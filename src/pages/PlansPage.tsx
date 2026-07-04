import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, CreditCard, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { planService } from "@/services/planService";
import type { Column } from "@/types/dashboard";
import type { CoachingPlan } from "@/types/program";
import { PlanFormModal } from "@/components/programs/PlanFormModal";
import { billingPeriodWeeks } from "@/utils/coachingBillingPeriod";
import { useIsAdmin } from "@/hooks/useRole";

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
  badge: string;
  displayOrder: string;
  isActive: string;
  reviews: string;
};

const planColumns: Column<PlanRow>[] = [
  { key: "name", header: "Plan Name", sortable: true },
  { key: "slug", header: "Slug", sortable: true },
  { key: "price", header: "Lifter fee", sortable: true },
  { key: "validityMonths", header: "Validity", sortable: true },
  {
    key: "badge",
    header: "Badge",
    sortable: false,
    render: (value) =>
      value === "—" ? (
        <span className="text-gray-400">—</span>
      ) : (
        <LevelBadge level={value as string} />
      ),
  },
  { key: "displayOrder", header: "Order", sortable: true },
  {
    key: "isActive",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
  { key: "reviews", header: "Reviews", sortable: true },
];

type StatusFilter = "all" | "active" | "inactive";

export function PlansPage() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<CoachingPlan | null>(null);
  const [editTarget, setEditTarget] = useState<CoachingPlan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: plans,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["coaching-plans"],
    queryFn: planService.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => planService.remove(id),
    onSuccess: () => {
      toast.success("Plan deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["coaching-plans"] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Failed to delete plan");
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const planMap = useMemo(() => {
    const map = new Map<string, CoachingPlan>();
    plans?.forEach((p) => map.set(p.id, p));
    return map;
  }, [plans]);

  const statusCounts = useMemo(() => {
    if (!plans) return { all: 0, active: 0, inactive: 0 };
    return {
      all: plans.length,
      active: plans.filter((p) => p.isActive).length,
      inactive: plans.filter((p) => !p.isActive).length,
    };
  }, [plans]);

  const tableData: PlanRow[] = useMemo(() => {
    if (!plans) return [];
    let filtered = plans;

    if (statusFilter === "active") {
      filtered = filtered.filter((p) => p.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((p) => !p.isActive);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.slug.toLowerCase().includes(term),
      );
    }
    return filtered.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: formatINR(p.price),
      validityMonths: `${billingPeriodWeeks(p.validityMonths)} weeks`,
      badge: p.badge || "—",
      displayOrder: String(p.displayOrder),
      isActive: p.isActive ? "Active" : "Inactive",
      reviews: p.totalReviews
        ? `${p.averageRating.toFixed(1)}★ (${p.totalReviews})`
        : "—",
    }));
  }, [plans, searchTerm, statusFilter]);

  const actionsColumn = {
    key: "id" as keyof PlanRow & string,
    header: "Actions",
    render: (value: PlanRow[keyof PlanRow]) => {
      const plan = planMap.get(value as string);
      if (!plan) return null;
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/plans/${plan.id}`)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setEditTarget(plan)}
                className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(plan)}
                className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      );
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Coaching Plans"
          description={
            isAdmin
              ? "Manage coaching plans and pricing"
              : "View plans and grant subscriptions to your assigned athletes"
          }
        />
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Create Plan
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(
            [
              { key: "all", label: "All", count: statusCounts.all },
              { key: "active", label: "Active", count: statusCounts.active },
              {
                key: "inactive",
                label: "Inactive",
                count: statusCounts.inactive,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === tab.key
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium",
                  statusFilter === tab.key
                    ? tab.key === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : tab.key === "inactive"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                    : "bg-gray-200/70 text-gray-500 dark:bg-gray-600/50 dark:text-gray-400",
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search plans..."
          className="w-full sm:w-72"
        />
      </div>

      {isError ? (
        <ErrorAlert message="Failed to load plans. Please try again later." />
      ) : !isLoading && tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <CreditCard className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No plans yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {isAdmin
              ? "Create coaching plans so users can subscribe."
              : "No coaching plans are available yet."}
          </p>
          {isAdmin && (
            <Button className="mt-5" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Create Your First Plan
            </Button>
          )}
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={[...planColumns, actionsColumn]}
          isLoading={isLoading}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Plan"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will deactivate the plan.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {isAdmin && (showCreateModal || editTarget) && (
        <PlanFormModal
          plan={editTarget}
          onClose={() => {
            setShowCreateModal(false);
            setEditTarget(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["coaching-plans"] });
            setShowCreateModal(false);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
