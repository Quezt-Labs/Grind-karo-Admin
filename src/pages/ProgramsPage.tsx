import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { ProgramFormModal } from "@/components/programs/ProgramFormModal";
import { programService } from "@/services/programService";
import type { Column } from "@/types/dashboard";
import type { Program } from "@/types/programs";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

type ProgramRow = {
  id: string;
  name: string;
  slug: string;
  price: string;
  frequency: string;
  length: string;
  displayOrder: string;
  isActive: string;
};

const programColumns: Column<ProgramRow>[] = [
  { key: "name", header: "Program", sortable: true },
  { key: "slug", header: "Slug", sortable: true },
  { key: "price", header: "Price", sortable: true },
  { key: "frequency", header: "Frequency", sortable: false },
  { key: "length", header: "Length", sortable: true },
  { key: "displayOrder", header: "Order", sortable: true },
  {
    key: "isActive",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
];

type StatusFilter = "all" | "active" | "inactive";

export function ProgramsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [editTarget, setEditTarget] = useState<Program | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: programs,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["programs"],
    queryFn: programService.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => programService.remove(id),
    onSuccess: () => {
      toast.success("Program deleted");
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Failed to delete program");
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const programMap = useMemo(() => {
    const map = new Map<string, Program>();
    programs?.forEach((p) => map.set(p.id, p));
    return map;
  }, [programs]);

  const statusCounts = useMemo(() => {
    if (!programs) return { all: 0, active: 0, inactive: 0 };
    return {
      all: programs.length,
      active: programs.filter((p) => p.isActive).length,
      inactive: programs.filter((p) => !p.isActive).length,
    };
  }, [programs]);

  const tableData: ProgramRow[] = useMemo(() => {
    if (!programs) return [];
    let filtered = programs;

    if (statusFilter === "active")
      filtered = filtered.filter((p) => p.isActive);
    else if (statusFilter === "inactive")
      filtered = filtered.filter((p) => !p.isActive);

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
      price: p.salePrice
        ? `${formatINR(p.salePrice)} (was ${formatINR(p.regularPrice)})`
        : formatINR(p.regularPrice),
      frequency: p.liftingFrequency || "—",
      length: p.programLengthWeeks ? `${p.programLengthWeeks} weeks` : "—",
      displayOrder: String(p.displayOrder),
      isActive: p.isActive ? "Active" : "Inactive",
    }));
  }, [programs, searchTerm, statusFilter]);

  const actionsColumn = {
    key: "id" as keyof ProgramRow & string,
    header: "Actions",
    render: (value: ProgramRow[keyof ProgramRow]) => {
      const program = programMap.get(value as string);
      if (!program) return null;
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/programs/${program.id}`)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="Open Editor"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => setEditTarget(program)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="Edit metadata"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(program)}
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
          title="Programs"
          description="Manage training programs and content"
        />
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Create Program
        </Button>
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
                    ? "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
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
          placeholder="Search programs..."
          className="w-full sm:w-72"
        />
      </div>

      {isError ? (
        <ErrorAlert message="Failed to load programs." />
      ) : !isLoading && tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <BookOpen className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No programs yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Create a training program to start authoring content.
          </p>
          <Button className="mt-5" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Create Your First Program
          </Button>
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={[...programColumns, actionsColumn]}
          isLoading={isLoading}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Program"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will deactivate the program.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {(showCreateModal || editTarget) && (
        <ProgramFormModal
          program={editTarget}
          onClose={() => {
            setShowCreateModal(false);
            setEditTarget(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["programs"] });
            setShowCreateModal(false);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
