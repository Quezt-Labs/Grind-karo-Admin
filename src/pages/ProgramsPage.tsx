import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Star,
  Clock,
  Zap,
  ArrowUpDown,
  LayoutList,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { ProgramFormModal } from "@/components/programs/ProgramFormModal";
import { programService } from "@/services/programService";
import type { Program } from "@/types/programs";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

type StatusFilter = "all" | "active" | "inactive";

export function ProgramsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [editTarget, setEditTarget] = useState<Program | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: programs,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["programs"],
    queryFn: programService.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => programService.remove(id),
    onSuccess: () => {
      toast.success("Program deleted");
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Failed to delete program");
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const statusCounts = useMemo(() => {
    if (!programs) return { all: 0, active: 0, inactive: 0 };
    const retail = programs.filter((p) => p.kind !== "COACHING");
    return {
      all: retail.length,
      active: retail.filter((p) => p.isActive).length,
      inactive: retail.filter((p) => !p.isActive).length,
    };
  }, [programs]);

  const filtered = useMemo(() => {
    if (!programs) return [];
    let list = programs.filter((p) => p.kind !== "COACHING");
    if (statusFilter === "active") list = list.filter((p) => p.isActive);
    else if (statusFilter === "inactive")
      list = list.filter((p) => !p.isActive);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.slug.toLowerCase().includes(term),
      );
    }
    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  }, [programs, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Programs"
          description="Manage training programs and content"
        />
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Create Program
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(
            [
              { key: "all", label: "All", count: statusCounts.all },
              { key: "active", label: "Active", count: statusCounts.active },
              {
                key: "inactive",
                label: "Inactive",
                count: statusCounts.inactive,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === tab.key
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium",
                  statusFilter === tab.key
                    ? "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                    : "bg-gray-200/70 text-gray-500 dark:bg-gray-600/50 dark:text-gray-400",
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search programs..."
          className="w-full sm:w-72"
        />
      </div>

      {/* Error */}
      {isError && <ErrorAlert message="Failed to load programs." />}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <BookOpen className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No programs yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Create a training program to start authoring content.
          </p>
          <Button className="mt-5" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Create Your First Program
          </Button>
        </div>
      )}

      {/* Card grid */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              onEdit={() => setEditTarget(program)}
              onDelete={() => setDeleteTarget(program)}
              onOpen={() => navigate(`/programs/${program.id}`)}
              onBuild={() => navigate(`/programs/${program.slug}/editor`)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Program"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will deactivate the program.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {(showCreateModal || editTarget) && (
        <ProgramFormModal
          program={editTarget}
          onClose={() => {
            setShowCreateModal(false);
            setEditTarget(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["programs"] });
            setShowCreateModal(false);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}

/* ─── Program Card ────────────────────────────────────────────────────── */

interface ProgramCardProps {
  program: Program;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onBuild: () => void;
}

function ProgramCard({
  program,
  onEdit,
  onDelete,
  onOpen,
  onBuild,
}: ProgramCardProps) {
  const hasDiscount =
    program.salePrice !== null && program.salePrice < program.regularPrice;
  const displayPrice = program.salePrice ?? program.regularPrice;
  const rating = program.averageRating ?? 0;
  const reviews = program.totalReviews ?? 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md dark:bg-gray-800",
        program.isActive
          ? "border-gray-200 dark:border-gray-700"
          : "border-dashed border-gray-300 opacity-70 dark:border-gray-600",
      )}
    >
      {/* Cover image */}
      <div
        className="relative h-36 cursor-pointer overflow-hidden bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600"
        onClick={onOpen}
      >
        {program.coverImageUrl ? (
          <img
            src={program.coverImageUrl}
            alt={program.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-10 w-10 text-gray-300 dark:text-gray-500" />
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {program.badge && (
            <span className="rounded-full bg-primary-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow">
              {program.badge}
            </span>
          )}
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow",
              program.isActive
                ? "bg-green-500 text-white"
                : "bg-gray-500 text-white",
            )}
          >
            {program.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Sort order chip */}
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
          <ArrowUpDown className="h-3 w-3" />
          {program.displayOrder}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Name + tagline */}
        <div className="cursor-pointer" onClick={onOpen}>
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
            {program.name}
          </h3>
          {program.tagline && (
            <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
              {program.tagline}
            </p>
          )}
        </div>

        {/* Chips row */}
        <div className="flex flex-wrap gap-1.5">
          {program.liftingFrequency && (
            <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
              <Zap className="h-3 w-3" />
              {program.liftingFrequency}
            </span>
          )}
          {program.programLengthWeeks && (
            <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
              <Clock className="h-3 w-3" />
              {program.programLengthWeeks} weeks
            </span>
          )}
        </div>

        {/* Price + rating */}
        <div className="mt-auto flex items-end justify-between">
          <div>
            <span className="text-base font-bold text-gray-900 dark:text-white">
              {formatINR(displayPrice)}
            </span>
            {hasDiscount && (
              <span className="ml-1.5 text-xs text-gray-400 line-through">
                {formatINR(program.regularPrice)}
              </span>
            )}
          </div>
          {reviews > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {rating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-400">({reviews})</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-1 border-t border-gray-100 px-3 py-2 dark:border-gray-700">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 text-xs"
          onClick={onOpen}
        >
          View Details
        </Button>
        <Button
          size="sm"
          variant="primary"
          className="flex-1 text-xs"
          onClick={onBuild}
        >
          <LayoutList className="h-3.5 w-3.5" />
          Build
        </Button>
        <button
          onClick={onEdit}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Edit metadata"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          title="Delete program"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
