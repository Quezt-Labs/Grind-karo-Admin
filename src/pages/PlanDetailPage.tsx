import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Check, X as XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Spinner } from "@/components/ui/Spinner";
import { planService } from "@/services/planService";
import { addonService } from "@/services/addonService";
import { LinkAddonModal } from "@/components/coaching/LinkAddonModal";
import type { Column } from "@/types/dashboard";
import type { CoachingAddon, PublicAddon } from "@/types/program";

function formatPrice(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

type AddonRow = {
  id: string;
  name: string;
  slug: string;
  price: string;
};

const addonColumns: Column<AddonRow>[] = [
  { key: "name", header: "Add-on", sortable: true },
  { key: "slug", header: "Slug", sortable: false },
  { key: "price", header: "Effective Price", sortable: true },
];

export function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<PublicAddon | null>(null);

  const {
    data: plan,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["coaching-plan", id],
    queryFn: () => planService.getById(id!),
    enabled: !!id,
  });

  const { data: allAddons } = useQuery({
    queryKey: ["coaching-addons"],
    queryFn: addonService.getAll,
  });

  const linkedAddonIds = useMemo(
    () => new Set(plan?.availableAddons.map((a) => a.id) ?? []),
    [plan],
  );

  const unlinkableAddons: CoachingAddon[] = useMemo(() => {
    if (!allAddons) return [];
    return allAddons.filter((a) => a.isActive && !linkedAddonIds.has(a.id));
  }, [allAddons, linkedAddonIds]);

  const linkMutation = useMutation({
    mutationFn: ({
      addonId,
      priceOverride,
    }: {
      addonId: string;
      priceOverride: number | null;
    }) => planService.linkAddon(id!, { addonId, priceOverride }),
    onSuccess: () => {
      toast.success("Add-on linked");
      queryClient.invalidateQueries({ queryKey: ["coaching-plan", id] });
      setShowLinkModal(false);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (addonId: string) => planService.unlinkAddon(id!, addonId),
    onSuccess: () => {
      toast.success("Add-on unlinked");
      queryClient.invalidateQueries({ queryKey: ["coaching-plan", id] });
      setUnlinkTarget(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (isError || !plan) {
    return <ErrorAlert message="Failed to load plan details." />;
  }

  const addonRows: AddonRow[] =
    plan.availableAddons?.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      price: formatPrice(a.price),
    })) ?? [];

  const addonMap = new Map(plan.availableAddons?.map((a) => [a.id, a]) ?? []);

  const actionsColumn = {
    key: "id" as keyof AddonRow & string,
    header: "Actions",
    render: (value: AddonRow[keyof AddonRow]) => {
      const addon = addonMap.get(value as string);
      if (!addon) return null;
      return (
        <button
          onClick={() => setUnlinkTarget(addon)}
          className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          title="Unlink"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      );
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/plans")}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {plan.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {plan.slug} · {formatPrice(plan.price)} · {plan.validityMonths}{" "}
            months
          </p>
        </div>
        <StatusBadge status={plan.isActive ? "Active" : "Inactive"} />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Price" value={formatPrice(plan.price)} />
        <InfoCard label="Validity" value={`${plan.validityMonths} months`} />
        <InfoCard
          label="Reviews"
          value={
            plan.totalReviews
              ? `${plan.averageRating.toFixed(1)}★ (${plan.totalReviews})`
              : "No reviews"
          }
        />
        <InfoCard label="Badge" value={plan.badge || "—"} />
      </div>

      {/* Features */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Included Features
          </h3>
          <ul className="space-y-2">
            {plan.includedFeatures.length ? (
              plan.includedFeatures.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  {f}
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-400">None specified</li>
            )}
          </ul>
        </div>
        <div className="rounded-xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Excluded Features
          </h3>
          <ul className="space-y-2">
            {plan.excludedFeatures.length ? (
              plan.excludedFeatures.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <XIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  {f}
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-400">None specified</li>
            )}
          </ul>
        </div>
      </div>

      {/* Linked Add-ons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Linked Add-ons
          </h2>
          <Button
            size="sm"
            onClick={() => setShowLinkModal(true)}
            disabled={unlinkableAddons.length === 0}
          >
            <Plus className="h-4 w-4" />
            Link Add-on
          </Button>
        </div>

        {addonRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-600 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No add-ons linked to this plan yet.
            </p>
          </div>
        ) : (
          <DataTable
            data={addonRows}
            columns={[...addonColumns, actionsColumn]}
            isLoading={false}
          />
        )}
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <LinkAddonModal
          availableAddons={unlinkableAddons}
          isLoading={linkMutation.isPending}
          onLink={(addonId, priceOverride) =>
            linkMutation.mutate({ addonId, priceOverride })
          }
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {/* Unlink Confirm */}
      <ConfirmModal
        open={!!unlinkTarget}
        title="Unlink Add-on"
        message={`Remove "${unlinkTarget?.name}" from this plan?`}
        confirmLabel="Unlink"
        variant="danger"
        isLoading={unlinkMutation.isPending}
        onConfirm={() => unlinkTarget && unlinkMutation.mutate(unlinkTarget.id)}
        onCancel={() => setUnlinkTarget(null)}
      />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
