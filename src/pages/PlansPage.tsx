import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, CreditCard, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { planService } from "@/services/planService";
import type { Column } from "@/types/dashboard";
import type { CoachingPlan } from "@/types/program";
import { PlanFormModal } from "@/components/programs/PlanFormModal";

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
  { key: "price", header: "Price", sortable: true },
  { key: "validityMonths", header: "Validity", sortable: true },
  { key: "badge", header: "Badge", sortable: false },
  { key: "displayOrder", header: "Order", sortable: true },
  {
    key: "isActive",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
  { key: "reviews", header: "Reviews", sortable: true },
];

export function PlansPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
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

  const tableData: PlanRow[] = useMemo(() => {
    if (!plans) return [];
    let filtered = plans;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = plans.filter(
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
      validityMonths: `${p.validityMonths} months`,
      badge: p.badge || "—",
      displayOrder: String(p.displayOrder),
      isActive: p.isActive ? "Active" : "Inactive",
      reviews: p.totalReviews
        ? `${p.averageRating.toFixed(1)}★ (${p.totalReviews})`
        : "—",
    }));
  }, [plans, searchTerm]);

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
        </div>
      );
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Coaching Plans"
          description="Manage coaching plans and pricing"
        />
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Create Plan
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
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
            Create coaching plans so users can subscribe.
          </p>
          <Button className="mt-5" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Create Your First Plan
          </Button>
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

      {(showCreateModal || editTarget) && (
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
