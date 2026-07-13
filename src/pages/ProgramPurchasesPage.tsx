import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { programPurchaseService } from "@/services/programPurchaseService";
import type { Column } from "@/types/dashboard";
import type { ProgramPurchase } from "@/types/programs";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

type PurchaseRow = {
  id: string;
  program: string;
  user: string;
  status: string;
  amount: string;
  paidAt: string;
  createdAt: string;
};

const purchaseColumns: Column<PurchaseRow>[] = [
  { key: "program", header: "Program", sortable: true },
  { key: "user", header: "User", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
  { key: "amount", header: "Amount", sortable: true },
  { key: "paidAt", header: "Paid At", sortable: true },
  { key: "createdAt", header: "Created", sortable: true },
];

type StatusFilter = "" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export function ProgramPurchasesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PAID");
  const [refundTarget, setRefundTarget] = useState<ProgramPurchase | null>(
    null,
  );
  const queryClient = useQueryClient();

  const {
    data: purchases,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["program-purchases", statusFilter],
    queryFn: () =>
      programPurchaseService.getAll(
        statusFilter ? { status: statusFilter } : undefined,
      ),
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) => programPurchaseService.refund(id),
    onSuccess: () => {
      toast.success("Purchase marked as refunded");
      queryClient.invalidateQueries({ queryKey: ["program-purchases"] });
      setRefundTarget(null);
    },
    onError: () => {
      toast.error("Failed to refund purchase");
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const purchaseMap = useMemo(() => {
    const map = new Map<string, ProgramPurchase>();
    purchases?.forEach((p) => map.set(p.id, p));
    return map;
  }, [purchases]);

  const tableData: PurchaseRow[] = useMemo(() => {
    if (!purchases) return [];
    let filtered = purchases;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.program?.name?.toLowerCase().includes(term) ||
          p.user?.email?.toLowerCase().includes(term) ||
          p.user?.name?.toLowerCase().includes(term),
      );
    }

    return filtered.map((p) => ({
      id: p.id,
      program: p.program?.name || p.programId,
      user: p.user?.email || p.userId,
      status: p.status,
      amount: formatINR(p.amount),
      paidAt: p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—",
      createdAt: new Date(p.createdAt).toLocaleDateString(),
    }));
  }, [purchases, searchTerm]);

  const actionsColumn = {
    key: "id" as keyof PurchaseRow & string,
    header: "Actions",
    render: (value: PurchaseRow[keyof PurchaseRow]) => {
      const purchase = purchaseMap.get(value as string);
      if (!purchase || purchase.status !== "PAID") return null;
      return (
        <button
          onClick={() => setRefundTarget(purchase)}
          className="rounded p-1.5 text-gray-500 hover:bg-orange-50 hover:text-orange-600 dark:text-gray-400 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
          title="Mark Refunded"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      );
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Program Purchases"
        description="Oversee program purchases and process refunds"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["", "PENDING", "PAID", "FAILED", "REFUNDED"] as const).map((s) => (
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
              {s || "All"}
            </button>
          ))}
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search by program or user..."
          className="w-full sm:w-72"
        />
      </div>

      {isError ? (
        <ErrorAlert message="Failed to load purchases." />
      ) : !isLoading && tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <ShoppingBag className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No purchases yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Program purchases will appear here once users buy programs.
          </p>
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={[...purchaseColumns, actionsColumn]}
          isLoading={isLoading}
        />
      )}

      <ConfirmModal
        open={!!refundTarget}
        title="Refund Purchase"
        message={`Mark this purchase for "${refundTarget?.program?.name}" as refunded? Make sure you've already processed the refund in Razorpay. The user will immediately lose access.`}
        confirmLabel="Mark Refunded"
        variant="danger"
        isLoading={refundMutation.isPending}
        onConfirm={() => refundTarget && refundMutation.mutate(refundTarget.id)}
        onCancel={() => setRefundTarget(null)}
      />
    </div>
  );
}
