import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { programReviewService } from "@/services/programReviewService";
import type { Column } from "@/types/dashboard";
import type { ProgramReview } from "@/types/programs";

type ReviewRow = {
  id: string;
  program: string;
  rating: string;
  title: string;
  createdAt: string;
};

const reviewColumns: Column<ReviewRow>[] = [
  { key: "program", header: "Program", sortable: true },
  {
    key: "rating",
    header: "Rating",
    sortable: true,
    render: (value) => (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400">
        <Star className="h-3.5 w-3.5 fill-current" />
        {value as string}
      </span>
    ),
  },
  { key: "title", header: "Title", sortable: true },
  { key: "createdAt", header: "Date", sortable: true },
];

export function ProgramReviewsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProgramReview | null>(null);
  const queryClient = useQueryClient();

  const {
    data: reviews,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["program-reviews"],
    queryFn: () => programReviewService.getAll({ limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => programReviewService.remove(id),
    onSuccess: () => {
      toast.success("Review deleted");
      queryClient.invalidateQueries({ queryKey: ["program-reviews"] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Failed to delete review");
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const reviewMap = useMemo(() => {
    const map = new Map<string, ProgramReview>();
    reviews?.forEach((r) => map.set(r.id, r));
    return map;
  }, [reviews]);

  const tableData: ReviewRow[] = useMemo(() => {
    if (!reviews) return [];
    let filtered = reviews;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = reviews.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          r.program?.name?.toLowerCase().includes(term),
      );
    }
    return filtered.map((r) => ({
      id: r.id,
      program: r.program?.name || r.programId,
      rating: String(r.rating),
      title: r.title,
      createdAt: new Date(r.createdAt).toLocaleDateString(),
    }));
  }, [reviews, searchTerm]);

  const actionsColumn = {
    key: "id" as keyof ReviewRow & string,
    header: "Actions",
    render: (value: ReviewRow[keyof ReviewRow]) => {
      const review = reviewMap.get(value as string);
      if (!review) return null;
      return (
        <button
          onClick={() => setDeleteTarget(review)}
          className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      );
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Program Reviews"
        description="Moderate reviews on training programs"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search reviews..."
          className="w-full sm:w-72"
        />
      </div>

      {isError ? (
        <ErrorAlert message="Failed to load reviews." />
      ) : !isLoading && tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-900/20">
            <MessageSquare className="h-8 w-8 text-yellow-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No reviews yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Reviews will appear here once users rate programs.
          </p>
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={[...reviewColumns, actionsColumn]}
          isLoading={isLoading}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Review"
        message={`Delete review "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
