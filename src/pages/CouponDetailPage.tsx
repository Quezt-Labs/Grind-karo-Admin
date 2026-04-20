import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  X,
  Ticket,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { CouponFormModal } from "@/components/coupons/CouponFormModal";
import { couponService } from "@/services/couponService";
import { planService } from "@/services/planService";
import type { Column } from "@/types/dashboard";
import type { CouponRedemption } from "@/types/coupon";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

type TabId = "whitelist" | "redemptions";

export function CouponDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabId>("whitelist");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  /* ── Coupon fetch ── */
  const {
    data: coupon,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["coupon", id],
    queryFn: () => couponService.getById(id!),
    enabled: !!id,
  });

  /* ── Redemptions ── */
  const { data: redemptions, isLoading: redemptionsLoading } = useQuery({
    queryKey: ["coupon-redemptions", id],
    queryFn: () => couponService.getRedemptions(id!),
    enabled: !!id && tab === "redemptions",
  });

  /* ── Plans list (for linking coaching plans) ── */
  const { data: coachingPlans } = useQuery({
    queryKey: ["plans-all"],
    queryFn: () => planService.getAll(),
    enabled: coupon?.scope === "SPECIFIC",
  });

  /* ── Programs list (for linking programs) ── */
  // Reuse program service if it exists; otherwise we'll display IDs
  const { data: programs } = useQuery({
    queryKey: ["programs-all-list"],
    queryFn: async () => {
      const mod = await import("@/services/programService");
      return mod.programService.getAll();
    },
    enabled: coupon?.scope === "SPECIFIC",
  });

  /* ── Mutations ── */
  const deleteMut = useMutation({
    mutationFn: () => couponService.remove(id!),
    onSuccess: () => {
      toast.success("Coupon deactivated");
      navigate("/coupons", { replace: true });
    },
  });

  const linkProgram = useMutation({
    mutationFn: (programId: string) =>
      couponService.linkProgram(id!, programId),
    onSuccess: () => {
      toast.success("Program linked");
      queryClient.invalidateQueries({ queryKey: ["coupon", id] });
    },
  });

  const unlinkProgram = useMutation({
    mutationFn: (programId: string) =>
      couponService.unlinkProgram(id!, programId),
    onSuccess: () => {
      toast.success("Program unlinked");
      queryClient.invalidateQueries({ queryKey: ["coupon", id] });
    },
  });

  const linkPlan = useMutation({
    mutationFn: (planId: string) => couponService.linkCoachingPlan(id!, planId),
    onSuccess: () => {
      toast.success("Coaching plan linked");
      queryClient.invalidateQueries({ queryKey: ["coupon", id] });
    },
  });

  const unlinkPlan = useMutation({
    mutationFn: (planId: string) =>
      couponService.unlinkCoachingPlan(id!, planId),
    onSuccess: () => {
      toast.success("Coaching plan unlinked");
      queryClient.invalidateQueries({ queryKey: ["coupon", id] });
    },
  });

  /* ── Loading / Error ── */
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

  /* ── Detail Info Card ── */
  const discountLabel =
    coupon.discountType === "PERCENT"
      ? `${coupon.discountValue}%${coupon.maxDiscount ? ` (max ${formatINR(coupon.maxDiscount)})` : ""}`
      : formatINR(coupon.discountValue);

  const fields: { label: string; value: string }[] = [
    { label: "Code", value: coupon.code },
    { label: "Discount", value: discountLabel },
    { label: "Scope", value: coupon.scope.replace("_", " ") },
    {
      label: "Apply to Add-ons",
      value: coupon.applyToAddons ? "Yes" : "No",
    },
    {
      label: "Min Order",
      value: coupon.minOrderAmount ? formatINR(coupon.minOrderAmount) : "—",
    },
    {
      label: "Max Redemptions",
      value: coupon.maxRedemptions?.toString() ?? "Unlimited",
    },
    {
      label: "Max / User",
      value: coupon.maxRedemptionsPerUser?.toString() ?? "Unlimited",
    },
    { label: "Total Used", value: coupon.totalRedemptions.toString() },
    {
      label: "Window",
      value:
        coupon.startsAt && coupon.expiresAt
          ? `${new Date(coupon.startsAt).toLocaleString()} – ${new Date(coupon.expiresAt).toLocaleString()}`
          : coupon.expiresAt
            ? `Until ${new Date(coupon.expiresAt).toLocaleString()}`
            : coupon.startsAt
              ? `From ${new Date(coupon.startsAt).toLocaleString()}`
              : "Always",
    },
    {
      label: "Created",
      value: new Date(coupon.createdAt).toLocaleString(),
    },
  ];

  /* ── Redemptions table ── */
  const redemptionColumns: Column<CouponRedemption>[] = [
    {
      key: "userId",
      header: "User",
      sortable: true,
      render: (v) => (
        <button
          className="text-primary-600 hover:underline dark:text-primary-400"
          onClick={() => navigate(`/users/${v}`)}
        >
          {(v as string).slice(0, 8)}…
        </button>
      ),
    },
    {
      key: "discountAmount",
      header: "Discount (₹)",
      sortable: true,
      render: (v) => formatINR(v as number),
    },
    {
      key: "programPurchaseId",
      header: "Purchase / Sub",
      render: (_, row) =>
        row.programPurchaseId
          ? `Purchase ${row.programPurchaseId.slice(0, 8)}…`
          : row.coachingSubscriptionId
            ? `Sub ${row.coachingSubscriptionId.slice(0, 8)}…`
            : "—",
    },
    {
      key: "createdAt",
      header: "Redeemed At",
      sortable: true,
      render: (v) => new Date(v as string).toLocaleString(),
    },
  ];

  /* ── Whitelist helpers ── */
  const linkedPrograms = programs?.filter((p) =>
    coupon.programIds.includes(p.id),
  );
  const availablePrograms = programs?.filter(
    (p) => !coupon.programIds.includes(p.id),
  );
  const linkedPlans = coachingPlans?.filter((p) =>
    coupon.coachingPlanIds.includes(p.id),
  );
  const availablePlans = coachingPlans?.filter(
    (p) => !coupon.coachingPlanIds.includes(p.id),
  );

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

      {/* Info grid */}
      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.label}>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {f.label}
            </span>
            <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
              {f.value}
            </p>
          </div>
        ))}
      </div>

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

      {/* Whitelist tab */}
      {tab === "whitelist" && (
        <div className="space-y-6">
          {coupon.scope !== "SPECIFIC" ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 dark:border-gray-600 dark:bg-gray-800/50">
              <ShieldCheck className="h-6 w-6 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Whitelist management is only available for coupons with
                <span className="mx-1 font-medium">SPECIFIC</span> scope. This
                coupon applies to{" "}
                <span className="font-medium">
                  {coupon.scope.replace("_", " ").toLowerCase()}
                </span>
                .
              </p>
            </div>
          ) : (
            <>
              {/* Programs whitelist */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Linked Programs ({coupon.programIds.length})
                </h3>
                {linkedPrograms && linkedPrograms.length > 0 ? (
                  <div className="space-y-2">
                    {linkedPrograms.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <span className="text-sm text-gray-800 dark:text-gray-200">
                          {p.name}
                        </span>
                        <button
                          onClick={() => unlinkProgram.mutate(p.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No programs linked.</p>
                )}
                {availablePrograms && availablePrograms.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {availablePrograms.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => linkProgram.mutate(p.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:border-primary-400 hover:text-primary-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400"
                      >
                        <Plus className="h-3 w-3" />
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Coaching plans whitelist */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Linked Coaching Plans ({coupon.coachingPlanIds.length})
                </h3>
                {linkedPlans && linkedPlans.length > 0 ? (
                  <div className="space-y-2">
                    {linkedPlans.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <span className="text-sm text-gray-800 dark:text-gray-200">
                          {p.name}
                        </span>
                        <button
                          onClick={() => unlinkPlan.mutate(p.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    No coaching plans linked.
                  </p>
                )}
                {availablePlans && availablePlans.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {availablePlans.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => linkPlan.mutate(p.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:border-primary-400 hover:text-primary-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400"
                      >
                        <Plus className="h-3 w-3" />
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* Redemptions tab */}
      {tab === "redemptions" && (
        <DataTable
          data={redemptions ?? []}
          columns={redemptionColumns}
          isLoading={redemptionsLoading}
        />
      )}

      {/* Edit modal */}
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

      {/* Delete confirm */}
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
