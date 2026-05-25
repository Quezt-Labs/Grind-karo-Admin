import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  CreditCard,
  ShoppingBag,
  Calendar,
  Mail,
  User,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Sheet,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Link2,
  Video,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { userService } from "@/services/userService";
import { UserPushPanel } from "@/components/push/UserPushPanel";
import { UserWorkoutLogsPanel } from "@/components/users/UserWorkoutLogsPanel";
import { cn } from "@/utils/cn";
import type { Purchase, UserProgressEntry } from "@/types/user";

const PROGRESS_PAGE_SIZE = 12;
const PHOTO_LABELS = ["Front", "Side", "Back"] as const;

function progressEntryImages(entry: UserProgressEntry): string[] {
  if (entry.imageUrls?.length) return entry.imageUrls;
  if (entry.imageUrl) return [entry.imageUrl];
  return [];
}

function progressEntryHasMedia(entry: UserProgressEntry): boolean {
  return progressEntryImages(entry).length > 0 || !!entry.videoUrl;
}

const PROGRESS_MEDIA_REMOVED =
  "Media removed after 30 days — weight and notes are kept.";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [progressOffset, setProgressOffset] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-user-purchases", id],
    queryFn: () => userService.getPurchases(id!),
    enabled: !!id,
  });

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ["admin-user-progress", id, progressOffset],
    queryFn: () =>
      userService.getProgress(id!, {
        limit: PROGRESS_PAGE_SIZE,
        offset: progressOffset,
      }),
    enabled: !!id,
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const coaching = data.purchases.filter(
      (p) => p.kind === "coaching_subscription",
    );
    const programs = data.purchases.filter(
      (p) => p.kind === "program_purchase",
    );
    const totalSpent = data.purchases.reduce((sum, p) => {
      if (p.kind === "coaching_subscription") return sum + p.totalAmount;
      if (p.kind === "program_purchase" && p.status === "PAID")
        return sum + p.amount;
      return sum;
    }, 0);
    return {
      coachingCount: coaching.length,
      programCount: programs.length,
      totalSpent,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorAlert message="Failed to load user details." />;
  }

  const { user, purchases } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/users")}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user.name || "Unnamed User"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {user.role}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Joined{" "}
              {formatDate(user.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<CreditCard className="h-5 w-5" />}
            label="Coaching Subscriptions"
            value={String(stats.coachingCount)}
          />
          <StatCard
            icon={<ShoppingBag className="h-5 w-5" />}
            label="Program Purchases"
            value={String(stats.programCount)}
          />
          <StatCard
            icon={<CreditCard className="h-5 w-5" />}
            label="Total Spent"
            value={formatINR(stats.totalSpent)}
          />
        </div>
      )}

      <UserPushPanel userId={user.id} />

      {/* Google Sheets Provisioning */}
      <ProvisionSheetSection
        userId={user.id}
        userEmail={user.email}
        currentSpreadsheetId={user.spreadsheetId}
      />

      <WorkoutSetVideosSection
        userId={user.id}
        enabled={user.workoutSetVideosEnabled !== false}
      />

      <UserWorkoutLogsPanel userId={user.id} purchases={purchases} />

      {/* Progress check-ins */}
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ImageIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Progress check-ins
          </h2>
          {progressData && (
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {progressData.total}
            </span>
          )}
          <span className="w-full text-xs text-gray-500 dark:text-gray-400 sm:w-auto sm:ml-auto">
            Photos/videos auto-deleted after 30 days
          </span>
        </div>

        {progressLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (progressData?.items ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-gray-800">
            <ImageIcon className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No weekly check-ins yet (3 photos + video).
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {(progressData?.items ?? []).map((entry) => {
                const images = progressEntryImages(entry);
                const hasMedia = progressEntryHasMedia(entry);
                return (
                  <div
                    key={entry.id}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDateTime(entry.createdAt)}
                      </p>
                      {entry.weight && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {entry.weight} kg
                        </span>
                      )}
                    </div>
                    {hasMedia ? (
                      <>
                        <div className="grid grid-cols-3 gap-0.5 bg-gray-100 dark:bg-gray-900">
                          {images.map((url, i) => (
                            <a
                              key={`${entry.id}-${i}`}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative aspect-3/4 overflow-hidden bg-gray-200 dark:bg-gray-800"
                            >
                              <img
                                src={url}
                                alt={`${PHOTO_LABELS[i] ?? "Photo"} ${formatDate(entry.createdAt)}`}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                              <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                {PHOTO_LABELS[i] ?? i + 1}
                              </span>
                            </a>
                          ))}
                        </div>
                        {entry.videoUrl && (
                          <div className="border-t border-gray-100 bg-black dark:border-gray-700">
                            <video
                              src={entry.videoUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="max-h-72 w-full object-contain"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs italic text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                        {PROGRESS_MEDIA_REMOVED}
                      </div>
                    )}
                    {entry.notes && (
                      <p className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {(progressData?.total ?? 0) > PROGRESS_PAGE_SIZE && (
              <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>
                  Showing {progressOffset + 1}–
                  {Math.min(
                    progressOffset + PROGRESS_PAGE_SIZE,
                    progressData?.total ?? 0,
                  )}{" "}
                  of {progressData?.total ?? 0}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setProgressOffset((o) =>
                        Math.max(0, o - PROGRESS_PAGE_SIZE),
                      )
                    }
                    disabled={progressOffset === 0}
                    className="rounded-lg border p-1.5 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setProgressOffset((o) => o + PROGRESS_PAGE_SIZE)
                    }
                    disabled={
                      progressOffset + PROGRESS_PAGE_SIZE >=
                      (progressData?.total ?? 0)
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

      {/* Purchase Timeline */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Purchase History
        </h2>

        {purchases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No purchases yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <PurchaseCard key={purchase.id} purchase={purchase} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="rounded-lg bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function PurchaseCard({ purchase }: { purchase: Purchase }) {
  const isCoaching = purchase.kind === "coaching_subscription";

  return (
    <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 rounded-lg p-2",
              isCoaching
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
            )}
          >
            {isCoaching ? (
              <CreditCard className="h-4 w-4" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {isCoaching ? purchase.planName : purchase.programName}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {isCoaching ? "Coaching Subscription" : "Program Purchase"} ·{" "}
              {formatDateTime(purchase.createdAt)}
            </p>
            {isCoaching && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formatDate(purchase.startDate)} →{" "}
                {formatDate(purchase.expiresAt)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={purchase.status} />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatINR(isCoaching ? purchase.totalAmount : purchase.amount)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Provision Sheet Section ──────────────────────────────────────────── */

const linkSchema = z.object({
  sheetId: z
    .string()
    .min(1, "Sheet ID or URL is required")
    .refine(
      (v) => /^[a-zA-Z0-9_\-\/:.?=&]+$/.test(v),
      "Must be a valid Sheets file ID or URL",
    ),
});

type LinkFormData = z.infer<typeof linkSchema>;

interface WorkoutSetVideosSectionProps {
  userId: string;
  enabled: boolean;
}

function WorkoutSetVideosSection({
  userId,
  enabled: initialEnabled,
}: WorkoutSetVideosSectionProps) {
  const [enabled, setEnabled] = useState(initialEnabled);

  const mutation = useMutation({
    mutationFn: (next: boolean) =>
      userService.patchWorkoutSetVideos(userId, next),
    onSuccess: (res) => {
      setEnabled(res.workoutSetVideosEnabled);
      toast.success(
        res.workoutSetVideosEnabled
          ? "Set video uploads enabled for this athlete"
          : "Set video uploads disabled for this athlete",
      );
    },
    onError: () => {
      toast.error("Failed to update set video setting");
    },
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 dark:bg-indigo-900/30">
            <Video className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Workout set videos
            </h3>
            <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
              When enabled, this athlete can attach optional form-check videos
              to each set while logging workouts. Default is on for everyone —
              turn off selectively if not needed.
            </p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {enabled ? "Enabled" : "Disabled"}
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            checked={enabled}
            disabled={mutation.isPending}
            onChange={(e) => mutation.mutate(e.target.checked)}
          />
          {mutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
        </label>
      </div>
    </div>
  );
}

interface ProvisionSheetSectionProps {
  userId: string;
  userEmail: string;
  currentSpreadsheetId?: string | null;
}

function ProvisionSheetSection({
  userId,
  userEmail,
  currentSpreadsheetId,
}: ProvisionSheetSectionProps) {
  const [linkedId, setLinkedId] = useState<string | null>(
    currentSpreadsheetId ?? null,
  );
  const [showGuide, setShowGuide] = useState(false);
  const [linking, setLinking] = useState(false);

  const sheetUrl = linkedId
    ? `https://docs.google.com/spreadsheets/d/${linkedId}/edit`
    : null;

  const {
    register: regLink,
    handleSubmit: handleLink,
    formState: { errors: linkErrors },
    reset: resetLink,
  } = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: { sheetId: "" },
  });

  const linkMutation = useMutation({
    mutationFn: (data: LinkFormData) => {
      const raw = data.sheetId.trim();
      const id = raw.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? raw;
      return userService.patchSpreadsheetId(userId, id);
    },
    onSuccess: (res) => {
      toast.success("Sheet linked!");
      setLinkedId(res.spreadsheetId);
      setLinking(false);
      resetLink();
    },
    onError: () => toast.error("Failed to link sheet."),
  });

  const unlinkMutation = useMutation({
    mutationFn: () => userService.patchSpreadsheetId(userId, null),
    onSuccess: () => {
      toast.success("Sheet unlinked.");
      setLinkedId(null);
    },
    onError: () => toast.error("Failed to unlink sheet."),
  });

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/10">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
            <Sheet className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-green-900 dark:text-green-200">
              Athlete Google Sheet
            </h3>
            <p className="text-xs text-green-700 dark:text-green-400">
              Personal coaching spreadsheet for this athlete.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="shrink-0 rounded-md border border-green-300 bg-white px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:bg-transparent dark:text-green-400"
        >
          {showGuide ? "Hide Guide" : "How it works?"}
        </button>
      </div>

      {/* Coach Guide */}
      {showGuide && (
        <div className="mb-4 rounded-lg border border-green-200 bg-white/80 p-4 dark:border-green-700 dark:bg-green-900/20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-green-800 dark:text-green-300">
            Setup Guide for Coach
          </p>
          <ol className="space-y-2.5 text-xs text-green-800 dark:text-green-300">
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
                1
              </span>
              <span>
                Open the master template sheet →{" "}
                <strong>File → Make a copy</strong> → rename it to athlete's
                name.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
                2
              </span>
              <span>
                Share the copied sheet with the athlete's email{" "}
                <code className="rounded bg-green-100 px-1 dark:bg-green-900">
                  {userEmail}
                </code>{" "}
                as <strong>Viewer</strong> (or Editor if they log weights).
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
                3
              </span>
              <span>
                Share the same sheet with the service account{" "}
                <code className="rounded bg-green-100 px-1 dark:bg-green-900">
                  grindkaroadmin@grindkaro.iam.gserviceaccount.com
                </code>{" "}
                as <strong>Viewer</strong>.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
                4
              </span>
              <span>
                Copy the sheet URL or ID from the browser address bar and paste
                it below.
              </span>
            </li>
          </ol>
          <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-700 dark:bg-green-900/10 dark:text-green-400">
            <strong>After linking:</strong> Athlete opens the app → goes to "My
            Program" → sees their personalised workout. Movement selections on
            the "Athlete dashboard" tab update exercises across all program tabs
            automatically via formulas.
          </div>
        </div>
      )}

      {/* Currently linked */}
      {linkedId && !linking && (
        <div className="mb-3 rounded-lg border border-green-300 bg-white/70 p-3 dark:border-green-700 dark:bg-green-900/20">
          <div className="mb-1.5 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              Sheet linked
            </span>
          </div>
          <code className="mb-2 block break-all font-mono text-xs text-green-700 dark:text-green-400">
            {linkedId}
          </code>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={sheetUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Sheet
            </a>
            <button
              onClick={() => setLinking(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50 dark:border-green-700 dark:bg-transparent dark:text-green-300"
            >
              Change Sheet
            </button>
            <button
              onClick={() => unlinkMutation.mutate()}
              disabled={unlinkMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-transparent dark:text-red-400"
            >
              {unlinkMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Unlink
            </button>
          </div>
        </div>
      )}

      {/* Link form — shown when no sheet OR changing */}
      {(!linkedId || linking) && (
        <form
          onSubmit={handleLink((d) => linkMutation.mutate(d))}
          className="space-y-2"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                id="manual-sheet-id"
                label="Spreadsheet ID or URL"
                placeholder="Paste sheet URL or ID here"
                className="font-mono text-xs"
                error={linkErrors.sheetId?.message}
                {...regLink("sheetId")}
              />
            </div>
            <div className="flex shrink-0 gap-2 pb-0.5">
              <Button
                type="submit"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                isLoading={linkMutation.isPending}
              >
                <Link2 className="h-3.5 w-3.5" />
                Link Sheet
              </Button>
              {linking && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setLinking(false);
                    resetLink();
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-green-700 dark:text-green-400">
            Copy the URL from Google Sheets — we'll extract the ID
            automatically.
          </p>
        </form>
      )}
    </div>
  );
}
