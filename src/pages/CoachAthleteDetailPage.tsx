import { useCallback, useMemo } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft,
  ClipboardList,
  CreditCard,
  Dumbbell,
  MapPin,
  MessageCircle,
  Video,
} from "lucide-react";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { athleteAssignmentService } from "@/services/athleteAssignmentService";
import { UserProgramFormCheckPanel } from "@/components/users/UserProgramFormCheckPanel";
import { UserWorkoutLogsPanel } from "@/components/users/UserWorkoutLogsPanel";
import { UserAthleteProgramPanel } from "@/components/users/UserAthleteProgramPanel";
import { CoachingFeeAdjustmentsPanel } from "@/components/users/CoachingFeeAdjustmentsPanel";
import { cn } from "@/utils/cn";
import { formatAthleteLocation } from "@/lib/indianStates";
import { planService } from "@/services/planService";
import { AddonEntitlementsPanel } from "@/components/users/AddonEntitlementsPanel";

type CoachActivityTab = "plan" | "program" | "videos" | "logs" | "chat";

const COACH_TABS: CoachActivityTab[] = [
  "plan",
  "program",
  "videos",
  "logs",
  "chat",
];

function parseCoachTab(value: string | null): CoachActivityTab | null {
  if (COACH_TABS.includes(value as CoachActivityTab)) {
    return value as CoachActivityTab;
  }
  return null;
}

export function CoachAthleteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const tabParam = parseCoachTab(searchParams.get("tab"));
  const logIdParam = searchParams.get("logId");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["coach-athlete-summary", id],
    queryFn: () => athleteAssignmentService.getCoachAthleteSummary(id!),
    enabled: !!id,
  });

  const assignment = data?.assignment;
  const athlete = data?.athlete;
  const isAssigned =
    !!assignment &&
    (assignment.personalCoachingEnabled || assignment.formCheckEnabled);

  const defaultTab = useMemo((): CoachActivityTab => {
    if (isAssigned) return "plan";
    return "chat";
  }, [isAssigned]);

  const { data: purchaseData } = useQuery({
    queryKey: ["coach-athlete-purchases", id],
    queryFn: () => athleteAssignmentService.getCoachAthletePurchases(id!),
    enabled: !!id && isAssigned,
  });
  const { data: planCatalog = [] } = useQuery({
    queryKey: ["coaching-plans"],
    queryFn: () => planService.getAll(),
    enabled: !!id && isAssigned,
  });

  const tabs = useMemo(() => {
    const items: {
      key: CoachActivityTab;
      label: string;
      icon: React.ReactNode;
    }[] = [];
    if (isAssigned) {
      items.push({
        key: "plan",
        label: "Coaching plan",
        icon: <CreditCard className="h-3.5 w-3.5" />,
      });
    }
    if (assignment?.formCheckEnabled) {
      items.push({
        key: "videos",
        label: "Form-check videos",
        icon: <Video className="h-3.5 w-3.5" />,
      });
    }
    if (assignment?.personalCoachingEnabled) {
      items.push({
        key: "program",
        label: "Program",
        icon: <Dumbbell className="h-3.5 w-3.5" />,
      });
      items.push({
        key: "logs",
        label: "Workout logs",
        icon: <ClipboardList className="h-3.5 w-3.5" />,
      });
    }
    if (isAssigned) {
      items.push({
        key: "chat",
        label: "Chat",
        icon: <MessageCircle className="h-3.5 w-3.5" />,
      });
    }
    return items;
  }, [assignment, isAssigned]);

  const tab = useMemo((): CoachActivityTab => {
    if (tabParam && tabs.some((t) => t.key === tabParam)) return tabParam;
    return defaultTab;
  }, [tabParam, tabs, defaultTab]);

  const setTab = useCallback(
    (next: CoachActivityTab) => {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          if (next === defaultTab) nextParams.delete("tab");
          else nextParams.set("tab", next);
          if (next !== "logs") nextParams.delete("logId");
          return nextParams;
        },
        { replace: true },
      );
    },
    [defaultTab, setSearchParams],
  );

  const refreshPurchases = () => {
    void queryClient.invalidateQueries({
      queryKey: ["coach-athlete-purchases", id],
    });
  };

  const denyMessage =
    axios.isAxiosError(error) &&
    (error.response?.status === 403 || error.response?.status === 404)
      ? "This athlete is not assigned to you right now. Ask an admin to update assignments if you need access."
      : "Failed to load athlete details.";

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (isError || !athlete) {
    return <ErrorAlert message={denyMessage} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-4">
        <button
          type="button"
          onClick={() => navigate("/coach/athletes")}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {athlete.name || "Unnamed athlete"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {athlete.email}
          </p>
          {(athlete.city || athlete.state) && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {formatAthleteLocation(athlete.city, athlete.state)}
            </p>
          )}
          {assignment && (
            <div className="mt-2 flex flex-wrap gap-2">
              {assignment.personalCoachingEnabled && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                  Personal coaching
                </span>
              )}
              {assignment.formCheckEnabled && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Form check & chat
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {tabs.length > 0 && (
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === "plan" && isAssigned && id && (
        <div className="space-y-4">
          <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                  purchaseData?.formCheckEnabled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
                )}
              >
                Form check {purchaseData?.formCheckEnabled ? "on" : "off"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                  purchaseData?.chatEnabled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
                )}
              >
                Chat {purchaseData?.chatEnabled ? "on" : "off"}
              </span>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Add-ons
            </p>
            <AddonEntitlementsPanel
              purchases={purchaseData?.purchases ?? []}
              planCatalog={planCatalog}
              compact
            />
          </section>
          <CoachingFeeAdjustmentsPanel
            userId={id}
            purchases={purchaseData?.purchases ?? []}
            onUpdated={refreshPurchases}
          />
        </div>
      )}

      {tab === "program" && assignment?.personalCoachingEnabled && id && (
        <UserAthleteProgramPanel
          userId={id}
          userName={athlete.name || athlete.email}
          purchases={purchaseData?.purchases ?? []}
        />
      )}

      {tab === "videos" && assignment?.formCheckEnabled && id && (
        <UserProgramFormCheckPanel
          userId={id}
          formCheckQuota={purchaseData?.formCheckQuota}
          purchases={purchaseData?.purchases ?? []}
          showBilling
          onBillingUpdated={refreshPurchases}
          preferPending
        />
      )}

      {tab === "logs" && assignment?.personalCoachingEnabled && id && (
        <UserWorkoutLogsPanel
          userId={id}
          coachMode
          purchases={purchaseData?.purchases ?? []}
          initialExpandedLogId={logIdParam}
        />
      )}

      {tab === "chat" && isAssigned && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Open the chat thread with this athlete in the coach inbox.
          </p>
          <Link
            to={`/chat?userId=${athlete.id}`}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Open chat
          </Link>
        </div>
      )}
    </div>
  );
}
