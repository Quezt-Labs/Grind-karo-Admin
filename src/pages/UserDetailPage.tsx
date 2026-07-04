import { useMemo, useState, useCallback, useEffect } from "react";
import {
  useParams,
  useNavigate,
  Link,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CreditCard,
  ShoppingBag,
  Calendar,
  Mail,
  User,
  Loader2,
  Video,
  MessageCircle,
  BookOpen,
  Settings2,
  Activity,
  MapPin,
  Pencil,
} from "lucide-react";
import { formatAthleteLocation } from "@/lib/indianStates";
import toast from "react-hot-toast";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { userService } from "@/services/userService";
import { UserPushPanel } from "@/components/push/UserPushPanel";
import { UserWorkoutLogsPanel } from "@/components/users/UserWorkoutLogsPanel";
import { UserSheetsWorkoutVideosPanel } from "@/components/users/UserSheetsWorkoutVideosPanel";
import { UserAthleteProgramPanel } from "@/components/users/UserAthleteProgramPanel";
import { UserActiveCoachingPlansPanel } from "@/components/users/UserActiveCoachingPlansPanel";
import { UserRetailProgramPanel } from "@/components/users/UserRetailProgramPanel";
import { UserSheetsExerciseNotesPanel } from "@/components/users/UserSheetsExerciseNotesPanel";
import { UserWeeklySummariesPanel } from "@/components/users/UserWeeklySummariesPanel";
import { UserCheckInsPanel } from "@/components/users/UserCheckInsPanel";
import { UserAthleteActivityQueue } from "@/components/users/UserAthleteActivityQueue";
import {
  buildAthleteActivityTabs,
  defaultAthleteActivitySection,
  type AthleteActivitySection,
} from "@/components/users/athleteActivitySections";
import { cn } from "@/utils/cn";
import { planGrantsFormCheck } from "@/utils/coachingPlanCapabilities";
import type { Purchase, FormCheckQuota } from "@/types/user";
import { CoachingSetupStatusBadge } from "./users/CoachingSetupStatusBadge";
import { AthleteAssignmentSection } from "@/components/users/AthleteAssignmentSection";
import { CoachingIntakePanel } from "@/components/users/CoachingIntakePanel";
import { CoachingPaymentCalendar } from "@/components/users/CoachingPaymentCalendar";
import { CoachingFeeAdjustmentsPanel } from "@/components/users/CoachingFeeAdjustmentsPanel";
import { ProgramGrantPanel } from "@/components/users/ProgramGrantPanel";
import { PurchaseDatesEditor } from "@/components/users/PurchaseDatesEditor";
import { DeleteUserButton } from "@/components/users/DeleteUserButton";
import { useIsAdmin, useIsStaff } from "@/hooks/useRole";
import { useUserDetail, type UserDetailTab } from "@/hooks/useUserDetail";
import { useUserActivityScope } from "@/hooks/useUserActivityScope";

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

function parseTab(value: string | null): UserDetailTab {
  if (value === "coaching" || value === "setup") return "coaching";
  if (value === "purchases") return "purchases";
  if (value === "activity") return "activity";
  return "activity";
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const isStaff = useIsStaff();

  const mainTab = parseTab(searchParams.get("tab"));
  const setMainTab = useCallback(
    (tab: UserDetailTab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === "activity") next.delete("tab");
          else next.set("tab", tab);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const selectCoachingSubscription = (subscriptionId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("subscriptionId", subscriptionId);
        return next;
      },
      { replace: true },
    );
  };

  const [activitySection, setActivitySection] =
    useState<AthleteActivitySection>("videos");
  const [videoWeekFilter, setVideoWeekFilter] = useState<number | "all">("all");
  const [videoReviewFilter, setVideoReviewFilter] = useState<
    "all" | "unreviewed"
  >("all");

  const subscriptionIdParam = searchParams.get("subscriptionId") ?? undefined;

  const {
    user,
    purchases,
    purchasesData,
    purchasesLoading,
    purchasesError,
    intakeData,
    intakeLoading,
    intakeMissing,
    coachingProgramData,
    coachingProgramLoading,
    hasActiveCoaching,
    hasPersonalCoaching,
    hasPaidPrograms,
    primaryCoachingSub,
    coachingSetupStatus,
    showCoachingActivity,
    pendingVideoCount,
    purchaseStats,
  } = useUserDetail(id, subscriptionIdParam);

  const { scope, clearScope } = useUserActivityScope(purchases);

  useEffect(() => {
    if (
      subscriptionIdParam &&
      scope.mode === "all" &&
      !purchasesLoading &&
      purchases.length > 0
    ) {
      toast.error("Subscription not found — showing all activity");
      clearScope();
    }
  }, [
    subscriptionIdParam,
    scope.mode,
    purchasesLoading,
    purchases.length,
    clearScope,
  ]);

  const displayCoachingSub =
    scope.mode === "subscription" ? scope.subscription : primaryCoachingSub;

  const activityTabs = useMemo(
    () =>
      buildAthleteActivityTabs({
        purchases,
        pendingVideoCount,
      }),
    [purchases, pendingVideoCount],
  );

  const resolvedActivitySection = useMemo((): AthleteActivitySection => {
    if (activityTabs.length === 0) return activitySection;
    if (activityTabs.some((tab) => tab.key === activitySection)) {
      return activitySection;
    }
    return defaultAthleteActivitySection(activityTabs);
  }, [activityTabs, activitySection]);

  const activeActivityTab = activityTabs.find(
    (tab) => tab.key === resolvedActivitySection,
  );

  const showCoachingTab = hasActiveCoaching;

  const coachingTabNeedsAttention =
    coachingSetupStatus === "needs_intake" ||
    coachingSetupStatus === "awaiting_program";

  const activeTab =
    mainTab === "coaching" && !showCoachingTab ? "activity" : mainTab;

  if (purchasesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (purchasesError || !purchasesData || !user) {
    return <ErrorAlert message="Failed to load user details." />;
  }

  const chatEnabled = purchasesData.chatEnabled ?? false;
  const formCheckEnabled = purchasesData.formCheckEnabled ?? false;
  const formCheckQuota = purchasesData.formCheckQuota;

  const isPurchaser =
    purchases.some(
      (p) => p.kind === "program_purchase" && p.status === "PAID",
    ) ||
    purchases.some(
      (p) => p.kind === "coaching_subscription" && p.totalAmount > 0,
    );

  const defaultFormCheckForAssignment = purchases.some(
    (p) =>
      p.kind === "coaching_subscription" &&
      p.status === "ACTIVE" &&
      planGrantsFormCheck(p.planSlug),
  );

  const mainTabs: {
    key: UserDetailTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    hidden?: boolean;
  }[] = [
    {
      key: "activity",
      label: "Activity",
      icon: <Activity className="h-3.5 w-3.5" />,
      badge: pendingVideoCount > 0 ? pendingVideoCount : undefined,
    },
    {
      key: "coaching",
      label: "Coaching",
      icon: <Settings2 className="h-3.5 w-3.5" />,
      badge: coachingTabNeedsAttention ? "!" : undefined,
      hidden: !showCoachingTab,
    },
    {
      key: "purchases",
      label: "Purchases",
      icon: <ShoppingBag className="h-3.5 w-3.5" />,
      badge: purchases.length || undefined,
    },
  ];

  const invalidatePurchases = () =>
    void queryClient.invalidateQueries({
      queryKey: ["admin-user-purchases", user.id],
    });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <button
          type="button"
          onClick={() =>
            navigate(
              scope.mode === "subscription"
                ? `/plans/${scope.subscription.planId}`
                : "/users",
            )
          }
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
            {displayCoachingSub && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                {displayCoachingSub.planName}
              </span>
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
            {intakeData && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {formatAthleteLocation(intakeData.city, intakeData.state)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {coachingSetupStatus === "ready" && hasPersonalCoaching && (
            <Button
              size="sm"
              onClick={() =>
                navigate(
                  `/coaching/${user.id}/editor${
                    subscriptionIdParam
                      ? `?subscriptionId=${subscriptionIdParam}`
                      : ""
                  }`,
                )
              }
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Program editor
            </Button>
          )}
          {coachingTabNeedsAttention && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setMainTab("coaching")}
            >
              Complete setup
            </Button>
          )}
          {chatEnabled && (
            <Link
              to={`/chat?userId=${user.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </Link>
          )}
          <DeleteUserButton
            userId={user.id}
            userName={user.name}
            userEmail={user.email}
            role={user.role}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {mainTabs
          .filter((t) => !t.hidden)
          .map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMainTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeTab === t.key
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              {t.icon}
              {t.label}
              {t.badge != null && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                    t.badge === "!"
                      ? "bg-amber-500 text-white"
                      : "bg-gray-200/80 dark:bg-gray-600/50",
                  )}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
      </div>

      {activeTab === "coaching" && showCoachingTab && (
        <div className="space-y-4">
          <UserActiveCoachingPlansPanel
            userId={user.id}
            purchases={purchases}
            primarySubscriptionId={user.primaryCoachingSubscriptionId}
            onUpdated={invalidatePurchases}
            onSelectSubscription={selectCoachingSubscription}
          />

          {hasActiveCoaching && (
            <CoachingIntakePanel
              userId={user.id}
              intake={intakeData}
              isLoading={intakeLoading}
              isMissing={intakeMissing}
            />
          )}

          {hasPersonalCoaching && (
            <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <UserAthleteProgramPanel
                userId={user.id}
                userName={user.name ?? user.email}
                purchases={purchases}
                primarySubscriptionId={user.primaryCoachingSubscriptionId}
                coachingData={coachingProgramData}
                coachingLoading={coachingProgramLoading}
              />
            </section>
          )}

          <CoachingEntitlementsSection
            userId={user.id}
            enabled={user.workoutSetVideosEnabled ?? true}
            adminFlag={user.workoutSetVideosEnabled}
            formCheckEnabled={formCheckEnabled}
            chatEnabled={chatEnabled}
            formCheckQuota={formCheckQuota}
            purchases={purchases}
          />

          <CoachingPaymentCalendar
            purchases={purchases}
            userId={user.id}
            showDateEditor={isStaff}
            onUpdated={invalidatePurchases}
          />
          <CoachingFeeAdjustmentsPanel
            userId={user.id}
            purchases={purchases}
            onUpdated={invalidatePurchases}
          />
          <ProgramGrantPanel
            userId={user.id}
            purchases={purchases}
            onUpdated={invalidatePurchases}
          />
          {isAdmin && isPurchaser && (
            <AthleteAssignmentSection
              athleteId={user.id}
              defaultFormCheckEnabled={defaultFormCheckForAssignment}
            />
          )}
          <UserPushPanel userId={user.id} />
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-4">
          {scope.mode === "subscription" && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800/60 dark:bg-indigo-900/20">
              <p className="text-sm text-indigo-900 dark:text-indigo-100">
                Viewing activity for{" "}
                <span className="font-semibold">
                  {scope.subscription.planName}
                </span>{" "}
                · {formatDate(scope.subscription.startDate)} –{" "}
                {formatDate(scope.subscription.expiresAt)}
              </p>
              <button
                type="button"
                onClick={clearScope}
                className="text-xs font-semibold text-indigo-700 underline hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-100"
              >
                View all activity
              </button>
            </div>
          )}

          {showCoachingActivity ? (
            <UserAthleteActivityQueue
              pendingVideoCount={pendingVideoCount}
              formCheckQuota={formCheckQuota}
              onReviewClick={() => {
                setActivitySection("videos");
                setVideoReviewFilter("unreviewed");
              }}
            />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No coaching activity for this user yet.
            </p>
          )}

          {activityTabs.length > 0 && (
            <>
              <div className="flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
                {activityTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActivitySection(tab.key)}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        resolvedActivitySection === tab.key
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {tab.badge != null ? (
                        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {tab.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {activeActivityTab ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activeActivityTab.description}
                </p>
              ) : null}

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
                {resolvedActivitySection === "sheet" && (
                  <p className="text-sm text-gray-500">
                    Edit program structure in the{" "}
                    <button
                      type="button"
                      className="font-medium text-primary-600 hover:underline"
                      onClick={() => setMainTab("coaching")}
                    >
                      Coaching
                    </button>{" "}
                    tab → Athlete program.
                  </p>
                )}
                {resolvedActivitySection === "videos" && (
                  <UserSheetsWorkoutVideosPanel
                    userId={user.id}
                    formCheckQuota={formCheckQuota}
                    activityScope={scope}
                    weekFilter={videoWeekFilter}
                    onWeekFilterChange={setVideoWeekFilter}
                    reviewFilter={videoReviewFilter}
                    onReviewFilterChange={setVideoReviewFilter}
                  />
                )}
                {resolvedActivitySection === "logs" && (
                  <UserWorkoutLogsPanel
                    userId={user.id}
                    purchases={purchases}
                    activityScope={scope}
                  />
                )}
                {resolvedActivitySection === "notes" && (
                  <UserSheetsExerciseNotesPanel
                    userId={user.id}
                    activityScope={scope}
                    onOpenVideos={({ weekNumber, reviewFilter }) => {
                      setVideoWeekFilter(weekNumber);
                      setVideoReviewFilter(reviewFilter);
                      setActivitySection("videos");
                    }}
                  />
                )}
                {resolvedActivitySection === "summaries" && (
                  <UserWeeklySummariesPanel
                    userId={user.id}
                    activityScope={scope}
                  />
                )}
                {resolvedActivitySection === "checkins" && (
                  <UserCheckInsPanel userId={user.id} activityScope={scope} />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "purchases" && (
        <div className="space-y-4">
          {purchaseStats && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCard
                icon={<CreditCard className="h-4 w-4" />}
                label="Coaching"
                value={String(purchaseStats.coachingCount)}
                compact
              />
              <StatCard
                icon={<ShoppingBag className="h-4 w-4" />}
                label="Programs"
                value={String(purchaseStats.programCount)}
                compact
              />
              <StatCard
                icon={<BookOpen className="h-4 w-4" />}
                label="Books"
                value={String(purchaseStats.bookCount)}
                compact
              />
              <StatCard
                icon={<CreditCard className="h-4 w-4" />}
                label="Total spent"
                value={formatINR(purchaseStats.totalSpent)}
                compact
              />
            </div>
          )}

          {hasPaidPrograms && <UserRetailProgramPanel purchases={purchases} />}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
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
                  <PurchaseCard
                    key={purchase.id}
                    purchase={purchase}
                    userId={user.id}
                    showDateEditor={isStaff}
                    onUpdated={invalidatePurchases}
                  />
                ))}
              </div>
            )}
          </div>
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

function PurchaseCard({
  purchase,
  userId,
  showDateEditor = false,
  onUpdated,
}: {
  purchase: Purchase;
  userId?: string;
  showDateEditor?: boolean;
  onUpdated?: () => void;
}) {
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
            {!isCoaching &&
              purchase.kind === "program_purchase" &&
              purchase.paidAt && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Started {formatDate(purchase.paidAt)}
                </p>
              )}
            {showDateEditor && userId && (
              <PurchaseDatesEditor
                userId={userId}
                purchase={purchase}
                onUpdated={onUpdated}
              />
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
