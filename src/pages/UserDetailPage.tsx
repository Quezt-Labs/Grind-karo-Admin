import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CreditCard,
  ShoppingBag,
  Calendar,
  Mail,
  User,
  Sheet,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Link2,
  Video,
  MessageCircle,
  BookOpen,
  RefreshCw,
  Settings2,
  Activity,
  ClipboardList,
  StickyNote,
  BarChart3,
  ImageIcon,
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
import { sheetsService } from "@/services/sheetsService";
import { UserPushPanel } from "@/components/push/UserPushPanel";
import { UserWorkoutLogsPanel } from "@/components/users/UserWorkoutLogsPanel";
import { UserSheetsWorkoutVideosPanel } from "@/components/users/UserSheetsWorkoutVideosPanel";
import { UserSheetsExerciseNotesPanel } from "@/components/users/UserSheetsExerciseNotesPanel";
import { UserWeeklySummariesPanel } from "@/components/users/UserWeeklySummariesPanel";
import { UserProgressPanel } from "@/components/users/UserProgressPanel";
import { cn } from "@/utils/cn";
import type {
  Purchase,
  CoachingSetupStatus,
  FormCheckQuota,
} from "@/types/user";
import { CoachingSetupStatusBadge } from "./users/CoachingSetupStatusBadge";
import { AthleteAssignmentSection } from "@/components/users/AthleteAssignmentSection";
import { DeleteUserButton } from "@/components/users/DeleteUserButton";
import { useIsAdmin } from "@/hooks/useRole";

type MainTab = "setup" | "activity" | "purchases";
type ActivitySection = "videos" | "logs" | "notes" | "summaries" | "progress";

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
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const [mainTab, setMainTab] = useState<MainTab>("activity");
  const [activitySection, setActivitySection] =
    useState<ActivitySection>("videos");
  const [sheetIdOverride, setSheetIdOverride] = useState<
    string | null | undefined
  >(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-user-purchases", id],
    queryFn: () => userService.getPurchases(id!),
    enabled: !!id,
  });

  const hasActiveCoaching =
    data?.purchases.some(
      (p) => p.kind === "coaching_subscription" && p.status === "ACTIVE",
    ) ?? false;

  const {
    data: intakeData,
    isError: intakeMissing,
    isLoading: intakeLoading,
  } = useQuery({
    queryKey: ["admin-user-info", id],
    queryFn: () => userService.getUserInfo(id!),
    enabled: !!id && !!data && hasActiveCoaching,
    retry: false,
  });

  const effectiveSpreadsheetId =
    sheetIdOverride !== undefined
      ? sheetIdOverride
      : (data?.user.spreadsheetId ?? null);

  const coachingSetupStatus = useMemo((): CoachingSetupStatus | null => {
    if (!hasActiveCoaching || !data) return null;
    if (intakeLoading) return null;
    if (intakeMissing || !intakeData) return "needs_intake";
    if (!effectiveSpreadsheetId?.trim()) return "awaiting_sheet";
    return "ready";
  }, [
    hasActiveCoaching,
    data,
    intakeData,
    intakeMissing,
    intakeLoading,
    effectiveSpreadsheetId,
  ]);

  const resolvedMainTab = useMemo((): MainTab => {
    if (
      coachingSetupStatus === "awaiting_sheet" ||
      coachingSetupStatus === "needs_intake"
    ) {
      return "setup";
    }
    return mainTab;
  }, [coachingSetupStatus, mainTab]);

  const stats = useMemo(() => {
    if (!data) return null;
    const coaching = data.purchases.filter(
      (p) => p.kind === "coaching_subscription",
    );
    const programs = data.purchases.filter(
      (p) => p.kind === "program_purchase",
    );
    const books = data.purchases.filter((p) => p.kind === "book_purchase");
    const totalSpent = data.purchases.reduce((sum, p) => {
      if (p.kind === "coaching_subscription") return sum + p.totalAmount;
      if (p.kind === "program_purchase" && p.status === "PAID")
        return sum + p.amount;
      if (p.kind === "book_purchase" && p.status === "PAID")
        return sum + p.amount;
      return sum;
    }, 0);
    return {
      coachingCount: coaching.length,
      programCount: programs.length,
      bookCount: books.length,
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
  const chatEnabled = data.chatEnabled ?? false;

  const isPurchaser =
    purchases.some(
      (p) => p.kind === "program_purchase" && p.status === "PAID",
    ) ||
    purchases.some(
      (p) => p.kind === "coaching_subscription" && p.totalAmount > 0,
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <button
          onClick={() => navigate("/users")}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {user.name || "Unnamed User"}
            </h1>
            {coachingSetupStatus && (
              <CoachingSetupStatusBadge status={coachingSetupStatus} />
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
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
        {chatEnabled && (
          <Link
            to={`/chat?userId=${user.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <MessageCircle className="h-4 w-4" />
            Open chat
          </Link>
        )}
        <DeleteUserButton
          userId={user.id}
          userName={user.name}
          userEmail={user.email}
          role={user.role}
        />
      </div>

      {/* Stats — compact strip */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <StatCard
            icon={<CreditCard className="h-4 w-4" />}
            label="Coaching"
            value={String(stats.coachingCount)}
            compact
          />
          <StatCard
            icon={<ShoppingBag className="h-4 w-4" />}
            label="Programs"
            value={String(stats.programCount)}
            compact
          />
          <StatCard
            icon={<BookOpen className="h-4 w-4" />}
            label="Books"
            value={String(stats.bookCount)}
            compact
          />
          <StatCard
            icon={<CreditCard className="h-4 w-4" />}
            label="Total spent"
            value={formatINR(stats.totalSpent)}
            compact
          />
        </div>
      )}

      {/* Main tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {(
          [
            {
              key: "setup" as const,
              label: "Coaching setup",
              icon: <Settings2 className="h-3.5 w-3.5" />,
            },
            {
              key: "activity" as const,
              label: "Athlete activity",
              icon: <Activity className="h-3.5 w-3.5" />,
            },
            {
              key: "purchases" as const,
              label: "Purchases",
              icon: <ShoppingBag className="h-3.5 w-3.5" />,
              count: purchases.length,
            },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setMainTab(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              resolvedMainTab === t.key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
            )}
          >
            {t.icon}
            {t.label}
            {"count" in t && t.count !== undefined && (
              <span className="rounded-full bg-gray-200/80 px-1.5 py-0.5 text-xs dark:bg-gray-600/50">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {resolvedMainTab === "setup" && (
        <div className="space-y-4">
          <ProvisionSheetSection
            key={`${user.spreadsheetId ?? "none"}-${user.sheetContentRevision ?? 0}`}
            userId={user.id}
            userEmail={user.email}
            currentSpreadsheetId={user.spreadsheetId}
            sheetContentRevision={user.sheetContentRevision ?? 0}
            coachingSetupStatus={coachingSetupStatus}
            onSheetIdChange={setSheetIdOverride}
            onInvalidateUser={() =>
              void queryClient.invalidateQueries({
                queryKey: ["admin-user-purchases", user.id],
              })
            }
          />
          <CoachingEntitlementsSection
            userId={user.id}
            enabled={user.workoutSetVideosEnabled !== false}
            adminFlag={user.workoutSetVideosEnabled}
            formCheckEnabled={data.formCheckEnabled ?? false}
            chatEnabled={chatEnabled}
            formCheckQuota={data.formCheckQuota}
            purchases={purchases}
          />
          {isAdmin && isPurchaser && (
            <AthleteAssignmentSection athleteId={user.id} />
          )}
          <UserPushPanel userId={user.id} />
        </div>
      )}

      {resolvedMainTab === "activity" && (
        <div className="space-y-4">
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
            {(
              [
                {
                  key: "videos" as const,
                  label: "Form-check videos",
                  icon: <Video className="h-3.5 w-3.5" />,
                },
                {
                  key: "logs" as const,
                  label: "Workout logs",
                  icon: <ClipboardList className="h-3.5 w-3.5" />,
                },
                {
                  key: "notes" as const,
                  label: "Exercise notes",
                  icon: <StickyNote className="h-3.5 w-3.5" />,
                },
                {
                  key: "summaries" as const,
                  label: "Weekly summaries",
                  icon: <BarChart3 className="h-3.5 w-3.5" />,
                },
                {
                  key: "progress" as const,
                  label: "Progress photos",
                  icon: <ImageIcon className="h-3.5 w-3.5" />,
                },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActivitySection(s.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  activitySection === s.key
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200",
                )}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            {activitySection === "videos" && (
              <UserSheetsWorkoutVideosPanel
                userId={user.id}
                formCheckQuota={data.formCheckQuota}
              />
            )}
            {activitySection === "logs" && (
              <UserWorkoutLogsPanel userId={user.id} purchases={purchases} />
            )}
            {activitySection === "notes" && (
              <UserSheetsExerciseNotesPanel userId={user.id} />
            )}
            {activitySection === "summaries" && (
              <UserWeeklySummariesPanel userId={user.id} />
            )}
            {activitySection === "progress" && (
              <UserProgressPanel userId={user.id} />
            )}
          </div>
        </div>
      )}

      {resolvedMainTab === "purchases" && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Purchase history
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
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800",
        compact ? "p-3" : "gap-4 p-4",
      )}
    >
      <div
        className={cn(
          "rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400",
          compact ? "p-2" : "p-2.5",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p
          className={cn(
            "font-bold text-gray-900 dark:text-white",
            compact ? "text-base" : "text-lg",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function PurchaseCard({ purchase }: { purchase: Purchase }) {
  const isCoaching = purchase.kind === "coaching_subscription";
  const isBook = purchase.kind === "book_purchase";
  const label = isCoaching
    ? "Coaching Subscription"
    : isBook
      ? "Book Purchase"
      : "Program Purchase";
  const name = isCoaching
    ? purchase.planName
    : isBook
      ? purchase.bookName
      : purchase.programName;

  return (
    <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 rounded-lg p-2",
              isCoaching
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                : isBook
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
            )}
          >
            {isCoaching ? (
              <CreditCard className="h-4 w-4" />
            ) : isBook ? (
              <BookOpen className="h-4 w-4" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{name}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {label} · {formatDateTime(purchase.createdAt)}
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
      (v) => /^[a-zA-Z0-9_\-/:.?=&]+$/.test(v),
      "Must be a valid Sheets file ID or URL",
    ),
});

type LinkFormData = z.infer<typeof linkSchema>;

interface CoachingEntitlementsSectionProps {
  userId: string;
  enabled: boolean;
  adminFlag?: boolean;
  formCheckEnabled: boolean;
  chatEnabled: boolean;
  formCheckQuota?: FormCheckQuota;
  purchases: Purchase[];
}

function activeCoachingPlans(purchases: Purchase[]) {
  return purchases.filter(
    (p): p is Extract<Purchase, { kind: "coaching_subscription" }> =>
      p.kind === "coaching_subscription" && p.status === "ACTIVE",
  );
}

function FormCheckQuotaSummary({ quota }: { quota: FormCheckQuota }) {
  if (quota.weeklyLimit == null) {
    return (
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Form checks: unlimited ({quota.usedThisWeek} program weeks reviewed this
        block).
      </p>
    );
  }

  const remaining = quota.remainingThisWeek ?? 0;
  const weekGate =
    quota.formCheckWeekAllowed === false
      ? ` · Not a form-check week (sub week ${quota.subscriptionWeek ?? "?"})`
      : quota.formCheckWeekAllowed === true
        ? ` · Form-check week (sub week ${quota.subscriptionWeek})`
        : "";

  return (
    <p
      className={`mt-2 text-xs ${remaining <= 0 ? "text-amber-700 dark:text-amber-300" : "text-gray-500 dark:text-gray-400"}`}
    >
      Form checks ({quota.weekStart}): {quota.usedThisWeek}/{quota.weeklyLimit}{" "}
      program weeks used
      {remaining > 0 ? ` · ${remaining} remaining` : " · limit reached"}
      {weekGate} ({quota.planName ?? quota.planSlug}).
      {quota.programWeeksReviewed && quota.programWeeksReviewed.length > 0 && (
        <> Reviewed sheet weeks: W{quota.programWeeksReviewed.join(", W")}.</>
      )}
    </p>
  );
}

function CoachingEntitlementsSection({
  userId,
  enabled: initialEnabled,
  adminFlag,
  formCheckEnabled,
  chatEnabled,
  formCheckQuota,
  purchases,
}: CoachingEntitlementsSectionProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const activePlans = activeCoachingPlans(purchases);
  const hasActiveCoaching = activePlans.length > 0;
  const miniOnly =
    hasActiveCoaching &&
    activePlans.every((p) => p.planSlug.toLowerCase() === "mini");

  const computedFormCheckSource = formCheckEnabled
    ? miniOnly && adminFlag === true
      ? "Admin override (MINI plan excludes form check by default)"
      : hasActiveCoaching && !miniOnly
        ? "Active MEGA/ULTRA coaching"
        : adminFlag === true
          ? "Admin override or Form Check add-on"
          : "Form Check add-on"
    : miniOnly
      ? "MINI plan — not included (use admin toggle to grant)"
      : adminFlag === false
        ? "Disabled — admin override"
        : "Requires MEGA/ULTRA coaching or Form Check add-on";

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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-50 p-2 dark:bg-indigo-900/30">
              <Video className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Coaching entitlements
            </h3>
          </div>
          {hasActiveCoaching && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {activePlans
                .map((p) => `${p.planName} (${p.planSlug})`)
                .join(" · ")}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                formCheckEnabled
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
              )}
            >
              <Video className="h-3 w-3" />
              Form check {formCheckEnabled ? "on" : "off"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                chatEnabled
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
              )}
            >
              <MessageCircle className="h-3 w-3" />
              Chat {chatEnabled ? "on" : "off"}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {computedFormCheckSource}
          </p>
          {formCheckQuota && formCheckQuota.weeklyLimit != null && (
            <FormCheckQuotaSummary quota={formCheckQuota} />
          )}
        </div>
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-900/40">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Set videos
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
  sheetContentRevision?: number;
  coachingSetupStatus?: CoachingSetupStatus | null;
  onSheetIdChange?: (spreadsheetId: string | null) => void;
  onInvalidateUser?: () => void;
}

function ProvisionSheetSection({
  userId,
  userEmail,
  currentSpreadsheetId,
  sheetContentRevision = 0,
  coachingSetupStatus,
  onSheetIdChange,
  onInvalidateUser,
}: ProvisionSheetSectionProps) {
  const [linkedId, setLinkedId] = useState<string | null>(
    currentSpreadsheetId ?? null,
  );
  const [revision, setRevision] = useState(sheetContentRevision);
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
      onSheetIdChange?.(res.spreadsheetId);
      onInvalidateUser?.();
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
      onSheetIdChange?.(null);
      onInvalidateUser?.();
    },
    onError: () => toast.error("Failed to unlink sheet."),
  });

  const notifySheetMutation = useMutation({
    mutationFn: () => sheetsService.notifySheetUpdated(userId),
    onSuccess: (res) => {
      setRevision(res.sheetContentRevision);
      toast.success(
        `Athlete notified to refresh sheet (revision ${res.sheetContentRevision}).`,
      );
    },
    onError: () =>
      toast.error("Failed to notify athlete. Check sheet is linked."),
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
            {coachingSetupStatus && (
              <div className="mt-1.5">
                <CoachingSetupStatusBadge status={coachingSetupStatus} />
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="shrink-0 rounded-md border border-green-300 bg-white px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:bg-transparent dark:text-green-400"
        >
          {showGuide ? "Hide Guide" : "How it works?"}
        </button>
      </div>

      {coachingSetupStatus === "awaiting_sheet" && !linkedId && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          <strong>Action needed:</strong> Intake is complete — paste the
          athlete&apos;s Google Sheet ID below to unlock their program in the
          app.
        </div>
      )}

      {coachingSetupStatus === "needs_intake" && (
        <div className="mb-3 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2.5 text-xs text-orange-900 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-200">
          Athlete hasn&apos;t submitted the coaching intake form yet. You can
          still prepare their sheet in advance.
        </div>
      )}

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
          <p className="mb-2 text-xs text-green-700 dark:text-green-400">
            Sheet revision: {revision} — bump via Notify refresh after coach
            edits the workbook.
          </p>
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
              type="button"
              onClick={() => notifySheetMutation.mutate()}
              disabled={notifySheetMutation.isPending}
              title="Use after editing the Google Sheet so the athlete's app reloads layout"
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50 disabled:opacity-50 dark:border-green-700 dark:bg-transparent dark:text-green-300"
            >
              {notifySheetMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Notify refresh
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
