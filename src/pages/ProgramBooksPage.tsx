import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ExternalLink, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { ProgramBookFormModal } from "@/components/programs/ProgramBookFormModal";
import { programBookService } from "@/services/programBookService";
import type { ProgramBook } from "@/types/programs";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function formatBookPrice(book: ProgramBook): string {
  const onSale = book.salePrice != null && book.salePrice < book.regularPrice;
  if (onSale) return formatINR(book.salePrice!);
  if (book.regularPrice <= 0) return "Free";
  return formatINR(book.regularPrice);
}

export function ProgramBooksPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProgramBook | null>(null);
  const [editTarget, setEditTarget] = useState<ProgramBook | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: books,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["program-books"],
    queryFn: programBookService.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => programBookService.remove(id),
    onSuccess: () => {
      toast.success("Book deleted");
      queryClient.invalidateQueries({ queryKey: ["program-books"] });
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete book"),
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const filtered = useMemo(() => {
    if (!books) return [];
    if (!searchTerm) return books;
    const term = searchTerm.toLowerCase();
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.slug.toLowerCase().includes(term),
    );
  }, [books, searchTerm]);

  function handleModalSuccess() {
    queryClient.invalidateQueries({ queryKey: ["program-books"] });
    setShowCreateModal(false);
    setEditTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Program Books"
          description="PDF books shown to all athletes in Program Guide"
        />
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Add Book
        </Button>
      </div>

      <DebouncedSearch
        placeholder="Search by title or slug…"
        onSearch={handleSearch}
      />

      {isError && (
        <ErrorAlert message="Failed to load program books. Try again." />
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
          <FileText className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm
              ? "No books match your search."
              : "No PDF books yet. Add one to get started."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Order
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((book) => (
                <tr
                  key={book.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-red-500" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {book.title}
                      </span>
                    </div>
                    {book.body && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                        {book.body}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-500">
                    {book.slug}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {book.salePrice != null &&
                    book.salePrice < book.regularPrice ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatINR(book.salePrice)}
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          {book.regularPrice > 0
                            ? formatINR(book.regularPrice)
                            : "Free"}
                        </span>
                      </div>
                    ) : (
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatBookPrice(book)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {book.sortOrder}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {book.pdfUrl && (
                        <a
                          href={book.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-700"
                          title="Open PDF"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => setEditTarget(book)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-700"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(book)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-gray-700"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(showCreateModal || editTarget) && (
        <ProgramBookFormModal
          book={editTarget ?? undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditTarget(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete book"
        message={`Delete "${deleteTarget?.title}"? Athletes will no longer see this PDF.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
