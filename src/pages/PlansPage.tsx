import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, CreditCard, X } from "lucide-react";
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
  programName: string;
  price: string;
  validityMonths: string;
  displayOrder: string;
  isActive: string;
};

const planColumns: Column<PlanRow>[] = [
  { key: "name", header: "Plan Name", sortable: true },
  { key: "programName", header: "Program", sortable: true },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const programFilter = searchParams.get("program");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: () => programService.getAll(true),
  });

  // Fetch plans for all programs
  const {
    data: allPlans,
    isLoading: plansLoading,
    isError,
  } = useQuery({
    queryKey: ["all-plans", programs?.map((p) => p.id)],
    queryFn: async () => {
      if (!programs || programs.length === 0) return [];
      const planArrays = await Promise.all(
        programs.map((p) => planService.getForProgram(p.id).catch(() => [])),
      );
      return planArrays.flat();
    },
    enabled: !!programs && programs.length > 0,
  });

  const isLoading = programsLoading || plansLoading;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => planService.remove(id),
    onSuccess: () => {
      toast.success("Plan deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["all-plans"] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Failed to delete plan");
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const programMap = useMemo(() => {
    const map = new Map<string, string>();
    programs?.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [programs]);

  const planMap = useMemo(() => {
    const map = new Map<string, Plan>();
    allPlans?.forEach((p) => map.set(p.id, p));
    return map;
  }, [allPlans]);

  const tableData: PlanRow[] = useMemo(() => {
    if (!allPlans) return [];
    let filtered = allPlans;
    // Filter by program if URL has ?program=id
    if (programFilter) {
      filtered = filtered.filter((p) => p.programId === programFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (programMap.get(p.programId) || "").toLowerCase().includes(term),
      );
    }
    return filtered.map((p) => ({
      id: p.id,
      name: p.name,
      programName: programMap.get(p.programId) || p.programId,
      price: formatPrice(p.price),
      validityMonths: `${p.validityMonths} months`,
      displayOrder: String(p.displayOrder),
      isActive: p.isActive ? "Active" : "Inactive",
    }));
  }, [allPlans, searchTerm, programMap, programFilter]);

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
      <PageHeader
        title="Plans"
        description="Manage subscription plans for your programs"
      >
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Create Plan
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {programFilter ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
              Program: {programMap.get(programFilter) || "Unknown"}
              <button
                onClick={() => setSearchParams({})}
                className="ml-1 rounded hover:bg-primary-100 dark:hover:bg-primary-800/40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        ) : (
          <div />
        )}
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
            Create subscription plans for your programs so users can subscribe
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
          programs={programs || []}
          onClose={() => {
            setShowCreateModal(false);
            setEditTarget(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["all-plans"] });
            setShowCreateModal(false);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
