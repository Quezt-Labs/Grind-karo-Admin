import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import {
  bookPurchaseService,
  type BookPurchase,
  type BookPurchaseStatus,
} from "@/services/bookPurchaseService";
import type { Column } from "@/types/dashboard";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

type BookPurchaseRow = {
  id: string;
  book: string;
  user: string;
  userId: string;
  status: string;
  amount: string;
  paidAt: string;
  createdAt: string;
};

const columns: Column<BookPurchaseRow>[] = [
  { key: "book", header: "Book", sortable: true },
  {
    key: "user",
    header: "User",
    sortable: true,
    render: (value, row) => (
      <Link
        to={`/users/${(row as BookPurchaseRow).userId}`}
        className="font-medium text-primary-600 hover:underline dark:text-primary-400"
      >
        {value as string}
      </Link>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
  { key: "amount", header: "Amount", sortable: true },
  { key: "paidAt", header: "Paid", sortable: true },
  { key: "createdAt", header: "Created", sortable: true },
];

export function BookPurchasesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookPurchaseStatus | "">(
    "PAID",
  );
  const [refundTarget, setRefundTarget] = useState<BookPurchase | null>(null);

  const {
    data: purchases,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["book-purchases", statusFilter],
    queryFn: () =>
      bookPurchaseService.getAll(
        statusFilter ? { status: statusFilter } : undefined,
      ),
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) => bookPurchaseService.refund(id),
    onSuccess: () => {
      toast.success("Book purchase refunded via Razorpay");
      queryClient.invalidateQueries({ queryKey: ["book-purchases"] });
      setRefundTarget(null);
    },
    onError: () => toast.error("Failed to refund book purchase"),
  });

  const purchaseMap = useMemo(() => {
    const map = new Map<string, BookPurchase>();
    purchases?.forEach((p) => map.set(p.id, p));
    return map;
  }, [purchases]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const tableData = useMemo(() => {
    if (!purchases) return [];
    let rows: BookPurchaseRow[] = purchases.map((p) => ({
      id: p.id,
      book: p.bookSnapshot?.title?.trim() || p.book?.title?.trim() || p.bookId,
      user: p.user?.name?.trim() || p.user?.email || p.userId,
      userId: p.userId,
      status: p.status,
      amount: formatINR(p.amount),
      paidAt: p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—",
      createdAt: new Date(p.createdAt).toLocaleDateString(),
    }));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.book.toLowerCase().includes(term) ||
          r.user.toLowerCase().includes(term),
      );
    }
    return rows;
  }, [purchases, searchTerm]);

  const actionsColumn = {
    key: "id" as keyof BookPurchaseRow & string,
    header: "Actions",
    render: (value: BookPurchaseRow[keyof BookPurchaseRow]) => {
      const purchase = purchaseMap.get(value as string);
      if (!purchase || purchase.status !== "PAID") return null;
      return (
        <button
          type="button"
          onClick={() => setRefundTarget(purchase)}
          className="rounded p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-700 dark:text-gray-400 dark:hover:bg-amber-900/20"
          title="Refund via Razorpay"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      );
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book purchases"
        description="PDF book purchase history and stuck checkout visibility."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["", "PENDING", "PAID", "FAILED", "REFUNDED"] as const).map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search books or users..."
          className="w-full sm:w-72"
        />
      </div>

      {isError ? (
        <ErrorAlert message="Failed to load book purchases." />
      ) : !isLoading && tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <BookOpen className="mx-auto mb-4 h-10 w-10 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No book purchases match this filter.
          </p>
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={[...columns, actionsColumn]}
          isLoading={isLoading}
        />
      )}

      <ConfirmModal
        open={!!refundTarget}
        title="Refund Book Purchase"
        message={`Refund "${refundTarget?.bookSnapshot?.title ?? "this book"}" via Razorpay? Access will be revoked immediately.`}
        confirmLabel="Refund"
        variant="danger"
        isLoading={refundMutation.isPending}
        onConfirm={() => refundTarget && refundMutation.mutate(refundTarget.id)}
        onCancel={() => setRefundTarget(null)}
      />
    </div>
  );
}
