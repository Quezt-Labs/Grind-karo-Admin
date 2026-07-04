import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  X as XIcon,
  Users,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { billingPeriodWeeks } from "@/utils/coachingBillingPeriod";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/ShadTable";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Spinner } from "@/components/ui/Spinner";
import { planService } from "@/services/planService";
import { addonService } from "@/services/addonService";
import { LinkAddonModal } from "@/components/coaching/LinkAddonModal";
import type { Column } from "@/types/dashboard";
import type { CoachingAddon, PublicAddon } from "@/types/program";
import type { PlanUserStatusFilter } from "@/types/user";
import { requiresPersonalCoachingProgram } from "@/utils/coachingCapabilities";
import { useIsAdmin } from "@/hooks/useRole";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
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

const PAGE_SIZE = 50;

const STATUS_TABS: { label: string; value: PlanUserStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Past", value: "past" },
];

export function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<PublicAddon | null>(null);
  const [subscriberStatus, setSubscriberStatus] =
    useState<PlanUserStatusFilter>("all");
  const [subscriberOffset, setSubscriberOffset] = useState(0);

  const {
    data: plan,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["coaching-plan", id],
    queryFn: () => planService.getById(id!),
    enabled: !!id,
  });

  const { data: subscribersData, isLoading: subscribersLoading } = useQuery({
    queryKey: ["plan-users", id, subscriberStatus, subscriberOffset, isAdmin],
    queryFn: () =>
      planService.getUsersByPlan(
        id!,
        {
          status: subscriberStatus,
          limit: PAGE_SIZE,
          offset: subscriberOffset,
        },
        { coachScoped: !isAdmin },
      ),
    enabled: !!id,
  });

  const { data: allAddons } = useQuery({
    queryKey: ["coaching-addons"],
    queryFn: addonService.getAll,
    enabled: !!id && isAdmin,
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
      price: formatINR(a.price),
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

  const personalCoachingPlan = requiresPersonalCoachingProgram(plan.slug);

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
            {plan.slug} · {formatINR(plan.price)} ·{" "}
            {billingPeriodWeeks(plan.validityMonths)} weeks
          </p>
        </div>
        <StatusBadge status={plan.isActive ? "Active" : "Inactive"} />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Price" value={formatINR(plan.price)} />
        <InfoCard
          label="Validity"
          value={`${billingPeriodWeeks(plan.validityMonths)} weeks (${plan.validityMonths} × 4-week blocks)`}
        />
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

      {/* Linked Add-ons (admin catalog management) */}
      {isAdmin && (
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
      )}

      {/* Subscribers */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isAdmin ? "Subscribers" : "Your athletes on this plan"}
          </h2>
          {subscribersData && (
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {subscribersData.total}
            </span>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setSubscriberStatus(tab.value);
                setSubscriberOffset(0);
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                subscriberStatus === tab.value
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {subscribersLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : !subscribersData || (subscribersData.items ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-600 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No subscribers found for this filter.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <Table className="min-w-full text-sm">
                <TableHeader className="bg-gray-50 dark:bg-gray-800/60">
                  <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                    <TableHead className="h-auto px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      User
                    </TableHead>
                    <TableHead className="h-auto px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Status
                    </TableHead>
                    <TableHead className="h-auto px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Amount
                    </TableHead>
                    <TableHead className="h-auto px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Start Date
                    </TableHead>
                    <TableHead className="h-auto px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Expires
                    </TableHead>
                    {personalCoachingPlan && (
                      <TableHead className="h-auto px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Program
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(subscribersData.items ?? []).map(
                    ({ user, subscription }) => (
                      <TableRow
                        key={subscription.id}
                        onClick={() =>
                          navigate(
                            isAdmin
                              ? `/users/${user.id}?subscriptionId=${subscription.id}`
                              : `/coach/athletes/${user.id}`,
                          )
                        }
                        className="cursor-pointer"
                      >
                        <TableCell className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.name || "—"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <SubscriptionStatusBadge
                            status={subscription.status}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {formatINR(subscription.totalAmount)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {new Date(subscription.startDate).toLocaleDateString(
                            "en-IN",
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {new Date(subscription.expiresAt).toLocaleDateString(
                            "en-IN",
                          )}
                        </TableCell>
                        {personalCoachingPlan && (
                          <TableCell className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                  `/coaching/${user.id}/editor?subscriptionId=${subscription.id}`,
                                );
                              }}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Build program
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {subscribersData.total > PAGE_SIZE && (
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>
                  Showing {subscriberOffset + 1}–
                  {Math.min(
                    subscriberOffset + PAGE_SIZE,
                    subscribersData.total,
                  )}{" "}
                  of {subscribersData.total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSubscriberOffset((o) => Math.max(0, o - PAGE_SIZE))
                    }
                    disabled={subscriberOffset === 0}
                    className="rounded-lg border p-1.5 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSubscriberOffset((o) => o + PAGE_SIZE)}
                    disabled={
                      subscriberOffset + PAGE_SIZE >= subscribersData.total
                    }
                    className="rounded-lg border p-1.5 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isAdmin && showLinkModal && (
        <LinkAddonModal
          availableAddons={unlinkableAddons}
          isLoading={linkMutation.isPending}
          onLink={(addonId, priceOverride) =>
            linkMutation.mutate({ addonId, priceOverride })
          }
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {isAdmin && (
        <ConfirmModal
          open={!!unlinkTarget}
          title="Unlink Add-on"
          message={`Remove "${unlinkTarget?.name}" from this plan?`}
          confirmLabel="Unlink"
          variant="danger"
          isLoading={unlinkMutation.isPending}
          onConfirm={() =>
            unlinkTarget && unlinkMutation.mutate(unlinkTarget.id)
          }
          onCancel={() => setUnlinkTarget(null)}
        />
      )}
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

function SubscriptionStatusBadge({
  status,
}: {
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
}) {
  const styles = {
    ACTIVE:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    EXPIRED:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
