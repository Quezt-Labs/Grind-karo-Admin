import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, History, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { cn } from "@/utils/cn";
import {
  paymentService,
  type AdminPaymentRow,
  type PaymentKind,
} from "@/services/paymentService";

type TabKey = "stuck" | "search" | "history";

const KIND_LABELS: Record<PaymentKind, string> = {
  coaching: "Coaching",
  program: "Program",
  book: "Book",
  addon: "Add-on",
};

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function PaymentRowCard({ row }: { row: AdminPaymentRow }) {
  const unpaid =
    row.kind === "coaching" &&
    (row.status === "PENDING" ||
      (row.status === "ACTIVE" && row.razorpayPaymentId === null));

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {KIND_LABELS[row.kind]}
            </span>
            <StatusBadge status={unpaid ? "PENDING" : row.status} />
            {unpaid ? (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                Unpaid checkout
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {row.productName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <Link
              to={`/users/${row.userId}?tab=coaching`}
              className="font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              {row.userName?.trim() || row.userEmail}
            </Link>
            {" · "}
            {formatINR(row.amount)}
            {" · "}
            {new Date(row.createdAt).toLocaleString("en-IN")}
          </p>
          {row.razorpayOrderId ? (
            <p className="mt-1 font-mono text-[10px] text-gray-400">
              Order {row.razorpayOrderId}
            </p>
          ) : null}
        </div>
        <Link
          to={`/users/${row.userId}?tab=coaching#record-payment-panel`}
          className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Open billing
        </Link>
      </div>
    </article>
  );
}

export function PaymentsOpsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("stuck");
  const [kindFilter, setKindFilter] = useState<PaymentKind | "all">("all");
  const [searchQ, setSearchQ] = useState("");

  const stuckQuery = useQuery({
    queryKey: ["payments-stuck", kindFilter],
    queryFn: () =>
      paymentService.listStuck({
        kind: kindFilter,
        limit: 100,
      }),
    enabled: tab === "stuck",
  });

  const searchQuery = useQuery({
    queryKey: ["payments-search", searchQ, kindFilter],
    queryFn: () =>
      paymentService.search({
        q: searchQ,
        kind: kindFilter,
        limit: 100,
      }),
    enabled: tab === "search" && searchQ.trim().length >= 2,
  });

  const purchaseHistoryQuery = useQuery({
    queryKey: ["payments-reconcile-history-purchase"],
    queryFn: () => paymentService.listPurchaseReconcileHistory({ limit: 20 }),
    enabled: tab === "history",
  });

  const coachingHistoryQuery = useQuery({
    queryKey: ["payments-reconcile-history-coaching"],
    queryFn: () => paymentService.listCoachingReconcileHistory({ limit: 20 }),
    enabled: tab === "history",
  });

  const purchaseReconcile = useMutation({
    mutationFn: () => paymentService.runPurchaseReconcile(),
    onSuccess: (report) => {
      toast.success("Purchase reconcile finished");
      console.info(report);
      void queryClient.invalidateQueries({ queryKey: ["payments-stuck"] });
      void queryClient.invalidateQueries({
        queryKey: ["payments-reconcile-history-purchase"],
      });
    },
    onError: () => toast.error("Purchase reconcile failed"),
  });

  const coachingReconcile = useMutation({
    mutationFn: () => paymentService.runCoachingReconcile(),
    onSuccess: (report) => {
      toast.success("Coaching reconcile finished");
      console.info(report);
      void queryClient.invalidateQueries({ queryKey: ["payments-stuck"] });
      void queryClient.invalidateQueries({
        queryKey: ["payments-reconcile-history-coaching"],
      });
    },
    onError: () => toast.error("Coaching reconcile failed"),
  });

  const kindOptions: Array<{ key: PaymentKind | "all"; label: string }> = [
    { key: "all", label: "All" },
    { key: "coaching", label: "Coaching" },
    { key: "program", label: "Program" },
    { key: "book", label: "Book" },
    { key: "addon", label: "Add-on" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment ops"
        description="Stuck checkouts, cross-product search, and reconciliation history."
      />

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "stuck", label: "Stuck payments" },
            { key: "search", label: "Search" },
            { key: "history", label: "Reconcile history" },
          ] as const
        ).map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              tab === entry.key
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200",
            )}
          >
            {entry.label}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={purchaseReconcile.isPending}
            onClick={() => purchaseReconcile.mutate()}
          >
            {purchaseReconcile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Reconcile purchases
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={coachingReconcile.isPending}
            onClick={() => coachingReconcile.mutate()}
          >
            {coachingReconcile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Reconcile coaching
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {kindOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setKindFilter(opt.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              kindFilter === opt.key
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {tab === "stuck" ? (
        stuckQuery.isError ? (
          <ErrorAlert message="Failed to load stuck payments." />
        ) : stuckQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Shimmer key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : stuckQuery.data?.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            No stuck payments older than {stuckQuery.data?.minAgeMinutes ??
              30}{" "}
            minutes.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stuckQuery.data?.total ?? 0} stuck row(s) · grace{" "}
              {stuckQuery.data?.checkoutGraceMinutes ?? 30} min
            </p>
            {stuckQuery.data?.items.map((row) => (
              <PaymentRowCard key={`${row.kind}-${row.id}`} row={row} />
            ))}
          </div>
        )
      ) : null}

      {tab === "search" ? (
        <div className="space-y-4">
          <DebouncedSearch
            onSearch={setSearchQ}
            placeholder="Email, name, order id, payment id, or purchase id..."
            className="max-w-xl"
          />
          {searchQ.trim().length < 2 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Type at least 2 characters to search across coaching, programs,
              books, and add-ons.
            </p>
          ) : searchQuery.isError ? (
            <ErrorAlert message="Search failed." />
          ) : searchQuery.isLoading ? (
            <Shimmer className="h-24 rounded-xl" />
          ) : searchQuery.data?.items.length === 0 ? (
            <p className="text-sm text-gray-500">No matches for “{searchQ}”.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                {searchQuery.data?.total ?? 0} result(s)
              </p>
              {searchQuery.data?.items.map((row) => (
                <PaymentRowCard key={`${row.kind}-${row.id}`} row={row} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4" />
                Purchase reconcile runs
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {purchaseHistoryQuery.isLoading ? (
                <Shimmer className="m-4 h-16 rounded-lg" />
              ) : (purchaseHistoryQuery.data ?? []).length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No runs yet.</p>
              ) : (
                purchaseHistoryQuery.data?.map((run) => (
                  <div key={run.id} className="px-4 py-3 text-xs">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {run.triggeredBy} · {run.durationMs}ms
                    </p>
                    <p className="text-gray-500">
                      {new Date(run.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4" />
                Coaching reconcile runs
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {coachingHistoryQuery.isLoading ? (
                <Shimmer className="m-4 h-16 rounded-lg" />
              ) : (coachingHistoryQuery.data ?? []).length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No runs yet.</p>
              ) : (
                coachingHistoryQuery.data?.map((run) => (
                  <div key={run.id} className="px-4 py-3 text-xs">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {run.triggeredBy} · {run.durationMs}ms
                    </p>
                    <p className="text-gray-500">
                      {new Date(run.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
