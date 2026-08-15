import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Dumbbell } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { ExerciseFormModal } from "@/components/programs/ExerciseFormModal";
import { exerciseService } from "@/services/exerciseService";
import {
  EXERCISE_CATEGORY_ORDER,
  EXERCISE_CATEGORY_LABELS,
  countExercises,
  filterGroupedExercises,
  flattenExercises,
} from "@/utils/exerciseLibrary";
import type { Column } from "@/types/dashboard";
import type { Exercise, ExerciseCategory } from "@/types/programs";
import { useIsAdmin } from "@/hooks/useRole";

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

export function ExercisesPage() {
  const isAdmin = useIsAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [activeTab, setActiveTab] = useState<ExerciseCategory>("SQUAT");
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [editTarget, setEditTarget] = useState<Exercise | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: groupedExercises,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["exercises"],
    queryFn: exerciseService.getAll,
  });

  const exercises = useMemo(
    () => (groupedExercises ? flattenExercises(groupedExercises) : []),
    [groupedExercises],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => exerciseService.remove(id, true),
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

  const filteredGrouped = useMemo(() => {
    if (!groupedExercises) return null;

    return filterGroupedExercises(groupedExercises, (e) => {
      if (statusFilter === "active" && !e.isActive) return false;
      if (statusFilter === "inactive" && e.isActive) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          e.name.toLowerCase().includes(term) ||
          e.slug.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [groupedExercises, searchTerm, statusFilter]);

  const tabCounts = useMemo(() => {
    const counts = {} as Record<ExerciseCategory, number>;
    for (const cat of EXERCISE_CATEGORY_ORDER) {
      counts[cat] = filteredGrouped?.categories[cat]?.length ?? 0;
    }
    return counts;
  }, [filteredGrouped]);

  const activeTabRows = filteredGrouped?.categories[activeTab] ?? [];
  const totalVisible = filteredGrouped ? countExercises(filteredGrouped) : 0;
  const libraryEmpty =
    !isLoading && groupedExercises && countExercises(groupedExercises) === 0;

  const toTableRows = useCallback((items: Exercise[]): ExerciseRow[] => {
    return items.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      category: e.category,
      videoUrl: e.videoUrl || "—",
      sortOrder: String(e.sortOrder),
      isActive: e.isActive ? "Active" : "Inactive",
    }));
  }, []);

  const actionsColumn = {
    key: "id" as keyof ExerciseRow & string,
    header: "Actions",
    render: (value: ExerciseRow[keyof ExerciseRow]) => {
      const exercise = exerciseMap.get(value as string);
      if (!exercise) return null;
      return (
        <div className="flex items-center gap-1">
          {isAdmin ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditTarget(exercise)}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(exercise)}
                className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <span className="text-xs text-gray-400">View only</span>
          )}
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
        {isAdmin ? (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Add Exercise
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "inactive"] as const).map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={statusFilter === s ? "primary" : "secondary"}
              onClick={() => setStatusFilter(s)}
              className="text-xs"
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search exercises..."
          className="w-full sm:w-72"
        />
      </div>

      {!isError && !libraryEmpty && (
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {EXERCISE_CATEGORY_ORDER.map((cat) => (
            <Button
              key={cat}
              type="button"
              size="sm"
              variant={activeTab === cat ? "secondary" : "ghost"}
              onClick={() => setActiveTab(cat)}
              className={cn(
                "shrink-0 gap-1.5",
                activeTab === cat &&
                  "bg-white shadow-sm dark:bg-gray-700 dark:text-white",
              )}
            >
              {EXERCISE_CATEGORY_LABELS[cat]}
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium",
                  activeTab === cat
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                    : "bg-gray-200/70 text-gray-500 dark:bg-gray-600/50 dark:text-gray-400",
                )}
              >
                {tabCounts[cat]}
              </span>
            </Button>
          ))}
        </div>
      )}

      {isError ? (
        <ErrorAlert message="Failed to load exercises." />
      ) : libraryEmpty ? (
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
          {isAdmin ? (
            <Button className="mt-5" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Add Your First Exercise
            </Button>
          ) : null}
        </div>
      ) : !isLoading && totalVisible === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No matches
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Try a different search or status filter.
          </p>
        </div>
      ) : !isLoading && activeTabRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No {EXERCISE_CATEGORY_LABELS[activeTab].toLowerCase()} exercises
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Add one to this category or check another tab.
          </p>
          {isAdmin ? (
            <Button className="mt-5" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Add Exercise
            </Button>
          ) : null}
        </div>
      ) : (
        <DataTable
          data={toTableRows(activeTabRows)}
          columns={
            isAdmin ? [...exerciseColumns, actionsColumn] : exerciseColumns
          }
          isLoading={isLoading}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Exercise"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {(showCreateModal || editTarget) && isAdmin && (
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
