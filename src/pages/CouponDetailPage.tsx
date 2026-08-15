import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, Ticket } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { CouponFormModal } from "@/components/coupons/CouponFormModal";
import { couponService } from "@/services/couponService";
import { CouponInfoGrid } from "./couponDetail/CouponInfoGrid";
import { WhitelistTab } from "./couponDetail/WhitelistTab";
import { RedemptionsTab } from "./couponDetail/RedemptionsTab";
import type { TabId } from "./couponDetail/couponDetailHelpers";

export function CouponDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabId>("whitelist");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    data: coupon,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["coupon", id],
    queryFn: () => couponService.getById(id!),
    enabled: !!id,
  });

  const deleteMut = useMutation({
    mutationFn: () => couponService.remove(id!),
    onSuccess: () => {
      toast.success("Coupon deactivated");
      navigate("/coupons", { replace: true });
    },
    onError: () => toast.error("Failed to deactivate coupon"),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !coupon) {
    return <ErrorAlert message="Failed to load coupon." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate("/coupons")}
          className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
            <Ticket className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {coupon.code}
            </h1>
            {coupon.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {coupon.description}
              </p>
            )}
          </div>
          <StatusBadge status={coupon.isActive ? "active" : "inactive"} />
        </div>

        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1 h-4 w-4" />
            Edit
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1 h-4 w-4" />
            Deactivate
          </Button>
        </div>
      </div>

      <CouponInfoGrid coupon={coupon} />

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        {(["whitelist", "redemptions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "mr-4 border-b-2 pb-2 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "whitelist" && <WhitelistTab coupon={coupon} />}
      {tab === "redemptions" && <RedemptionsTab couponId={coupon.id} />}

      {editOpen && (
        <CouponFormModal
          coupon={coupon}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["coupon", id] });
            setEditOpen(false);
          }}
        />
      )}

      <ConfirmModal
        open={deleteOpen}
        title="Deactivate Coupon"
        message={`Deactivate coupon "${coupon.code}"? Existing redemptions are preserved.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
