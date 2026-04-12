import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { programService } from "@/services/programService";

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: program,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["program", id],
    queryFn: () => programService.getById(id!),
    enabled: !!id,
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

      {/* Content cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Description — full width on mobile, spans 2 cols on lg */}
        <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            About this program
          </h3>
          <p className="leading-relaxed text-gray-700 dark:text-gray-300">
            {program.description}
          </p>
        </div>

        {/* Slug + meta sidebar */}
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
    </div>
  );
}
