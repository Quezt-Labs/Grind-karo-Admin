import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, CreditCard, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { programService } from "@/services/programService";
import { planService } from "@/services/planService";
import type { Column } from "@/types/dashboard";
import type { Plan } from "@/types/program";
import { PlanFormModal } from "@/components/programs/PlanFormModal";

type PlanRow = {
  id: string;
  name: string;
  price: string;
  validityMonths: string;
  displayOrder: string;
  isActive: string;
};

const planColumns: Column<PlanRow>[] = [
  { key: "name", header: "Plan Name", sortable: true },
  { key: "price", header: "Price", sortable: true },
  { key: "validityMonths", header: "Validity", sortable: true },
  { key: "displayOrder", header: "Order", sortable: true },
  {
    key: "isActive",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
];

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function PlansPage() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ["program", programId],
    queryFn: () => programService.getById(programId!),
    enabled: !!programId,
  });

  const {
    data: plans,
    isLoading: plansLoading,
    isError,
  } = useQuery({
    queryKey: ["plans", programId],
    queryFn: () => planService.getForProgram(programId!),
    enabled: !!programId,
  });

  const isLoading = programLoading || plansLoading;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => planService.remove(id),
    onSuccess: () => {
      toast.success("Plan deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["plans", programId] });
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
    const map = new Map<string, Plan>();
    plans?.forEach((p) => map.set(p.id, p));
    return map;
  }, [plans]);

  const tableData: PlanRow[] = useMemo(() => {
    if (!plans) return [];
    let filtered = plans;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = plans.filter((p) => p.name.toLowerCase().includes(term));
    }
    return filtered.map((p) => ({
      id: p.id,
      name: p.name,
      price: formatPrice(p.price),
      validityMonths: `${p.validityMonths} months`,
      displayOrder: String(p.displayOrder),
      isActive: p.isActive ? "Active" : "Inactive",
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
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/programs")}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {program?.name ? `${program.name} — Plans` : "Plans"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage subscription plans for this program
          </p>
        </div>
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
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <CreditCard className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No plans yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Create subscription plans for this program so users can subscribe
            and access content.
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
          programs={program ? [program] : []}
          onClose={() => {
            setShowCreateModal(false);
            setEditTarget(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["plans", programId] });
            setShowCreateModal(false);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
