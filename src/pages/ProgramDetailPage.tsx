import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  CreditCard,
  Clock,
  Dumbbell,
  Target,
  Zap,
  Star,
  CalendarDays,
  BarChart3,
  Trash2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  IndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { programService } from "@/services/programService";
import { planService } from "@/services/planService";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const {
    data: program,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["program", id],
    queryFn: () => programService.getById(id!),
    enabled: !!id,
  });

  const { data: plans } = useQuery({
    queryKey: ["plans", id],
    queryFn: () => planService.getForProgram(id!),
    enabled: !!id,
  });

  const toggleMutation = useMutation({
    mutationFn: () =>
      programService.update(id!, { isActive: !program?.isActive }),
    onSuccess: () => {
      toast.success(
        program?.isActive ? "Program deactivated" : "Program activated",
      );
      queryClient.invalidateQueries({ queryKey: ["program", id] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => programService.remove(id!),
    onSuccess: () => {
      toast.success("Program deleted");
      navigate("/programs");
    },
    onError: () => toast.error("Failed to delete program"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !program) {
    return <ErrorAlert message="Failed to load program details." />;
  }

  const badgeLabel = program.badge
    ?.replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Plans summary
  const activePlans = plans?.filter((p) => p.isActive) ?? [];
  const totalPlans = plans?.length ?? 0;
  const prices = plans?.map((p) => p.price).sort((a, b) => a - b) ?? [];
  const priceRange =
    prices.length === 0
      ? "No plans"
      : prices.length === 1
        ? formatPrice(prices[0])
        : `${formatPrice(prices[0])} – ${formatPrice(prices[prices.length - 1])}`;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <button
        onClick={() => navigate("/programs")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Programs
      </button>

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary-600 via-primary-700 to-primary-900 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-medium uppercase tracking-wider">
                {program.category}
              </span>
              {badgeLabel && (
                <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400/90 px-2 py-0.5 text-xs font-bold text-yellow-900">
                  <Star className="h-3 w-3" />
                  {badgeLabel}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">{program.name}</h1>
            {program.tagline && (
              <p className="max-w-lg text-sm text-white/80">
                {program.tagline}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge
              status={program.isActive ? "Active" : "Inactive"}
              className={
                program.isActive
                  ? "bg-green-400/20! text-green-100!"
                  : "bg-red-400/20! text-red-200!"
              }
            />
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 inline-flex rounded-lg bg-primary-50 p-2 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
            <Clock className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {program.duration}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Weeks Duration
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 inline-flex rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
            <Dumbbell className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {program.frequency}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Frequency</p>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 inline-flex rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="mt-1">
            <LevelBadge level={program.level} className="text-sm" />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Difficulty
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 inline-flex rounded-lg bg-green-50 p-2 text-green-600 dark:bg-green-900/20 dark:text-green-400">
            <CalendarDays className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {program.sortOrder}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sort Order</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Link to={`/programs/${program.id}/plans`}>
          <Button variant="secondary">
            <CreditCard className="h-4 w-4" />
            Manage Plans
          </Button>
        </Link>
        <Link to={`/programs/${program.id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4" />
            Edit Program
          </Button>
        </Link>
      </div>

      {/* Plans summary */}
      <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            <CreditCard className="h-4 w-4" />
            Plans Overview
          </h3>
          <Link
            to={`/programs/${program.id}/plans`}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Manage &rarr;
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalPlans}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total Plans
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {activePlans.length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Active Plans
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <IndianRupee className="h-4 w-4 text-gray-400" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {prices.length > 0 ? priceRange : "—"}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Price Range
            </p>
          </div>
        </div>
      </div>

      {/* Content cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Description */}
        <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            About this program
          </h3>
          <p className="leading-relaxed text-gray-700 dark:text-gray-300">
            {program.description}
          </p>
        </div>

        {/* Details sidebar */}
        <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Details
          </h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Slug</dt>
              <dd className="mt-0.5 font-mono text-gray-800 dark:text-gray-200">
                {program.slug}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Category</dt>
              <dd className="mt-0.5 font-medium text-gray-800 dark:text-gray-200">
                {program.category}
              </dd>
            </div>
            {program.createdAt && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-200">
                  {new Date(program.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
            {program.updatedAt && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">
                  Last Updated
                </dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-200">
                  {new Date(program.updatedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Highlights & Goals */}
      {(program.highlights.filter(Boolean).length > 0 ||
        program.goals.filter(Boolean).length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {program.highlights.filter(Boolean).length > 0 && (
            <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <Zap className="h-4 w-4 text-primary-500" />
                Highlights
              </h3>
              <ul className="space-y-3">
                {program.highlights.filter(Boolean).map((h, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-medium text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                      {i + 1}
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {program.goals.filter(Boolean).length > 0 && (
            <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <Target className="h-4 w-4 text-green-500" />
                Goals
              </h3>
              <ul className="space-y-3">
                {program.goals.filter(Boolean).map((g, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
                      {i + 1}
                    </span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Status toggle + Danger zone */}
      <div className="rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* Toggle active status */}
        <div className="flex items-center justify-between border-b px-5 py-4 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Program Status
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {program.isActive
                ? "This program is currently visible to users."
                : "This program is hidden from users."}
            </p>
          </div>
          <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            className="flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {program.isActive ? (
              <>
                <ToggleRight className="h-8 w-8 text-green-500" />
                <span className="text-green-600 dark:text-green-400">
                  Active
                </span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-8 w-8 text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">
                  Inactive
                </span>
              </>
            )}
          </button>
        </div>

        {/* Delete */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Permanently delete this program and all associated data.
            </p>
          </div>
          <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="h-4 w-4" />
            Delete Program
          </Button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={showDeleteModal}
        title="Delete Program"
        message={`Are you sure you want to delete "${program.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
