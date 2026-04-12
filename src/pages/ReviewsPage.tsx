import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, MessageSquare } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";

import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { programService } from "@/services/programService";
import { reviewService } from "@/services/reviewService";
import type { Column } from "@/types/dashboard";
import type { Review } from "@/types/program";

type ReviewRow = {
  id: string;
  programName: string;
  name: string;
  email: string;
  rating: string;
  title: string;
  createdAt: string;
};

const reviewColumns: Column<ReviewRow>[] = [
  { key: "programName", header: "Program", sortable: true },
  { key: "name", header: "Reviewer", sortable: true },
  { key: "email", header: "Email", sortable: false },
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

export function ReviewsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: programs } = useQuery({
    queryKey: ["programs"],
    queryFn: () => programService.getAll(true),
  });

  const {
    data: allReviews,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["all-reviews", programs?.map((p) => p.id)],
    queryFn: async () => {
      if (!programs || programs.length === 0)
        return [] as (Review & { programName: string })[];
      const results = await Promise.all(
        programs.map((p) =>
          reviewService
            .getForProgram(p.id)
            .then((res) =>
              (res.reviews || []).map((r) => ({ ...r, programName: p.name })),
            )
            .catch(() => []),
        ),
      );
      return results.flat();
    },
    enabled: !!programs && programs.length > 0,
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const tableData: ReviewRow[] = useMemo(() => {
    if (!allReviews) return [];
    let filtered = allReviews;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = allReviews.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.email.toLowerCase().includes(term) ||
          r.title.toLowerCase().includes(term) ||
          r.programName.toLowerCase().includes(term),
      );
    }
    return filtered.map((r) => ({
      id: r.id,
      programName: r.programName,
      name: r.name,
      email: r.email,
      rating: String(r.rating),
      title: r.title,
      createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—",
    }));
  }, [allReviews, searchTerm]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="View program reviews and ratings from users"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search reviews..."
          className="w-full sm:w-72"
        />
      </div>

      {isError ? (
        <ErrorAlert message="Failed to load reviews. Please try again later." />
      ) : !isLoading && tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-900/20">
            <MessageSquare className="h-8 w-8 text-yellow-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No reviews yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Reviews will show up here once users start rating your programs.
          </p>
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={reviewColumns}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
