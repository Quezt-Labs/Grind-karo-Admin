import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, MessageSquare } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { EmptyState } from "@/components/ui/EmptyState";
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
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : tableData.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          message="No reviews yet"
        />
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
