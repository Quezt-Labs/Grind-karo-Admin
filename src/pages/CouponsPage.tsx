import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2, Ticket } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { CouponFormModal } from "@/components/coupons/CouponFormModal";
import { couponService } from "@/services/couponService";
import type { Column } from "@/types/dashboard";
import type { Coupon, CouponScope } from "@/types/coupon";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

const SCOPE_COLORS: Record<string, string> = {
  ALL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PROGRAMS:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  COACHING_PLANS:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  SPECIFIC:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

type CouponRow = {
  id: string;
  code: string;
  discount: string;
  scope: string;
  usage: string;
  window: string;
  status: string;
};

const couponColumns: Column<CouponRow>[] = [
  { key: "code", header: "Code", sortable: true },
  { key: "discount", header: "Discount", sortable: true },
  {
    key: "scope",
    header: "Scope",
    sortable: true,
    render: (value) => (
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
          SCOPE_COLORS[value as string] ?? "",
        )}
      >
        {(value as string).replace("_", " ")}
      </span>
    ),
  },
  { key: "usage", header: "Usage", sortable: true },
  { key: "window", header: "Window", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
];

type ActiveFilter = "" | "true" | "false";
type ScopeFilter = "" | CouponScope;

export function CouponsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Coupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  const {
    data: coupons,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["coupons", searchTerm, activeFilter, scopeFilter],
    queryFn: () =>
      couponService.getAll({
        q: searchTerm || undefined,
        isActive:
          activeFilter === "true"
            ? true
            : activeFilter === "false"
              ? false
              : undefined,
        scope: (scopeFilter as CouponScope) || undefined,
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => couponService.remove(id),
    onSuccess: () => {
      toast.success("Coupon deactivated");
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      setDeleteTarget(null);
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  function handleFormSuccess() {
    queryClient.invalidateQueries({ queryKey: ["coupons"] });
    setFormOpen(false);
    setEditTarget(null);
  }

  const couponMap = useMemo(() => {
    const map = new Map<string, Coupon>();
    coupons?.forEach((c) => map.set(c.id, c));
    return map;
  }, [coupons]);

  const tableData: CouponRow[] = useMemo(() => {
    if (!coupons) return [];
    return coupons.map((c) => {
      const discountStr =
        c.discountType === "PERCENT"
          ? `${c.discountValue}%${c.maxDiscount ? ` (max ${formatINR(c.maxDiscount)})` : ""}`
          : formatINR(c.discountValue);
      const usageStr = c.maxRedemptions
        ? `${c.totalRedemptions} / ${c.maxRedemptions}`
        : `${c.totalRedemptions}`;
      const now = new Date();
      let windowStr = "Always";
      if (c.startsAt && c.expiresAt) {
        windowStr = `${new Date(c.startsAt).toLocaleDateString()} – ${new Date(c.expiresAt).toLocaleDateString()}`;
      } else if (c.expiresAt) {
        const exp = new Date(c.expiresAt);
        windowStr =
          exp < now
            ? `Expired ${exp.toLocaleDateString()}`
            : `Until ${exp.toLocaleDateString()}`;
      } else if (c.startsAt) {
        windowStr = `From ${new Date(c.startsAt).toLocaleDateString()}`;
      }
      return {
        id: c.id,
        code: c.code,
        discount: discountStr,
        scope: c.scope,
        usage: usageStr,
        window: windowStr,
        status: c.isActive ? "active" : "inactive",
      };
    });
  }, [coupons]);

  const actionsColumn: Column<CouponRow> = {
    key: "id",
    header: "Actions",
    render: (_value, row) => {
      const coupon = couponMap.get(row.id);
      if (!coupon) return null;
      return (
        <div className="flex gap-1">
          <button
            onClick={() => navigate(`/coupons/${coupon.id}`)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            title="View details & redemptions"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setEditTarget(coupon);
              setFormOpen(true);
            }}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(coupon)}
            className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            title="Deactivate"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Coupons" description="Manage discount codes">
        <Button
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create Coupon
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["", "true", "false"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveFilter(v)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === v
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300",
              )}
            >
              {v === "" ? "All" : v === "true" ? "Active" : "Inactive"}
            </button>
          ))}

          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            <option value="">All scopes</option>
            <option value="ALL">All products</option>
            <option value="PROGRAMS">Programs</option>
            <option value="COACHING_PLANS">Coaching plans</option>
            <option value="SPECIFIC">Specific</option>
          </select>
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search by code..."
          className="w-full sm:w-64"
        />
      </div>

      {isError ? (
        <ErrorAlert message="Failed to load coupons." />
      ) : !isLoading && tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <Ticket className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No coupons yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Create your first discount code to get started.
          </p>
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={[...couponColumns, actionsColumn]}
          isLoading={isLoading}
        />
      )}

      {formOpen && (
        <CouponFormModal
          coupon={editTarget}
          onClose={() => {
            setFormOpen(false);
            setEditTarget(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Deactivate Coupon"
        message={`Deactivate coupon "${deleteTarget?.code}"? It will no longer be usable at checkout. Historical redemptions are preserved.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
