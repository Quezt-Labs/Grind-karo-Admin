import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Dumbbell } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { ExerciseFormModal } from "@/components/programs/ExerciseFormModal";
import { exerciseService } from "@/services/exerciseService";
import type { Column } from "@/types/dashboard";
import type { Exercise } from "@/types/programs";

type ExerciseRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  videoUrl: string;
  sortOrder: string;
  isActive: string;
};

const exerciseColumns: Column<ExerciseRow>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "slug", header: "Slug", sortable: true },
  {
    key: "category",
    header: "Category",
    sortable: true,
    render: (value) => {
      const colors: Record<string, string> = {
        SQUAT:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        BENCH:
          "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        DEADLIFT:
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        ACCESSORY:
          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
      };
      return (
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
            colors[value as string] ?? colors.OTHER,
          )}
        >
          {value as string}
        </span>
      );
    },
  },
  {
    key: "videoUrl",
    header: "Video",
    sortable: false,
    render: (value) =>
      value !== "—" ? (
        <a
          href={value as string}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline dark:text-primary-400"
        >
          Link
        </a>
      ) : (
        <span className="text-gray-400">—</span>
      ),
  },
  {
    key: "isActive",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
];

type StatusFilter = "all" | "active" | "inactive";
type CategoryFilter =
  | ""
  | "SQUAT"
  | "BENCH"
  | "DEADLIFT"
  | "ACCESSORY"
  | "OTHER";

export function ExercisesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("");
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [editTarget, setEditTarget] = useState<Exercise | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: exercises,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["exercises"],
    queryFn: exerciseService.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => exerciseService.remove(id),
    onSuccess: () => {
      toast.success("Exercise deleted");
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Failed to delete exercise");
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    exercises?.forEach((e) => map.set(e.id, e));
    return map;
  }, [exercises]);

  const tableData: ExerciseRow[] = useMemo(() => {
    if (!exercises) return [];
    let filtered = exercises;

    if (statusFilter === "active")
      filtered = filtered.filter((e) => e.isActive);
    else if (statusFilter === "inactive")
      filtered = filtered.filter((e) => !e.isActive);

    if (categoryFilter)
      filtered = filtered.filter((e) => e.category === categoryFilter);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.slug.toLowerCase().includes(term),
      );
    }

    return filtered.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      category: e.category,
      videoUrl: e.videoUrl || "—",
      sortOrder: String(e.sortOrder),
      isActive: e.isActive ? "Active" : "Inactive",
    }));
  }, [exercises, searchTerm, statusFilter, categoryFilter]);

  const actionsColumn = {
    key: "id" as keyof ExerciseRow & string,
    header: "Actions",
    render: (value: ExerciseRow[keyof ExerciseRow]) => {
      const exercise = exerciseMap.get(value as string);
      if (!exercise) return null;
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditTarget(exercise)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(exercise)}
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
          title="Exercise Library"
          description="Reusable movement library for program authoring"
        />
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Add Exercise
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === s
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300",
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <Select
            value={categoryFilter || "__all__"}
            onValueChange={(v) =>
              setCategoryFilter((v === "__all__" ? "" : v) as CategoryFilter)
            }
          >
            <SelectTrigger className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs h-8 w-36 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              <SelectItem value="SQUAT">Squat</SelectItem>
              <SelectItem value="BENCH">Bench</SelectItem>
              <SelectItem value="DEADLIFT">Deadlift</SelectItem>
              <SelectItem value="ACCESSORY">Accessory</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search exercises..."
          className="w-full sm:w-72"
        />
      </div>

      {isError ? (
        <ErrorAlert message="Failed to load exercises." />
      ) : !isLoading && tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <Dumbbell className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No exercises yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Add exercises to your library so they can be used in programs.
          </p>
          <Button className="mt-5" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Add Your First Exercise
          </Button>
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={[...exerciseColumns, actionsColumn]}
          isLoading={isLoading}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Exercise"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will deactivate it.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {(showCreateModal || editTarget) && (
        <ExerciseFormModal
          exercise={editTarget}
          onClose={() => {
            setShowCreateModal(false);
            setEditTarget(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["exercises"] });
            setShowCreateModal(false);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
