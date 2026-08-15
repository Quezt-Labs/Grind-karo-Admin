import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { CouponFormModal } from "@/components/coupons/CouponFormModal";
import { couponService } from "@/services/couponService";
import { CouponsTable } from "./coupons/CouponsTable";
import { formatINR } from "./coupons/couponsConstants";
import type { Coupon, CouponScope } from "@/types/coupon";
import type { ActiveFilter, ScopeFilter } from "./coupons/couponsConstants";

export function CouponsPage() {
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
    onError: () => toast.error("Failed to deactivate coupon"),
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

  const tableData = useMemo(() => {
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

  const handleEdit = useCallback((coupon: Coupon) => {
    setEditTarget(coupon);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((coupon: Coupon) => {
    setDeleteTarget(coupon);
  }, []);

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

          <Select
            value={scopeFilter || "__all__"}
            onValueChange={(v) =>
              setScopeFilter((v === "__all__" ? "" : v) as ScopeFilter)
            }
          >
            <SelectTrigger className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs h-8 w-36 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <SelectValue placeholder="All scopes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All scopes</SelectItem>
              <SelectItem value="ALL">All products</SelectItem>
              <SelectItem value="PROGRAMS">Programs</SelectItem>
              <SelectItem value="COACHING_PLANS">Coaching plans</SelectItem>
              <SelectItem value="SPECIFIC">Specific</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search by code..."
          className="w-full sm:w-64"
        />
      </div>

      <CouponsTable
        rows={tableData}
        couponMap={couponMap}
        isLoading={isLoading}
        isError={isError}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

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
