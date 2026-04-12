import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { programService } from "@/services/programService";
import { cn } from "@/utils/cn";
import type { Column } from "@/types/dashboard";
import type { Program } from "@/types/program";

type ProgramRow = {
  id: string;
  name: string;
  level: string;
  category: string;
  duration: string;
  badge: string;
  isActive: string;
};

const programColumns: Column<ProgramRow>[] = [
  { key: "name", header: "Program Name", sortable: true },
  {
    key: "level",
    header: "Level",
    sortable: true,
    render: (value) => <LevelBadge level={value as string} />,
  },
  { key: "category", header: "Category", sortable: true },
  { key: "duration", header: "Duration", sortable: true },
  {
    key: "badge",
    header: "Badge",
    sortable: false,
    render: (value) => {
      const badge = value as string;
      if (badge === "—") return <span className="text-gray-400">—</span>;
      const label = badge
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return (
        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          {label}
        </span>
      );
    },
  },
  {
    key: "isActive",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
];

export function ProgramsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const queryClient = useQueryClient();

  const {
    data: programs,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["programs", showInactive],
    queryFn: () => programService.getAll(showInactive),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => programService.remove(id),
    onSuccess: () => {
      toast.success("Program deleted successfully");
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

  const tableData: ProgramRow[] = useMemo(() => {
    if (!programs) return [];
    let filtered = programs;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = programs.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term) ||
          p.level.toLowerCase().includes(term),
      );
    }
    return filtered.map((p) => ({
      id: p.id,
      name: p.name,
      level: p.level,
      category: p.category,
      duration: `${p.duration} weeks`,
      badge: p.badge || "—",
      isActive: p.isActive ? "Active" : "Inactive",
    }));
  }, [programs, searchTerm]);

  // Map id -> original Program for actions
  const programMap = useMemo(() => {
    const map = new Map<string, Program>();
    programs?.forEach((p) => map.set(p.id, p));
    return map;
  }, [programs]);

  const actionsColumn = {
    key: "id" as keyof ProgramRow & string,
    header: "Actions",
    render: (value: ProgramRow[keyof ProgramRow]) => {
      const program = programMap.get(value as string);
      if (!program) return null;
      return (
        <div className="flex items-center gap-1">
          <Link
            to={`/plans?program=${program.id}`}
            className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
            title="View Plans"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link
            to={`/programs/${program.id}/edit`}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Link>
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
      {/* Header */}
      <PageHeader title="Programs" description="Manage your coaching programs">
        <Link to="/programs/new">
          <Button>
            <Plus className="h-4 w-4" />
            Create Program
          </Button>
        </Link>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInactive((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              showInactive
                ? "border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300"
                : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800",
            )}
          >
            {showInactive ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            {showInactive ? "Showing all" : "Active only"}
          </button>
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search programs..."
          className="w-full sm:w-72"
        />
      </div>

      {/* Table */}
      {isError ? (
        <ErrorAlert message="Failed to load programs. Please try again later." />
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={[...programColumns, actionsColumn]}
          isLoading={isLoading}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Program"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will deactivate the program.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
